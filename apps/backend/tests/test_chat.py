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
    assert "App interface language" in context
    assert "reminders" in context.lower()


def test_chat_context_includes_my_world_details(client, db_session):
    """The model can only answer "where is my home?" if the journal is in the prompt."""
    from app.models import Patient
    from app.services.chat_context import build_patient_context

    patient = db_session.get(Patient, PATIENT_1_ID)
    context = build_patient_context(db_session, patient)

    # Relationships, not just bare names.
    assert "Priya — their daughter" in context
    assert "Rohan — their grandson" in context
    # Places, grouped so a question about home has somewhere to land.
    assert "Places they know" in context
    assert "Our old house" in context
    assert "The family home" in context
    # The caregiver's own words about a memory.
    assert "tea garden" in context
    assert "bamboo grove" in context
    # Recognition difficulty so Coco knows where to help more.
    assert "often hard for them to recall" in context


def test_chat_context_without_my_world_says_so(client, db_session):
    from app.models import MyWorldItem, Patient
    from app.services.chat_context import build_patient_context

    db_session.query(MyWorldItem).filter(
        MyWorldItem.patient_id == PATIENT_1_ID
    ).delete()
    db_session.commit()

    patient = db_session.get(Patient, PATIENT_1_ID)
    context = build_patient_context(db_session, patient)

    assert "My World journal: empty" in context


def test_chat_message_sends_my_world_to_the_model(client):
    token = _patient_token(client)

    with patch("app.services.groq_client.chat_completion") as mock_chat:
        mock_chat.return_value = "Your old house is the family home."

        response = client.post(
            "/api/v1/chat/message",
            data={"text": "Where is my home?", "language": "en"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    system_prompt = mock_chat.call_args.args[0][0]["content"]
    assert "Our old house" in system_prompt
    assert "Never say you do not know something that is written above" in system_prompt


def test_chat_message_with_audio_uses_detected_language(client):
    from app.services.groq_client import Transcription

    token = _patient_token(client)
    transcription = Transcription(
        text="मैं ठीक हूँ", language="hi", confidence=-0.2, no_speech_prob=0.05
    )

    with patch("app.services.groq_client.transcribe_audio") as mock_stt, patch(
        "app.services.groq_client.chat_completion"
    ) as mock_chat:
        mock_stt.return_value = transcription
        # The prompt asks for Hindi because that is what was spoken, so the
        # mocked reply is Hindi too.
        mock_chat.return_value = "यह सुनकर अच्छा लगा।"

        response = client.post(
            "/api/v1/chat/message",
            data={"language": "as"},
            files={"audio": ("clip.m4a", b"fake-audio", "audio/m4a")},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["transcript"] == "मैं ठीक हूँ"
    assert body["user_message"]["language"] == "hi"
    # The patient spoke Hindi, so Coco answers in Hindi even though the app
    # is set to Assamese.
    assert body["assistant_message"]["language"] == "hi"

    system_prompt = mock_chat.call_args.args[0][0]["content"]
    assert "Reply ONLY in Hindi (hi)" in system_prompt
    assert "App interface language: Assamese (as)" in system_prompt


def test_chat_message_with_silent_audio_returns_400(client):
    from app.services.groq_client import Transcription

    token = _patient_token(client)

    with patch("app.services.groq_client.transcribe_audio") as mock_stt:
        mock_stt.return_value = Transcription(
            text="", language=None, confidence=None, no_speech_prob=0.9
        )
        response = client.post(
            "/api/v1/chat/message",
            data={"language": "en"},
            files={"audio": ("clip.m4a", b"fake-audio", "audio/m4a")},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 400


def test_typed_language_is_mirrored_over_the_app_language(client):
    """A Hindi question in an Assamese app has to come back in Hindi."""
    token = _patient_token(client)

    with patch("app.services.groq_client.chat_completion") as mock_chat:
        mock_chat.return_value = "आपका पुराना घर परिवार का घर है।"

        response = client.post(
            "/api/v1/chat/message",
            data={"text": "मेरा घर किधर है?", "language": "as"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["user_message"]["language"] == "hi"
    assert body["assistant_message"]["language"] == "hi"

    system_prompt = mock_chat.call_args.args[0][0]["content"]
    assert "Reply ONLY in Hindi (hi)" in system_prompt
    assert "Follow the patient, not the app." in system_prompt


def test_untypeable_message_falls_back_to_the_app_language(client):
    token = _patient_token(client)

    with patch("app.services.groq_client.chat_completion") as mock_chat:
        mock_chat.return_value = "?"

        response = client.post(
            "/api/v1/chat/message",
            data={"text": "?!!", "language": "as"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    assert response.json()["assistant_message"]["language"] == "as"


def test_detect_text_language():
    from app.services.chat_service import detect_text_language

    assert detect_text_language("मेरा घर किधर है?", "as") == "hi"
    assert detect_text_language("Where is my home?", "as") == "en"
    # One script, two languages: the app setting breaks the tie.
    assert detect_text_language("মোৰ ঘৰ ক\'ত?", "as") == "as"
    assert detect_text_language("আমার বাড়ি কোথায়?", "bn") == "bn"
    # A stray English word does not make a Hindi sentence English.
    assert detect_text_language("मेरा doctor कब आएगा?", "as") == "hi"
    assert detect_text_language("12:30", "as") is None
