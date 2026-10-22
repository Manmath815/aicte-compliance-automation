from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Alert, AlertStatus, User, UserRole
from app.schemas.all_schemas import AlertResponse, AlertAcknowledgeRequest
from app.services.auth_service import get_current_user, enforce_institution_access
from app.services.alert_scheduler import run_deadline_and_compliance_checks
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    status_filter: Optional[AlertStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(Alert.institution_id == current_user.institution_id)

    if status_filter:
        query = query.filter(Alert.status == status_filter)

    alerts = query.order_by(Alert.created_at.desc()).all()
    return alerts

@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    enforce_institution_access(current_user, alert.institution_id)

    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by_user_id = current_user.id
    db.commit()
    db.refresh(alert)

    log_audit_event(db, "ALERT_ACKNOWLEDGED", "ALERT", str(alert.id), user=current_user)
    return alert

@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    enforce_institution_access(current_user, alert.institution_id)

    alert.status = AlertStatus.RESOLVED
    db.commit()
    db.refresh(alert)

    log_audit_event(db, "ALERT_RESOLVED", "ALERT", str(alert.id), user=current_user)
    return alert

@router.post("/trigger-checks")
def trigger_checks_manually(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger background scheduled checks immediately for demonstration."""
    run_deadline_and_compliance_checks()
    return {"status": "success", "message": "Deadline, document expiry, and remediation alert checks completed."}
