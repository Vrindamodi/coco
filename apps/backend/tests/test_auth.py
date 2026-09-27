from app.seed import (
    DEMO_CAREGIVER_EMAIL,
    DEMO_CAREGIVER_PASSWORD,
    PATIENT_1_ID,
)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_caregiver_register_and_login(client):
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new.caregiver@coco.local",
            "password": "password123",
            "full_name": "New Caregiver",
            "region": "Assam",
        },
    )
    assert register.status_code == 201
    assert register.json()["role"] == "caregiver"

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "new.caregiver@coco.local", "password": "password123"},
    )
    assert login.status_code == 200
    assert "access_token" in login.json()


def test_patient_pin_login(client):
    response = client.post(
        "/api/v1/auth/patient-login",
        json={"patient_id": str(PATIENT_1_ID), "pin": "1234"},
    )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"


def test_patient_pin_login_by_name(client):
    response = client.post(
        "/api/v1/auth/patient-login",
        json={"full_name": "Lakshmi Devi", "pin": "1234"},
    )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"


def test_auth_me_caregiver(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": DEMO_CAREGIVER_EMAIL, "password": DEMO_CAREGIVER_PASSWORD},
    )
    token = login.json()["access_token"]
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    body = me.json()
    assert body["role"] == "caregiver"
    assert body["user"]["email"] == DEMO_CAREGIVER_EMAIL


def test_patient_name_login_survives_a_namesake_without_a_pin(client, db_session):
    """Seen on a fresh install: a caregiver added a second "Lakshmi Devi" from
    the dashboard, and name login started failing for the seeded one because
    the lookup took whichever row came first."""
    from app.models import Patient, User
    from app.seed import PATIENT_1_ID

    caregiver = db_session.query(User).first()
    seeded = db_session.get(Patient, PATIENT_1_ID)
    db_session.add(
        Patient(caregiver_id=caregiver.id, full_name=seeded.full_name, pin_hash=None)
    )
    db_session.commit()

    response = client.post(
        "/api/v1/auth/patient-login",
        json={"full_name": seeded.full_name, "pin": "1234"},
    )
    assert response.status_code == 200

    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {response.json()['access_token']}"},
    )
    assert me.json()["patient"]["id"] == str(PATIENT_1_ID)


def test_patient_name_login_picks_the_namesake_whose_pin_matches(client, db_session):
    from app.core.security import hash_password
    from app.models import Patient, User
    from app.seed import PATIENT_1_ID

    caregiver = db_session.query(User).first()
    seeded = db_session.get(Patient, PATIENT_1_ID)
    other = Patient(
        caregiver_id=caregiver.id, full_name=seeded.full_name, pin_hash=hash_password("9876")
    )
    db_session.add(other)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/patient-login",
        json={"full_name": seeded.full_name, "pin": "9876"},
    )
    assert response.status_code == 200
    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {response.json()['access_token']}"},
    )
    assert me.json()["patient"]["id"] == str(other.id)
