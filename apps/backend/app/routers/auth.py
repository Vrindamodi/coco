from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, get_current_auth, require_roles
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import AuthRole
from app.database import get_db
from app.models import Patient, User
from app.models.enums import UserRole
from app.schemas.auth import (
    AuthMeResponse,
    LoginRequest,
    PatientAuthResponse,
    PatientLoginRequest,
    RegisterRequest,
    Token,
    UserResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        region=user.region,
        role=user.role.value,
    )


def _patient_auth_response(patient: Patient) -> PatientAuthResponse:
    return PatientAuthResponse(
        id=str(patient.id),
        full_name=patient.full_name,
        preferred_language=patient.preferred_language,
        region=patient.region,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=UserRole.CAREGIVER,
        full_name=payload.full_name,
        phone=payload.phone,
        region=payload.region,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    role = AuthRole.ADMIN if user.role == UserRole.ADMIN else AuthRole.CAREGIVER
    token = create_access_token(str(user.id), role)
    return Token(access_token=token)


@router.post("/patient-login", response_model=Token)
def patient_login(payload: PatientLoginRequest, db: Session = Depends(get_db)):
    has_id = bool(payload.patient_id and payload.patient_id.strip())
    has_name = bool(payload.full_name and payload.full_name.strip())

    if has_id == has_name:
        raise HTTPException(
            status_code=400,
            detail="Provide exactly one of patient_id or full_name",
        )

    if has_id:
        try:
            patient_id = UUID(payload.patient_id)  # type: ignore[arg-type]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid patient ID")
        patient = db.get(Patient, patient_id)
    else:
        normalized_name = payload.full_name.strip()  # type: ignore[union-attr]
        patient = (
            db.query(Patient)
            .filter(func.lower(Patient.full_name) == normalized_name.lower())
            .first()
        )

    if patient is None or patient.pin_hash is None:
        raise HTTPException(status_code=401, detail="Invalid patient or PIN")

    if not verify_password(payload.pin, patient.pin_hash):
        raise HTTPException(status_code=401, detail="Invalid patient or PIN")

    token = create_access_token(str(patient.id), AuthRole.PATIENT)
    return Token(access_token=token)


@router.get("/me", response_model=AuthMeResponse)
def auth_me(
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    if auth.role == AuthRole.PATIENT:
        patient = db.get(Patient, auth.patient_id)
        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")
        return AuthMeResponse(
            role=auth.role.value,
            patient=_patient_auth_response(patient),
        )

    user = db.get(User, auth.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return AuthMeResponse(role=auth.role.value, user=_user_response(user))
