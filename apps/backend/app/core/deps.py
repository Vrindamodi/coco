from dataclasses import dataclass
from typing import Callable, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import safe_decode_token
from app.database import get_db
from app.models import Patient, User
from app.models.enums import AuthRole, UserRole

security = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    role: AuthRole
    user_id: Optional[UUID] = None
    patient_id: Optional[UUID] = None

    @property
    def subject_id(self) -> UUID:
        if self.role == AuthRole.PATIENT:
            assert self.patient_id is not None
            return self.patient_id
        assert self.user_id is not None
        return self.user_id


def get_current_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> AuthContext:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = safe_decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    role_str = payload.get("role")
    sub = payload.get("sub")
    if not role_str or not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        role = AuthRole(role_str)
        subject_id = UUID(str(sub))
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )

    if role == AuthRole.PATIENT:
        patient = db.get(Patient, subject_id)
        if patient is None:
            raise HTTPException(status_code=404, detail="Patient not found")
        return AuthContext(role=role, patient_id=subject_id)

    user = db.get(User, subject_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if role == AuthRole.ADMIN and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    if role == AuthRole.CAREGIVER and user.role not in (UserRole.CAREGIVER, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Caregiver access required")

    return AuthContext(role=role, user_id=subject_id)


def require_roles(*roles: AuthRole) -> Callable[..., AuthContext]:
    def dependency(auth: AuthContext = Depends(get_current_auth)) -> AuthContext:
        if auth.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return auth

    return dependency


def get_patient_for_auth(
    patient_id: UUID,
    auth: AuthContext,
    db: Session,
) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    if auth.role == AuthRole.PATIENT:
        if auth.patient_id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return patient

    if auth.role == AuthRole.CAREGIVER:
        if patient.caregiver_id != auth.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        return patient

    raise HTTPException(status_code=403, detail="Access denied")
