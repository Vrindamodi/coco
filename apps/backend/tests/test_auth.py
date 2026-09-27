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
