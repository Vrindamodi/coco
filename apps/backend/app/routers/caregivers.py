from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import User
from app.schemas.auth import UserResponse
from app.schemas.caregiver import CaregiverUpdate

router = APIRouter(prefix="/caregivers", tags=["caregivers"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        region=user.region,
        role=user.role.value,
    )


@router.get("/me", response_model=UserResponse)
def get_current_caregiver(
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER, AuthRole.ADMIN)),
    db: Session = Depends(get_db),
):
    user = db.get(User, auth.user_id)
    return _user_response(user)


@router.patch("/me", response_model=UserResponse)
def update_current_caregiver(
    payload: CaregiverUpdate,
    auth: AuthContext = Depends(require_roles(AuthRole.CAREGIVER)),
    db: Session = Depends(get_db),
):
    user = db.get(User, auth.user_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return _user_response(user)
