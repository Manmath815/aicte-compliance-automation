from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    ComplianceRule, ComplianceAssessment, ComplianceRuleStatus,
    Document, DocumentVerificationStatus, DocumentCategory, Application, SeverityLevel
)

def evaluate_application_compliance(db: Session, application_id: int) -> List[ComplianceAssessment]:
    """
    Deterministic rule engine that assesses all active AICTE regulatory rules for an application.
    Matches uploaded evidence documents, verifies status, checks expiry dates, and updates assessments.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        return []

    rules = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
    documents = db.query(Document).filter(
        Document.application_id == application_id,
        Document.is_current_version == True
    ).all()

    # Map available verified documents by category
    docs_by_category: Dict[str, List[Document]] = {}
    for doc in documents:
        cat_key = doc.category.value
        if cat_key not in docs_by_category:
            docs_by_category[cat_key] = []
        docs_by_category[cat_key].append(doc)

    assessments = []

    for rule in rules:
        assessment = db.query(ComplianceAssessment).filter(
            ComplianceAssessment.application_id == application_id,
            ComplianceAssessment.rule_id == rule.id
        ).first()

        if not assessment:
            assessment = ComplianceAssessment(
                application_id=application_id,
                rule_id=rule.id,
                evaluated_by_system=True
            )
            db.add(assessment)

        # Skip automatic evaluation if manually overridden by compliance officer
        if assessment.override_by_user_id and assessment.override_reason:
            assessments.append(assessment)
            continue

        # Evaluate based on category and verification status
        rule_cat = rule.category.value
        matching_docs = docs_by_category.get(rule_cat, [])

        if not matching_docs:
            assessment.status = ComplianceRuleStatus.INCOMPLETE
            assessment.score = 0.0
            assessment.findings = f"Mandatory evidence missing: No current document uploaded for category '{rule_cat}'."
            assessment.evidence_document_id = None
        else:
            primary_doc = matching_docs[0]
            assessment.evidence_document_id = primary_doc.id

            # Check document verification status
            if primary_doc.verification_status == DocumentVerificationStatus.REJECTED:
                assessment.status = ComplianceRuleStatus.NON_COMPLIANT
                assessment.score = 15.0
                assessment.findings = f"Uploaded document '{primary_doc.title}' was rejected during internal review: {primary_doc.verification_notes or 'Fails AICTE specification'}."
            elif primary_doc.verification_status == DocumentVerificationStatus.CORRECTION_REQUESTED:
                assessment.status = ComplianceRuleStatus.NON_COMPLIANT
                assessment.score = 35.0
                assessment.findings = f"Corrections requested for '{primary_doc.title}': {primary_doc.verification_notes or 'Discrepancy identified'}."
            elif primary_doc.verification_status == DocumentVerificationStatus.PENDING:
                assessment.status = ComplianceRuleStatus.UNDER_REVIEW
                assessment.score = 60.0
                assessment.findings = f"Document '{primary_doc.title}' uploaded and extracted successfully; awaiting internal reviewer sign-off."
            elif primary_doc.expiry_date and primary_doc.expiry_date < datetime.utcnow():
                assessment.status = ComplianceRuleStatus.OUTDATED_EVIDENCE
                assessment.score = 25.0
                assessment.findings = f"Document '{primary_doc.title}' expired on {primary_doc.expiry_date.strftime('%Y-%m-%d')}. Renewal required."
            elif primary_doc.verification_status == DocumentVerificationStatus.VERIFIED:
                assessment.status = ComplianceRuleStatus.COMPLIANT
                assessment.score = 100.0
                assessment.findings = f"Compliant: Verified against {rule.official_source_title} ({rule.official_source_section}). Document '{primary_doc.title}' authenticated."

        assessment.evaluated_at = datetime.utcnow()
        assessments.append(assessment)

    db.commit()
    for ass in assessments:
        db.refresh(ass)
    return assessments
