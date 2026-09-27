import hashlib
import re
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.core.deps import get_patient_for_auth, require_roles
from app.database import get_db
from app.schemas.media import UploadSignatureRequest, UploadSignatureResponse

router = APIRouter(prefix="/media", tags=["media"])

_SLUG_RE = re.compile(r"[^a-zA-Z0-9_-]+")


def _sign(params: dict[str, str], api_secret: str) -> str:
    """Cloudinary signed upload: sha1 of the sorted params plus the secret."""
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hashlib.sha1(f"{to_sign}{api_secret}".encode()).hexdigest()


def _public_id(patient_id, filename: str | None) -> str:
    stem = ""
    if filename:
        stem = _SLUG_RE.sub("-", filename.rsplit(".", 1)[0]).strip("-")[:40]
    suffix = uuid.uuid4().hex[:12]
    return f"{patient_id}/{stem}-{suffix}" if stem else f"{patient_id}/{suffix}"


@router.post("/upload-signature", response_model=UploadSignatureResponse)
def create_upload_signature(
    payload: UploadSignatureRequest,
    auth=Depends(require_roles("caregiver")),
    db: Session = Depends(get_db),
):
    if not settings.cloudinary_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Media uploads are not configured. Set CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or paste a "
                "media URL directly."
            ),
        )

    patient = get_patient_for_auth(payload.patient_id, auth, db)

    folder = settings.CLOUDINARY_UPLOAD_FOLDER
    public_id = _public_id(patient.id, payload.filename)
    timestamp = int(time.time())

    signature = _sign(
        {
            "folder": folder,
            "public_id": public_id,
            "timestamp": str(timestamp),
        },
        settings.CLOUDINARY_API_SECRET,
    )

    return UploadSignatureResponse(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        timestamp=timestamp,
        signature=signature,
        folder=folder,
        public_id=public_id,
        resource_type=payload.resource_type,
        upload_url=(
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}"
            f"/{payload.resource_type}/upload"
        ),
    )
