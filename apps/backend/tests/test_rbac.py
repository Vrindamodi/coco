from app.seed import (
    DEMO_CAREGIVER_EMAIL,
    DEMO_CAREGIVER_PASSWORD,
    PATIENT_1_ID,
    PATIENT_3_ID,
)


def _caregiver_token(client, email=DEMO_CAREGIVER_EMAIL, password=DEMO_CAREGIVER_PASSWORD):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    return login.json()["access_token"]


def test_caregiver_only_sees_own_patients(client):
    token = _caregiver_token(client)
    response = client.get(
        "/api/v1/patients/",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    patient_ids = {p["id"] for p in response.json()}
    assert str(PATIENT_1_ID) in patient_ids
    assert str(PATIENT_3_ID) not in patient_ids


def test_caregiver_cannot_access_other_caregivers_patient(client):
    token = _caregiver_token(client)
    response = client.get(
        f"/api/v1/patients/{PATIENT_3_ID}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403


def test_patient_can_access_own_profile(client):
    login = client.post(
        "/api/v1/auth/patient-login",
        json={"patient_id": str(PATIENT_1_ID), "pin": "1234"},
    )
    token = login.json()["access_token"]
    response = client.get(
        f"/api/v1/patients/{PATIENT_1_ID}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Lakshmi Devi"


def test_progress_for_own_patient(client):
    token = _caregiver_token(client)
    response = client.get(
        f"/api/v1/progress/{PATIENT_1_ID}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == str(PATIENT_1_ID)
    assert body["total_sessions"] >= 1
