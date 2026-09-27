import logging
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    admin,
    alerts,
    auth,
    caregivers,
    chat,
    games,
    media,
    patients,
    progress,
    reminders,
    my_world,
    yoga,
    sync,
    voice,
)
from app.schemas import HealthResponse

# Uvicorn configures only its own loggers; the app's go to the root logger,
# which otherwise drops everything below WARNING. Same prefix style as uvicorn.
logging.basicConfig(
    level=settings.LOG_LEVEL.upper(),
    format="%(levelname)s:     %(name)s: %(message)s",
)

app = FastAPI(
    title="Coco API",
    description="AI-based cognitive gaming and memory assistance platform for elderly dementia patients",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(patients.router, prefix="/api/v1")
app.include_router(games.router, prefix="/api/v1")
app.include_router(reminders.router, prefix="/api/v1")
app.include_router(progress.router, prefix="/api/v1")
app.include_router(caregivers.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(my_world.router, prefix="/api/v1")
app.include_router(media.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(alerts.router, prefix="/api/v1")
app.include_router(yoga.router, prefix="/api/v1")
app.include_router(sync.router, prefix="/api/v1")
app.include_router(voice.router, prefix="/api/v1")


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    return HealthResponse(
        status="ok",
        service="coco-backend",
        timestamp=datetime.now(timezone.utc),
    )