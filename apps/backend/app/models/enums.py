import enum


class UserRole(str, enum.Enum):
    CAREGIVER = "caregiver"
    ADMIN = "admin"


class AuthRole(str, enum.Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    ADMIN = "admin"


class GameType(str, enum.Enum):
    MEMORY_MATCH = "memory_match"
    SEQUENCE_RECALL = "sequence_recall"
    OBJECT_RECOGNITION = "object_recognition"


class ReminderType(str, enum.Enum):
    MEDICINE = "medicine"
    HYDRATION = "hydration"
    ACTIVITY = "activity"
    APPOINTMENT = "appointment"

class MyWorldCategory(str, enum.Enum):
    PERSON = "person"
    PLACE = "place"
    OBJECT = "object"
    EVENT = "event"
    MOMENT = "moment"


class MediaType(str, enum.Enum):
    PHOTO = "photo"
    VIDEO = "video"
    AUDIO = "audio"
    NOTE = "note"


class MyWorldReactionType(str, enum.Enum):
    VIEWED = "viewed"
    REMEMBERED = "remembered"
    UNSURE = "unsure"


class ChatRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"


class AlertType(str, enum.Enum):
    COGNITIVE_DECLINE = "cognitive_decline"
    INACTIVITY = "inactivity"
    MISSED_REMINDER = "missed_reminder"


class AlertSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"