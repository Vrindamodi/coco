import uuid
from datetime import datetime, timedelta, timezone

from app.models import Alert, GameSession, Patient, SyncOperation
from app.models.enums import AlertStatus, AlertType
from app.seed import (
    DEMO_CAREGIVER_EMAIL,
    DEMO_CAREGIVER_PASSWORD,
    PATIENT_1_ID,
    PATIENT_2_ID,
)
from app.services.adaptive import get_next_difficulty


def _caregiver_headers(client) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": DEMO_CAREGIVER_EMAIL, "password": DEMO_CAREGIVER_PASSWORD},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _patient_headers(client) -> dict[str, str]:
    login = client.post(
        "/api/v1/auth/patient-login",
        json={"patient_id": str(PATIENT_1_ID), "pin": "1234"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _game_result_op(
    *,
    patient_id=PATIENT_1_ID,
    session_id=None,
    operation_id=None,
    device_id="device-a",
    payload_overrides=None,
    client_timestamp=None,
):
    payload = {
        "session_id": str(session_id) if session_id else None,
        "game_type": "memory_match",
        "score": 80,
        "duration_seconds": 95,
        "difficulty_level": 2,
        "hints_used": 1,
    }
    payload.update(payload_overrides or {})
    return {
        "operation_id": operation_id or f"op-{uuid.uuid4()}",
        "device_id": device_id,
        "patient_id": str(patient_id),
        "operation_type": "game_result",
        "payload": payload,
        "client_timestamp": client_timestamp,
    }


def _sync(client, headers, operations):
    response = client.post("/api/v1/sync", headers=headers, json={"operations": operations})
    assert response.status_code == 200, response.text
    return response.json()


def test_game_result_uses_client_session_id(client, db_session):
    headers = _patient_headers(client)
    session_id = uuid.uuid4()
    played_at = datetime.now(timezone.utc) - timedelta(hours=3)

    body = _sync(
        client,
        headers,
        [_game_result_op(session_id=session_id, client_timestamp=played_at.isoformat())],
    )

    assert body["synced"] == 1
    result = body["results"][0]
    assert result["status"] == "synced"
    assert result["resource_id"] == str(session_id)

    stored = db_session.get(GameSession, session_id)
    assert stored is not None
    assert stored.patient_id == PATIENT_1_ID
    assert stored.hints_used == 1
    assert stored.difficulty_level == 2
    # Offline play keeps its real timestamp rather than the sync moment.
    assert abs((stored.played_at - played_at).total_seconds()) < 1


def test_replayed_operation_returns_the_session_id(client, db_session):
    headers = _patient_headers(client)
    session_id = uuid.uuid4()
    op = _game_result_op(session_id=session_id, operation_id="op-replay")

    first = _sync(client, headers, [op])
    second = _sync(client, headers, [op])

    assert first["results"][0]["status"] == "synced"
    assert second["results"][0]["status"] == "duplicate"
    # A client that lost the first response must get an id it can resolve,
    # not the audit row's id.
    assert second["results"][0]["resource_id"] == str(session_id)
    assert db_session.query(GameSession).filter_by(id=session_id).count() == 1


def test_same_session_under_a_new_operation_is_idempotent(client, db_session):
    headers = _patient_headers(client)
    session_id = uuid.uuid4()

    _sync(client, headers, [_game_result_op(session_id=session_id)])
    body = _sync(client, headers, [_game_result_op(session_id=session_id)])

    assert body["results"][0]["status"] == "synced"
    assert body["results"][0]["resource_id"] == str(session_id)
    assert db_session.query(GameSession).filter_by(id=session_id).count() == 1


def test_missing_difficulty_is_filled_by_the_engine(client, db_session):
    headers = _patient_headers(client)
    patient = db_session.get(Patient, PATIENT_1_ID)
    expected = get_next_difficulty(db_session, patient.id, patient.cognitive_level)
    session_id = uuid.uuid4()

    _sync(
        client,
        headers,
        [_game_result_op(session_id=session_id, payload_overrides={"difficulty_level": None})],
    )

    stored = db_session.get(GameSession, session_id)
    assert stored.difficulty_level == expected


def test_invalid_payload_is_reported_as_failed(client, db_session):
    headers = _patient_headers(client)
    op = _game_result_op(operation_id="op-bad", payload_overrides={"score": -1})

    body = _sync(client, headers, [op])

    assert body["failed"] == 1
    result = body["results"][0]
    assert result["status"] == "failed"
    assert "Invalid game_result payload" in result["error"]

    record = db_session.query(SyncOperation).filter_by(operation_id="op-bad").one()
    assert record.status == "failed"


def test_unauthorised_operation_does_not_abort_the_batch(client, db_session):
    headers = _patient_headers(client)  # patient 1
    own_session = uuid.uuid4()

    body = _sync(
        client,
        headers,
        [
            _game_result_op(patient_id=PATIENT_2_ID, session_id=uuid.uuid4()),
            _game_result_op(session_id=own_session),
        ],
    )

    statuses = [r["status"] for r in body["results"]]
    assert statuses == ["failed", "synced"]
    assert body["failed"] == 1 and body["synced"] == 1
    assert db_session.get(GameSession, own_session) is not None
    # No audit row for the rejected op, so a legitimate retry later can succeed.
    assert (
        db_session.query(SyncOperation)
        .filter_by(operation_id=body["results"][0]["operation_id"])
        .count()
        == 0
    )


def test_offline_result_runs_the_alert_engine(client, db_session):
    headers = _caregiver_headers(client)
    # Patient 2 is seeded with a steadily declining run; one more poor
    # session must surface a cognitive-decline alert, same as the online path.
    _sync(
        client,
        headers,
        [
            _game_result_op(
                patient_id=PATIENT_2_ID,
                session_id=uuid.uuid4(),
                payload_overrides={"score": 20, "duration_seconds": 240},
            )
        ],
    )

    alerts = (
        db_session.query(Alert)
        .filter(
            Alert.patient_id == PATIENT_2_ID,
            Alert.alert_type == AlertType.COGNITIVE_DECLINE,
            Alert.status == AlertStatus.ACTIVE,
        )
        .all()
    )
    assert len(alerts) >= 1


def test_pull_returns_only_sessions_after_the_watermark(client, db_session):
    headers = _patient_headers(client)

    first = client.get(f"/api/v1/sync/pull/{PATIENT_1_ID}", headers=headers)
    assert first.status_code == 200
    assert len(first.json()["game_sessions"]) > 0  # seeded history
    watermark = first.json()["server_time"]

    new_session = uuid.uuid4()
    _sync(client, headers, [_game_result_op(session_id=new_session)])

    delta = client.get(
        f"/api/v1/sync/pull/{PATIENT_1_ID}",
        headers=headers,
        params={"since": watermark},
    )
    assert delta.status_code == 200
    sessions = delta.json()["game_sessions"]
    assert [s["id"] for s in sessions] == [str(new_session)]
    assert sessions[0]["hints_used"] == 1
