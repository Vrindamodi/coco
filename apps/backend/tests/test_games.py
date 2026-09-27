from app.models import Patient
from app.seed import PATIENT_1_ID
from app.services.adaptive import get_next_difficulty


def _patient_headers(client) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/patient-login",
        json={"patient_id": str(PATIENT_1_ID), "pin": "1234"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_create_session_fills_difficulty_and_keeps_hints(client, db_session):
    headers = _patient_headers(client)
    patient = db_session.get(Patient, PATIENT_1_ID)
    expected = get_next_difficulty(db_session, patient.id, patient.cognitive_level)

    created = client.post(
        "/api/v1/games/sessions",
        headers=headers,
        json={
            "patient_id": str(PATIENT_1_ID),
            "game_type": "object_recognition",
            "score": 75,
            "duration_seconds": 60,
            "hints_used": 2,
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["difficulty_level"] == expected
    assert body["hints_used"] == 2

    listed = client.get(
        "/api/v1/games/sessions",
        headers=headers,
        params={"patient_id": str(PATIENT_1_ID)},
    )
    assert listed.status_code == 200
    sessions = listed.json()
    # Newest first, and the one just created carries its hints.
    assert sessions[0]["id"] == body["id"]
    assert sessions[0]["hints_used"] == 2


def test_score_above_100_is_rejected(client):
    headers = _patient_headers(client)
    response = client.post(
        "/api/v1/games/sessions",
        headers=headers,
        json={"patient_id": str(PATIENT_1_ID), "game_type": "memory_match", "score": 101},
    )
    assert response.status_code == 422
