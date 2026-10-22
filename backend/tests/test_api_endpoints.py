import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_demo_login_and_auth_flow():
    # Login as Institution Admin
    res = client.post("/api/v1/auth/demo-login?role=INSTITUTION_ADMIN")
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get profile
    res_me = client.get("/api/v1/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["role"] == "INSTITUTION_ADMIN"

    # Get dashboard
    res_dash = client.get("/api/v1/dashboard/executive-overview", headers=headers)
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert "active_workflows_count" in dash_data
    assert "overall_risk_score" in dash_data

    # Get compliance rules
    res_rules = client.get("/api/v1/compliance/rules", headers=headers)
    assert res_rules.status_code == 200
    assert len(res_rules.json()) >= 6

    # Get risk assessment
    res_risk = client.get("/api/v1/risk/1", headers=headers)
    assert res_risk.status_code == 200
    assert "overall_score" in res_risk.json()

    # Get alerts
    res_alerts = client.get("/api/v1/alerts/", headers=headers)
    assert res_alerts.status_code == 200
    assert len(res_alerts.json()) > 0

    # Query AI Assistant
    res_query = client.post(
        "/api/v1/assistant/query",
        headers=headers,
        json={"query": "What are the land norms for engineering colleges?", "application_id": 1}
    )
    assert res_query.status_code == 200
    query_data = res_query.json()
    assert "answer" in query_data
    assert len(query_data["citations"]) > 0

    # PDF download
    res_pdf = client.get("/api/v1/reports/compliance-pdf/1", headers=headers)
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
