import logging
from uuid import UUID

import redis

from app.config import settings

logger = logging.getLogger(__name__)

REMINDER_QUEUE_KEY = "reminders:pending"


def get_redis_client() -> redis.Redis:
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


# TODO: [reminders teammate] implement worker to process queue and send push notifications
def enqueue_reminder(reminder_id: UUID) -> None:
    try:
        client = get_redis_client()
        client.lpush(REMINDER_QUEUE_KEY, str(reminder_id))
    except redis.RedisError as exc:
        logger.warning("Failed to enqueue reminder %s: %s", reminder_id, exc)


def ping_redis() -> bool:
    try:
        client = get_redis_client()
        return client.ping()
    except redis.RedisError:
        return False
