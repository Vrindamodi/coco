from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class UploadSignatureRequest(BaseModel):
    patient_id: UUID
    resource_type: Literal["image", "video", "raw"] = "image"
    filename: str | None = None


class UploadSignatureResponse(BaseModel):
    """Everything the browser needs to POST straight to Cloudinary.

    The file never passes through this API — a 200 MB video would otherwise
    tie up a worker for its whole upload.
    """

    cloud_name: str
    api_key: str
    timestamp: int
    signature: str
    folder: str
    public_id: str
    resource_type: str
    upload_url: str
