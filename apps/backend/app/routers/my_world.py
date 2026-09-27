from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, nullslast
from sqlalchemy.orm import Session

from app.core.deps import get_patient_for_auth, require_roles
from app.database import get_db
from app.models.enums import MediaType, MyWorldCategory
from app.models.my_world_item import MyWorldItem
from app.schemas.my_world import (
    MyWorldInteractionReport,
    MyWorldItemCreate,
    MyWorldItemResponse,
    MyWorldItemUpdate,
    MyWorldReaction,
)
from app.services.my_world import apply_reaction, record_recognition

router = APIRouter(
    prefix="/my-world",
    tags=["My World"],
)


def _get_item(db: Session, patient_id: UUID, item_id: UUID) -> MyWorldItem:
    item = (
        db.query(MyWorldItem)
        .filter(
            MyWorldItem.id == item_id,
            MyWorldItem.patient_id == patient_id,
        )
        .first()
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="My World item not found",
        )

    return item


@router.get(
    "/{patient_id}",
    response_model=list[MyWorldItemResponse],
)
def get_my_world(
    patient_id: UUID,
    category: MyWorldCategory | None = Query(default=None),
    media_type: MediaType | None = Query(default=None),
    since: datetime | None = Query(
        default=None,
        description="Only return items changed after this timestamp (delta sync).",
    ),
    auth=Depends(require_roles("caregiver", "patient")),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)

    query = db.query(MyWorldItem).filter(MyWorldItem.patient_id == patient.id)

    if category is not None:
        query = query.filter(MyWorldItem.category == category)
    if media_type is not None:
        query = query.filter(MyWorldItem.media_type == media_type)
    if since is not None:
        query = query.filter(MyWorldItem.updated_at > since)

    return query.order_by(
        desc(MyWorldItem.is_favourite),
        MyWorldItem.sort_order,
        nullslast(desc(MyWorldItem.memory_date)),
        desc(MyWorldItem.created_at),
    ).all()


@router.post(
    "/{patient_id}",
    response_model=MyWorldItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_world_item(
    patient_id: UUID,
    item_data: MyWorldItemCreate,
    auth=Depends(require_roles("caregiver")),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)

    item = MyWorldItem(patient_id=patient.id, **item_data.model_dump())

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.patch(
    "/{patient_id}/{item_id}",
    response_model=MyWorldItemResponse,
)
def update_my_world_item(
    patient_id: UUID,
    item_id: UUID,
    item_data: MyWorldItemUpdate,
    auth=Depends(require_roles("caregiver")),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)
    item = _get_item(db, patient.id, item_id)

    for field, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete(
    "/{patient_id}/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_my_world_item(
    patient_id: UUID,
    item_id: UUID,
    auth=Depends(require_roles("caregiver")),
    db: Session = Depends(get_db),
):
    patient = get_patient_for_auth(patient_id, auth, db)
    item = _get_item(db, patient.id, item_id)

    db.delete(item)
    db.commit()


@router.post(
    "/{patient_id}/{item_id}/interaction",
    response_model=MyWorldItemResponse,
)
def report_my_world_interaction(
    patient_id: UUID,
    item_id: UUID,
    report: MyWorldInteractionReport,
    auth=Depends(require_roles("caregiver", "patient")),
    db: Session = Depends(get_db),
):
    """Recognition-drill result — used by the cognitive games."""
    patient = get_patient_for_auth(patient_id, auth, db)
    item = _get_item(db, patient.id, item_id)

    record_recognition(item, report.was_correct)

    db.commit()
    db.refresh(item)

    return item


@router.post(
    "/{patient_id}/{item_id}/reaction",
    response_model=MyWorldItemResponse,
)
def report_my_world_reaction(
    patient_id: UUID,
    item_id: UUID,
    report: MyWorldReaction,
    auth=Depends(require_roles("caregiver", "patient")),
    db: Session = Depends(get_db),
):
    """Journal reaction from the patient's My World gallery."""
    patient = get_patient_for_auth(patient_id, auth, db)
    item = _get_item(db, patient.id, item_id)

    apply_reaction(item, report.reaction, report.client_timestamp)

    db.commit()
    db.refresh(item)

    return item
