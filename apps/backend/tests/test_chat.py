from unittest.mock import patch

from app.seed import PATIENT_1_ID


def _patient_token(client) -> str:
    response = client.post(
        "/api/v1/auth/patient-login",
        json={"patient_id": str(PATIENT_1_ID), "pin": "1234"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_chat_history_empty(client):
    token = _patient_token(client)
    response = client.get(
        "/api/v1/chat/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_chat_message_requires_auth(client):
    response = client.post(
        "/api/v1/chat/message",
        data={"text": "Hello"},
    )
    assert response.status_code == 401


def test_chat_message_with_text(client):
    token = _patient_token(client)

    with patch("app.services.groq_client.chat_completion") as mock_chat:
        mock_chat.return_value = "Hello Lakshmi! How are you feeling today?"

        response = client.post(
            "/api/v1/chat/message",
            data={"text": "Hello Coco"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["transcript"] == "Hello Coco"
    assert body["user_message"]["role"] == "user"
    assert body["assistant_message"]["role"] == "assistant"
    assert "Hello Lakshmi" in body["assistant_message"]["content"]

    history = client.get(
        "/api/v1/chat/history",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert history.status_code == 200
    assert len(history.json()) == 2


def test_chat_message_without_groq_key(client, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    token = _patient_token(client)

    response = client.post(
        "/api/v1/chat/message",
        data={"text": "Hello"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 503


def test_chat_context_builds(client, db_session):
    from app.models import Patient
    from app.services.chat_context import build_patient_context

    patient = db_session.get(Patient, PATIENT_1_ID)
    context = build_patient_context(db_session, patient)

    assert "Lakshmi Devi" in context
    assert "Preferred language" in context
    assert "reminders" in context.lower()
