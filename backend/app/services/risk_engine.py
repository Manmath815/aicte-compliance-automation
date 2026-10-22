from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.entities import (
    Application, RiskAssessment, RiskLevel, ComplianceAssessment,
    ComplianceRuleStatus, RemediationTask, TaskStatus, Document, SeverityLevel
)

def compute_application_risk(db: Session, application_id: int) -> RiskAssessment:
    """
    Transparent, explainable risk assessment engine.
    Calculates weighted risk score (0-100) across 4 dimensions:
      1. Missing Documents / Incomplete Evidence (Weight: 30%)
      2. Overdue Remediation Tasks (Weight: 25%)
      3. Expiring or Outdated Certificates (Weight: 20%)
      4. Critical / High Non-Compliant Rules (Weight: 25%)
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        return None

    # Fetch assessments
    assessments = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.application_id == application_id
    ).all()

    # Fetch open tasks
    tasks = db.query(RemediationTask).filter(
        RemediationTask.application_id == application_id,
        RemediationTask.status.in_([TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.ESCALATED])
    ).all()

    # Fetch documents
    documents = db.query(Document).filter(
        Document.application_id == application_id,
        Document.is_current_version == True
    ).all()

    ranked_issues: List[Dict[str, Any]] = []
    suggested_actions: List[str] = []

    # 1. Missing Documents Score (0 - 100)
    incomplete_assessments = [a for a in assessments if a.status == ComplianceRuleStatus.INCOMPLETE]
    missing_docs_factor = min(100.0, len(incomplete_assessments) * 25.0)
    for a in incomplete_assessments:
        ranked_issues.append({
            "title": f"Missing Mandatory Evidence: {a.rule.title}",
            "severity": "CRITICAL" if a.rule.severity == SeverityLevel.CRITICAL else "HIGH",
            "rule_code": a.rule.rule_code,
            "impact_score": 25.0,
            "description": f"No valid document uploaded to satisfy {a.rule.rule_code} ({a.rule.official_source_section}).",
            "suggested_action": f"Upload verified certificate/document for category '{a.rule.category.value}'."
        })

    # 2. Overdue Remediation Tasks Score (0 - 100)
    now = datetime.utcnow()
    overdue_tasks = [t for t in tasks if t.due_date and t.due_date < now]
    overdue_tasks_factor = min(100.0, len(overdue_tasks) * 30.0 + len(tasks) * 5.0)
    for t in overdue_tasks:
        ranked_issues.append({
            "title": f"Overdue Remediation Task: {t.title}",
            "severity": "HIGH",
            "rule_code": t.assessment.rule.rule_code if t.assessment else "N/A",
            "impact_score": 20.0,
            "description": f"Task assigned to staff passed deadline ({t.due_date.strftime('%Y-%m-%d')}).",
            "suggested_action": f"Escalate task to department head and complete required rectifications."
        })

    # 3. Expiring Documents Score (0 - 100)
    thirty_days_later = now + timedelta(days=30)
    expiring_docs = [
        d for d in documents
        if d.expiry_date and now <= d.expiry_date <= thirty_days_later
    ]
    expired_docs = [
        d for d in documents
        if d.expiry_date and d.expiry_date < now
    ]
    expiring_docs_factor = min(100.0, len(expired_docs) * 50.0 + len(expiring_docs) * 25.0)
    for d in expired_docs:
        ranked_issues.append({
            "title": f"Expired Compliance Document: {d.title}",
            "severity": "CRITICAL",
            "rule_code": "APH-DOC-EXP",
            "impact_score": 30.0,
            "description": f"Document '{d.title}' expired on {d.expiry_date.strftime('%Y-%m-%d')}.",
            "suggested_action": "Obtain renewed certificate from issuing regulatory authority and re-upload."
        })
    for d in expiring_docs:
        ranked_issues.append({
            "title": f"Document Approaching Expiry: {d.title}",
            "severity": "MEDIUM",
            "rule_code": "APH-DOC-EXP",
            "impact_score": 15.0,
            "description": f"Document '{d.title}' expires in {(d.expiry_date - now).days} days.",
            "suggested_action": "Initiate renewal process with local authority to prevent compliance breach."
        })

    # 4. Critical / High Non-Compliance Score (0 - 100)
    non_compliant = [
        a for a in assessments
        if a.status in [ComplianceRuleStatus.NON_COMPLIANT, ComplianceRuleStatus.OUTDATED_EVIDENCE]
    ]
    non_compliance_factor = min(100.0, len(non_compliant) * 35.0)
    for a in non_compliant:
        ranked_issues.append({
            "title": f"Non-Compliance Finding: {a.rule.title}",
            "severity": a.rule.severity.value,
            "rule_code": a.rule.rule_code,
            "impact_score": 30.0,
            "description": a.findings or "Evidence rejected or discrepancy found.",
            "suggested_action": f"Address deficiency under {a.rule.official_source_section} and request re-review."
        })

    # Weighted Overall Score
    # Weights: Missing Docs 30%, Overdue Tasks 25%, Expiring Docs 20%, Non-Compliance 25%
    overall_score = round(
        (missing_docs_factor * 0.30) +
        (overdue_tasks_factor * 0.25) +
        (expiring_docs_factor * 0.20) +
        (non_compliance_factor * 0.25),
        1
    )

    # Classify Risk Level
    if overall_score >= 70.0:
        risk_level = RiskLevel.CRITICAL
    elif overall_score >= 45.0:
        risk_level = RiskLevel.HIGH
    elif overall_score >= 20.0:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.LOW

    # Generate Top Suggested Actions
    if missing_docs_factor > 0:
        suggested_actions.append("Upload missing evidence for mandatory land, faculty, and affiliation norms.")
    if overdue_tasks_factor > 0:
        suggested_actions.append("Clear all overdue remediation tasks to avoid institutional approval penalties.")
    if expiring_docs_factor > 0:
        suggested_actions.append("Renew fire safety, building safety, and university affiliation certificates.")
    if non_compliance_factor > 0:
        suggested_actions.append("Correct rejected review items and provide authenticated supporting affidavits.")
    if not suggested_actions:
        suggested_actions.append("All primary norms verified. Maintain document readiness for final sign-off.")

    # Sort ranked issues by impact score descending
    ranked_issues.sort(key=lambda x: x["impact_score"], reverse=True)

    risk_assessment = db.query(RiskAssessment).filter(
        RiskAssessment.application_id == application_id
    ).first()

    if not risk_assessment:
        risk_assessment = RiskAssessment(
            application_id=application_id,
            institution_id=application.institution_id
        )
        db.add(risk_assessment)

    risk_assessment.overall_score = overall_score
    risk_assessment.risk_level = risk_level
    risk_assessment.missing_docs_score = round(missing_docs_factor, 1)
    risk_assessment.overdue_tasks_score = round(overdue_tasks_factor, 1)
    risk_assessment.expiring_docs_score = round(expiring_docs_factor, 1)
    risk_assessment.non_compliance_score = round(non_compliance_factor, 1)
    risk_assessment.ranked_issues = ranked_issues
    risk_assessment.suggested_actions = suggested_actions
    risk_assessment.computed_at = datetime.utcnow()

    db.commit()
    db.refresh(risk_assessment)
    return risk_assessment
