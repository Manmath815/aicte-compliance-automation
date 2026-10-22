import pytest
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.entities import (
    User, UserRole, Institution, Application, ApplicationStage,
    Document, DocumentCategory, DocumentVerificationStatus,
    ComplianceRule, ComplianceAssessment, ComplianceRuleStatus,
    RemediationTask, TaskStatus, RiskAssessment, Alert, AlertStatus, SeverityLevel
)
from app.services.auth_service import verify_password, get_password_hash, create_access_token
from app.services.compliance_engine import evaluate_application_compliance
from app.services.risk_engine import compute_application_risk
from app.services.alert_scheduler import create_or_dedup_alert, run_deadline_and_compliance_checks
from app.services.report_service import generate_compliance_pdf_report, generate_compliance_csv_report
from app.services.rag_service import search_regulatory_knowledge, answer_compliance_query
from app.api.v1.applications import ALLOWED_TRANSITIONS

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

# 1. Test Auth & RBAC
def test_password_hashing_and_verification():
    raw_pwd = "SecurePassword@2026"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_generation():
    token = create_access_token({"user_id": 1, "role": "SUPER_ADMIN"})
    assert isinstance(token, str)
    assert len(token) > 20

def test_user_roles_exist(db):
    roles = [u.role for u in db.query(User).all()]
    assert UserRole.SUPER_ADMIN in roles
    assert UserRole.INSTITUTION_ADMIN in roles
    assert UserRole.COMPLIANCE_OFFICER in roles
    assert UserRole.REVIEWER in roles

# 2. Test Workflow State Machine
def test_workflow_state_transitions():
    assert ApplicationStage.DOCUMENT_COLLECTION in ALLOWED_TRANSITIONS[ApplicationStage.DRAFT]
    assert ApplicationStage.AUTOMATED_VALIDATION in ALLOWED_TRANSITIONS[ApplicationStage.DOCUMENT_COLLECTION]
    assert ApplicationStage.OFFICER_REVIEW in ALLOWED_TRANSITIONS[ApplicationStage.AUTOMATED_VALIDATION]
    assert ApplicationStage.INTERNAL_APPROVAL in ALLOWED_TRANSITIONS[ApplicationStage.OFFICER_REVIEW]
    # Verify illegal transitions cannot occur directly
    assert ApplicationStage.READY_FOR_SUBMISSION not in ALLOWED_TRANSITIONS[ApplicationStage.DRAFT]

# 3. Test Compliance Engine
def test_compliance_rule_evaluation(db):
    app = db.query(Application).first()
    assert app is not None
    assessments = evaluate_application_compliance(db, app.id)
    assert len(assessments) >= 6
    
    # We uploaded verified Land deed, so Land rule should be COMPLIANT
    land_ass = next((a for a in assessments if a.rule.rule_code == "AICTE-APH-LAND-01"), None)
    assert land_ass is not None
    assert land_ass.status == ComplianceRuleStatus.COMPLIANT
    assert land_ass.score == 100.0

    # Faculty list was marked CORRECTION_REQUESTED, so Faculty rule should be NON_COMPLIANT
    fac_ass = next((a for a in assessments if a.rule.rule_code == "AICTE-APH-FAC-03"), None)
    assert fac_ass is not None
    assert fac_ass.status == ComplianceRuleStatus.NON_COMPLIANT

# 4. Test Risk Engine
def test_risk_scoring(db):
    app = db.query(Application).first()
    risk = compute_application_risk(db, app.id)
    assert risk is not None
    assert 0.0 <= risk.overall_score <= 100.0
    assert risk.risk_level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert len(risk.ranked_issues) > 0
    assert len(risk.suggested_actions) > 0

# 5. Test Alert Deduplication
def test_alert_deduplication(db):
    inst = db.query(Institution).first()
    dedup_key = "test_unique_alert_key_999"
    
    alert1 = create_or_dedup_alert(
        db, inst.id, "DEADLINE_APPROACHING", SeverityLevel.HIGH,
        "Test Deadline Alert", "This is a test", dedup_key
    )
    alert2 = create_or_dedup_alert(
        db, inst.id, "DEADLINE_APPROACHING", SeverityLevel.HIGH,
        "Duplicate Attempt", "Should not duplicate", dedup_key
    )
    assert alert1.id == alert2.id

# 6. Test Reports
def test_pdf_report_generation(db):
    app = db.query(Application).first()
    pdf_bytes = generate_compliance_pdf_report(db, app.id)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")

def test_csv_report_generation(db):
    app = db.query(Application).first()
    csv_str = generate_compliance_csv_report(db, app.id)
    assert "Rule Code" in csv_str
    assert "AICTE-APH-LAND-01" in csv_str

# 7. Test AI Assistant Citations & Safety
def test_rag_knowledge_search(db):
    chunks = search_regulatory_knowledge(db, "faculty student ratio")
    assert len(chunks) > 0
    assert any("faculty" in c.keywords for c in chunks)

def test_rag_response_with_citations(db):
    user = db.query(User).filter(User.role == UserRole.INSTITUTION_ADMIN).first()
    app = db.query(Application).first()
    res = answer_compliance_query(db, "What is the prescribed faculty-to-student ratio?", user, app.id)
    assert res.has_sufficient_evidence is True
    assert len(res.citations) > 0
    assert "1:15" in res.answer or "faculty" in res.answer.lower()

def test_rag_insufficient_evidence(db):
    user = db.query(User).filter(User.role == UserRole.INSTITUTION_ADMIN).first()
    res = answer_compliance_query(db, "Quantum particle accelerator rocket thrust guidelines", user)
    assert res.has_sufficient_evidence is False
    assert "Insufficient evidence" in res.answer
