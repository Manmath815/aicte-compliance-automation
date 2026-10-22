from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Application, AuditLog, User, UserRole
from app.services.auth_service import get_current_user, enforce_institution_access
from app.services.report_service import generate_compliance_pdf_report, generate_compliance_csv_report

router = APIRouter(prefix="/reports", tags=["Reports & Audit Trail"])

@router.get("/compliance-pdf/{application_id}")
def download_pdf_report(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    pdf_bytes = generate_compliance_pdf_report(db, application_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=AICTE_Compliance_Audit_App_{application_id}.pdf"
        }
    )

@router.get("/compliance-csv/{application_id}")
def download_csv_report(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    csv_data = generate_compliance_csv_report(db, application_id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=AICTE_Compliance_Status_App_{application_id}.csv"
        }
    )

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditLog)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(AuditLog.institution_id == current_user.institution_id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "user_email": log.user.email if log.user else "System Automation",
            "user_name": log.user.full_name if log.user else "AICTE SmartFlow Engine",
            "before_state": log.before_state,
            "after_state": log.after_state,
            "created_at": log.created_at.isoformat()
        })
    return results
