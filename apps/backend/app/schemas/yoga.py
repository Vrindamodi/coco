from typing import Optional

from pydantic import BaseModel, ConfigDict


class YogaVideoCreate(BaseModel):
    title: str
    description: Optional[str] = None
    language: str
    category: str
    difficulty: str = "beginner"
    video_uri: str
    thumbnail_uri: Optional[str] = None
    duration: Optional[int] = None
    is_downloadable: bool = True


class YogaVideoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: Optional[str] = None
    language: str
    category: str
    difficulty: str
    video_uri: str
    thumbnail_uri: Optional[str] = None
    duration: Optional[int] = None
    is_downloadable: bool