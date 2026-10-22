from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import (
    Application, ApplicationStage, ApplicationTimelineEvent,
    Institution, User, UserRole, Document, ComplianceAssessment, RiskAssessment
)
from app.schemas.all_schemas import (
    ApplicationResponse, ApplicationCreate, ApplicationTransitionRequest,
    ExternalDecisionRequest, ApplicationTimelineResponse
)
from app.services.auth_service import get_current_user, RequireRole, enforce_institution_access
from app.services.audit_service import log_audit_event
from app.services.compliance_engine import evaluate_application_compliance
from app.services.risk_engine import compute_application_risk

router = APIRouter(prefix="/applications", tags=["Applications"])

# Strict sequential workflow state machine transition graph
ALLOWED_TRANSITIONS = {
    ApplicationStage.DRAFT: [ApplicationStage.DOCUMENT_COLLECTION],
    ApplicationStage.DOCUMENT_COLLECTION: [ApplicationStage.AUTOMATED_VALIDATION, ApplicationStage.DRAFT],
    ApplicationStage.AUTOMATED_VALIDATION: [ApplicationStage.OFFICER_REVIEW, ApplicationStage.DOCUMENT_COLLECTION],
    ApplicationStage.OFFICER_REVIEW: [ApplicationStage.CORRECTIONS_REQUIRED, ApplicationStage.INTERNAL_APPROVAL],
    ApplicationStage.CORRECTIONS_REQUIRED: [ApplicationStage.DOCUMENT_COLLECTION],
    ApplicationStage.INTERNAL_APPROVAL: [ApplicationStage.READY_FOR_SUBMISSION, ApplicationStage.OFFICER_REVIEW],
    ApplicationStage.READY_FOR_SUBMISSION: [ApplicationStage.SUBMITTED_MANUAL],
    ApplicationStage.SUBMITTED_MANUAL: [ApplicationStage.EXTERNAL_DECISION_RECORDED],
    ApplicationStage.EXTERNAL_DECISION_RECORDED: []
}

@router.get("/", response_model=List[ApplicationResponse])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Application)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Application.institution_id == current_user.institution_id)

    apps = query.order_by(Application.created_at.desc()).all()
    results = []
    for app in apps:
        doc_count = db.query(Document).filter(Document.application_id == app.id).count()
        risk = db.query(RiskAssessment).filter(RiskAssessment.application_id == app.id).first()
        res = ApplicationResponse.model_validate(app)
        res.institution_name = app.institution.name if app.institution else "N/A"
        res.academic_year_name = app.academic_year.name if app.academic_year else "N/A"
        res.assigned_officer_name = app.institution.users[0].full_name if app.institution and app.institution.users else "Compliance Team"
        res.assigned_reviewer_name = "Assigned Reviewer"
        res.documents_count = doc_count
        res.compliance_score = (100 - risk.overall_score) if risk else 75.0
        results.append(res)
    return results

@router.get("/{app_id}", response_model=ApplicationResponse)
def get_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    doc_count = db.query(Document).filter(Document.application_id == app.id).count()
    risk = db.query(RiskAssessment).filter(RiskAssessment.application_id == app.id).first()
    res = ApplicationResponse.model_validate(app)
    res.institution_name = app.institution.name
    res.academic_year_name = app.academic_year.name
    res.documents_count = doc_count
    res.compliance_score = (100 - risk.overall_score) if risk else 75.0
    return res

@router.post("/", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]))
):
    inst_id = payload.institution_id or current_user.institution_id
    if not inst_id:
        raise HTTPException(status_code=400, detail="Institution ID required")
    enforce_institution_access(current_user, inst_id)

    app = Application(
        institution_id=inst_id,
        academic_year_id=payload.academic_year_id,
        application_type=payload.application_type or "Extension of Approval (EoA)",
        priority=payload.priority,
        target_deadline=payload.target_deadline,
        created_by_user_id=current_user.id,
        assigned_officer_id=payload.assigned_officer_id,
        assigned_reviewer_id=payload.assigned_reviewer_id,
        current_stage=ApplicationStage.DRAFT
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Initial timeline event
    event = ApplicationTimelineEvent(
        application_id=app.id,
        from_stage=ApplicationStage.DRAFT,
        to_stage=ApplicationStage.DRAFT,
        action_by_user_id=current_user.id,
        comments="Application initialized in Draft stage."
    )
    db.add(event)
    db.commit()

    # Trigger initial compliance and risk calculation
    evaluate_application_compliance(db, app.id)
    compute_application_risk(db, app.id)

    log_audit_event(db, "APPLICATION_CREATED", "APPLICATION", str(app.id), user=current_user, after_state={"stage": "DRAFT"})
    res = ApplicationResponse.model_validate(app)
    res.institution_name = app.institution.name
    return res

@router.post("/{app_id}/transition", response_model=ApplicationResponse)
def transition_stage(
    app_id: int,
    payload: ApplicationTransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    allowed = ALLOWED_TRANSITIONS.get(app.current_stage, [])
    if payload.target_stage not in allowed and current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=400,
            detail=f"Illegal transition: Cannot move from {app.current_stage.value} directly to {payload.target_stage.value}. Permitted targets: {[s.value for s in allowed]}"
        )

    old_stage = app.current_stage
    app.current_stage = payload.target_stage
    app.updated_at = datetime.utcnow()

    timeline_event = ApplicationTimelineEvent(
        application_id=app.id,
        from_stage=old_stage,
        to_stage=payload.target_stage,
        action_by_user_id=current_user.id,
        comments=payload.comments or f"Transitioned stage to {payload.target_stage.value}"
    )
    db.add(timeline_event)
    db.commit()

    # If moved to automated validation or officer review, re-evaluate compliance
    if payload.target_stage in [ApplicationStage.AUTOMATED_VALIDATION, ApplicationStage.OFFICER_REVIEW]:
        evaluate_application_compliance(db, app.id)
        compute_application_risk(db, app.id)

    log_audit_event(
        db, "WORKFLOW_STAGE_TRANSITION", "APPLICATION", str(app.id),
        user=current_user,
        before_state={"stage": old_stage.value},
        after_state={"stage": payload.target_stage.value, "comments": payload.comments}
    )
    return app

@router.post("/{app_id}/external-decision", response_model=ApplicationResponse)
def record_external_decision(
    app_id: int,
    payload: ExternalDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]))
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    app.submission_ref_number = payload.submission_ref_number or app.submission_ref_number
    app.submission_date = payload.submission_date or datetime.utcnow()
    app.external_decision = payload.external_decision
    app.external_decision_date = payload.external_decision_date
    app.external_decision_remarks = payload.external_decision_remarks
    app.current_stage = ApplicationStage.EXTERNAL_DECISION_RECORDED
    app.updated_at = datetime.utcnow()

    event = ApplicationTimelineEvent(
        application_id=app.id,
        from_stage=ApplicationStage.SUBMITTED_MANUAL,
        to_stage=ApplicationStage.EXTERNAL_DECISION_RECORDED,
        action_by_user_id=current_user.id,
        comments=f"AICTE Official Order Recorded: {payload.external_decision}. Ref: {payload.submission_ref_number}"
    )
    db.add(event)
    db.commit()
    db.refresh(app)

    log_audit_event(db, "EXTERNAL_DECISION_RECORDED", "APPLICATION", str(app.id), user=current_user, after_state=payload.model_dump(mode="json"))
    return app

@router.get("/{app_id}/timeline", response_model=List[ApplicationTimelineResponse])
def get_timeline(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    events = db.query(ApplicationTimelineEvent).filter(
        ApplicationTimelineEvent.application_id == app_id
    ).order_by(ApplicationTimelineEvent.created_at.desc()).all()

    results = []
    for ev in events:
        res = ApplicationTimelineResponse.model_validate(ev)
        res.user_name = ev.user.full_name if ev.user else "System"
        res.user_role = ev.user.role.value if ev.user else "AUTOMATION"
        results.append(res)
    return results
