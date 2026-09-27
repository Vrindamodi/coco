from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import AuthContext, require_roles
from app.core.security import AuthRole
from app.database import get_db
from app.models import YogaVideo
from app.schemas.yoga import YogaVideoResponse


router = APIRouter(prefix="/yoga", tags=["yoga"])


def _yoga_video_response(video: YogaVideo) -> YogaVideoResponse:
    return YogaVideoResponse(
        id=str(video.id),
        title=video.title,
        description=video.description,
        language=video.language,
        category=video.category,
        difficulty=video.difficulty,
        video_uri=video.video_uri,
        thumbnail_uri=video.thumbnail_uri,
        duration=video.duration,
        is_downloadable=video.is_downloadable,
    )


@router.get("/videos", response_model=list[YogaVideoResponse])
def list_yoga_videos(
    language: str | None = Query(default=None),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(YogaVideo)

    if language is not None:
        language = language.lower()

        if language not in {"en", "as"}:
            raise HTTPException(
                status_code=400,
                detail="Language must be 'en' or 'as'",
            )

        query = query.filter(YogaVideo.language == language)

    if category is not None:
        query = query.filter(YogaVideo.category == category)

    videos = query.order_by(YogaVideo.category, YogaVideo.title).all()

    return [_yoga_video_response(video) for video in videos]


@router.get("/videos/{video_id}", response_model=YogaVideoResponse)
def get_yoga_video(
    video_id: UUID,
    db: Session = Depends(get_db),
):
    video = db.get(YogaVideo, video_id)

    if video is None:
        raise HTTPException(
            status_code=404,
            detail="Yoga video not found",
        )

    return _yoga_video_response(video)


@router.get("/categories", response_model=list[str])
def list_yoga_categories(
    language: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(YogaVideo.category).distinct()

    if language is not None:
        language = language.lower()

        if language not in {"en", "as"}:
            raise HTTPException(
                status_code=400,
                detail="Language must be 'en' or 'as'",
            )

        query = query.filter(YogaVideo.language == language)

    categories = query.order_by(YogaVideo.category).all()

    return [category[0] for category in categories]