from datetime import datetime, timedelta, timezone

from app.models import Alert, GameSession, Patient, Reminder
from app.models.enums import AlertStatus, AlertType, GameType, ReminderType
from app.seed import DEMO_CAREGIVER_EMAIL, DEMO_CAREGIVER_PASSWORD, PATIENT_1_ID
from app.services.alert_engine import evaluate_patient


def _caregiver_token(client) -> str:
    login = client.post(
        "/api/v1/auth/login",
        json={"email": DEMO_CAREGIVER_EMAIL, "password": DEMO_CAREGIVER_PASSWORD},
    )
    assert login.status_code == 200
    return login.json()["access_token"]


def test_alerts_list_requires_auth(client):
    response = client.get("/api/v1/alerts/")
    assert response.status_code == 401


def test_alerts_summary_and_acknowledge(client, db_session):
    patient = db_session.get(Patient, PATIENT_1_ID)
    assert patient is not None

    # Force inactivity: ensure oldest created + no recent sessions by evaluating
    # after shifting last activity conceptually via overdue reminder
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        patient_id=patient.id,
        title="Morning medicine",
        reminder_type=ReminderType.MEDICINE,
        scheduled_at=now - timedelta(hours=2),
        is_done=False,
    )
    db_session.add(reminder)
    db_session.commit()

    evaluate_patient(db_session, patient)

    token = _caregiver_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    listed = client.get("/api/v1/alerts/?status=active", headers=headers)
    assert listed.status_code == 200
    body = listed.json()
    assert any(a["alert_type"] == "missed_reminder" for a in body)

    summary = client.get("/api/v1/alerts/summary", headers=headers)
    assert summary.status_code == 200
    assert summary.json()["active_count"] >= 1

    missed = next(a for a in body if a["alert_type"] == "missed_reminder")
    ack = client.patch(
        f"/api/v1/alerts/{missed['id']}",
        headers=headers,
        json={"status": "acknowledged"},
    )
    assert ack.status_code == 200
    assert ack.json()["status"] == "acknowledged"


def test_missed_reminder_resolves_when_done(client, db_session):
    patient = db_session.get(Patient, PATIENT_1_ID)
    now = datetime.now(timezone.utc)
    reminder = Reminder(
        patient_id=patient.id,
        title="Drink water",
        reminder_type=ReminderType.HYDRATION,
        scheduled_at=now - timedelta(minutes=30),
        is_done=False,
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)

    evaluate_patient(db_session, patient)
    active = (
        db_session.query(Alert)
        .filter(
            Alert.patient_id == patient.id,
            Alert.alert_type == AlertType.MISSED_REMINDER,
            Alert.status == AlertStatus.ACTIVE,
            Alert.source_ref == str(reminder.id),
        )
        .count()
    )
    assert active == 1

    token = _caregiver_token(client)
    patch = client.patch(
        f"/api/v1/reminders/{reminder.id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"is_done": True},
    )
    assert patch.status_code == 200

    remaining = (
        db_session.query(Alert)
        .filter(
            Alert.patient_id == patient.id,
            Alert.alert_type == AlertType.MISSED_REMINDER,
            Alert.status == AlertStatus.ACTIVE,
            Alert.source_ref == str(reminder.id),
        )
        .count()
    )
    assert remaining == 0


def test_inactivity_alert_resolves_after_session(client, db_session):
    patient = db_session.get(Patient, PATIENT_1_ID)
    # Clear recent sessions conceptually by adding an old session and evaluating
    # with patient created in the past — seed may already have sessions.
    # Create alert manually then play a fresh session to resolve inactivity.
    from app.models.enums import AlertSeverity

    alert = Alert(
        patient_id=patient.id,
        caregiver_id=patient.caregiver_id,
        alert_type=AlertType.INACTIVITY,
        severity=AlertSeverity.MEDIUM,
        title="Inactivity detected",
        message="test",
        status=AlertStatus.ACTIVE,
    )
    db_session.add(alert)
    db_session.commit()

    # Fresh session should clear inactivity via evaluate
    session = GameSession(
        patient_id=patient.id,
        game_type=GameType.MEMORY_MATCH,
        score=80,
        duration_seconds=120,
        difficulty_level=2,
        played_at=datetime.now(timezone.utc),
    )
    db_session.add(session)
    db_session.commit()

    evaluate_patient(db_session, patient)

    active_inactivity = (
        db_session.query(Alert)
        .filter(
            Alert.patient_id == patient.id,
            Alert.alert_type == AlertType.INACTIVITY,
            Alert.status == AlertStatus.ACTIVE,
        )
        .count()
    )
    assert active_inactivity == 0


def test_caregiver_isolation(client, db_session):
    """Caregiver 2 cannot see caregiver 1 alerts."""
    from app.models.enums import AlertSeverity

    patient = db_session.get(Patient, PATIENT_1_ID)
    alert = Alert(
        patient_id=patient.id,
        caregiver_id=patient.caregiver_id,
        alert_type=AlertType.COGNITIVE_DECLINE,
        severity=AlertSeverity.HIGH,
        title="Decline",
        message="test isolation",
        status=AlertStatus.ACTIVE,
    )
    db_session.add(alert)
    db_session.commit()

    login2 = client.post(
        "/api/v1/auth/login",
        json={"email": "caregiver2@coco-demo.io", "password": "caregiver22"},
    )
    assert login2.status_code == 200
    token2 = login2.json()["access_token"]

    listed = client.get(
        "/api/v1/alerts/",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert listed.status_code == 200
    assert all(a["patient_id"] != str(PATIENT_1_ID) for a in listed.json())
