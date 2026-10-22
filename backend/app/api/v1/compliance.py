from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import (
    ComplianceRule, ComplianceAssessment, RemediationTask, Application,
    User, UserRole, TaskStatus, ComplianceRuleStatus
)
from app.schemas.all_schemas import (
    ComplianceRuleResponse, ComplianceAssessmentResponse, ComplianceOverrideRequest,
    RemediationTaskCreate, RemediationTaskUpdate, RemediationTaskResponse
)
from app.services.auth_service import get_current_user, RequireRole, enforce_institution_access
from app.services.audit_service import log_audit_event
from app.services.compliance_engine import evaluate_application_compliance
from app.services.risk_engine import compute_application_risk

router = APIRouter(prefix="/compliance", tags=["Compliance"])

@router.get("/rules", response_model=List[ComplianceRuleResponse])
def get_compliance_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve versioned regulatory rules based on AICTE Approval Process Handbooks."""
    rules = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
    return rules

@router.get("/assessments/{application_id}", response_model=List[ComplianceAssessmentResponse])
def get_assessments(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    assessments = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.application_id == application_id
    ).all()

    # If assessments don't exist yet, evaluate immediately
    if not assessments:
        assessments = evaluate_application_compliance(db, application_id)
        compute_application_risk(db, application_id)

    results = []
    for a in assessments:
        res = ComplianceAssessmentResponse.model_validate(a)
        res.evidence_document_title = a.evidence_document.title if a.evidence_document else None
        res.remediation_tasks = [
            RemediationTaskResponse.model_validate(t) for t in a.remediation_tasks
        ]
        results.append(res)
    return results

@router.post("/evaluate/{application_id}", response_model=List[ComplianceAssessmentResponse])
def run_evaluation(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    assessments = evaluate_application_compliance(db, application_id)
    compute_application_risk(db, application_id)
    log_audit_event(db, "COMPLIANCE_EVALUATION_TRIGGERED", "APPLICATION", str(application_id), user=current_user)
    return get_assessments(application_id, db, current_user)

@router.post("/assessments/{assessment_id}/override", response_model=ComplianceAssessmentResponse)
def override_assessment(
    assessment_id: int,
    payload: ComplianceOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.COMPLIANCE_OFFICER]))
):
    assessment = db.query(ComplianceAssessment).filter(ComplianceAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    enforce_institution_access(current_user, assessment.application.institution_id)

    before_status = assessment.status
    assessment.status = payload.new_status
    assessment.override_by_user_id = current_user.id
    assessment.override_reason = payload.override_reason
    assessment.evaluated_at = datetime.utcnow()
    db.commit()

    compute_application_risk(db, assessment.application_id)
    log_audit_event(
        db, "COMPLIANCE_ASSESSMENT_OVERRIDE", "ASSESSMENT", str(assessment.id),
        user=current_user,
        before_state={"status": before_status.value},
        after_state={"status": payload.new_status.value, "reason": payload.override_reason}
    )
    return assessment

# ================= Remediation Tasks =================
@router.get("/tasks/{application_id}", response_model=List[RemediationTaskResponse])
def get_remediation_tasks(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    tasks = db.query(RemediationTask).filter(
        RemediationTask.application_id == application_id
    ).order_by(RemediationTask.due_date.asc()).all()

    results = []
    for t in tasks:
        res = RemediationTaskResponse.model_validate(t)
        res.assigned_to_name = t.assignee.full_name if t.assignee else "Unassigned"
        results.append(res)
    return results

@router.post("/tasks", response_model=RemediationTaskResponse, status_code=status.HTTP_201_CREATED)
def create_remediation_task(
    payload: RemediationTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN, UserRole.COMPLIANCE_OFFICER]))
):
    app = db.query(Application).filter(Application.id == payload.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    task = RemediationTask(
        assessment_id=payload.assessment_id,
        application_id=payload.application_id,
        institution_id=app.institution_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        status=TaskStatus.OPEN,
        assigned_to_user_id=payload.assigned_to_user_id,
        created_by_user_id=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    compute_application_risk(db, app.id)
    log_audit_event(db, "REMEDIATION_TASK_CREATED", "REMEDIATION_TASK", str(task.id), user=current_user, after_state=payload.model_dump(mode="json"))

    res = RemediationTaskResponse.model_validate(task)
    res.assigned_to_name = task.assignee.full_name if task.assignee else "Unassigned"
    return res

@router.put("/tasks/{task_id}", response_model=RemediationTaskResponse)
def update_remediation_task(
    task_id: int,
    payload: RemediationTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(RemediationTask).filter(RemediationTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Remediation task not found")
    enforce_institution_access(current_user, task.institution_id)

    before_status = task.status
    if payload.status:
        task.status = payload.status
        if payload.status == TaskStatus.RESOLVED:
            task.resolved_at = datetime.utcnow()
    if payload.resolution_notes:
        task.resolution_notes = payload.resolution_notes
    if payload.assigned_to_user_id:
        task.assigned_to_user_id = payload.assigned_to_user_id

    db.commit()
    db.refresh(task)

    compute_application_risk(db, task.application_id)
    log_audit_event(
        db, "REMEDIATION_TASK_UPDATED", "REMEDIATION_TASK", str(task.id),
        user=current_user,
        before_state={"status": before_status.value},
        after_state={"status": task.status.value, "notes": task.resolution_notes}
    )

    res = RemediationTaskResponse.model_validate(task)
    res.assigned_to_name = task.assignee.full_name if task.assignee else "Unassigned"
    return res
