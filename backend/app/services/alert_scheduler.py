import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.entities import (
    Alert, AlertStatus, Application, Document, RemediationTask,
    TaskStatus, SeverityLevel, UserRole
)

logger = logging.getLogger(__name__)

def create_or_dedup_alert(
    db: Session,
    institution_id: int,
    alert_type: str,
    severity: SeverityLevel,
    title: str,
    message: str,
    dedup_key: str,
    application_id: Optional[int] = None,
    target_role: Optional[UserRole] = None,
    due_date: Optional[datetime] = None
) -> Optional[Alert]:
    """Insert alert only if deduplication key does not already exist."""
    existing = db.query(Alert).filter(Alert.deduplication_key == dedup_key).first()
    if existing:
        return existing

    alert = Alert(
        institution_id=institution_id,
        application_id=application_id,
        alert_type=alert_type,
        severity=severity,
        title=title,
        message=message,
        deduplication_key=dedup_key,
        target_role=target_role,
        due_date=due_date,
        status=AlertStatus.UNREAD,
        email_sent=False
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    logger.info(f"Created alert: [{alert_type}] {title} (Key: {dedup_key})")
    return alert

def run_deadline_and_compliance_checks():
    """
    Background job executed periodically.
    Checks:
      1. Approaching application deadlines at 30, 14, 7, and 1 days.
      2. Overdue applications.
      3. Expiring documents at 30, 14, and 7 days.
      4. Expired documents.
      5. Overdue remediation tasks.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        # 1. Check Application Deadlines
        applications = db.query(Application).filter(
            Application.submission_date == None
        ).all()

        for app in applications:
            if not app.target_deadline:
                continue
            delta = app.target_deadline - now
            days_left = delta.days

            intervals = [30, 14, 7, 1]
            for interval in intervals:
                if 0 <= days_left <= interval:
                    dedup_key = f"app_deadline_{app.id}_{interval}d"
                    sev = SeverityLevel.CRITICAL if interval <= 3 else SeverityLevel.HIGH if interval <= 7 else SeverityLevel.WARNING
                    create_or_dedup_alert(
                        db=db,
                        institution_id=app.institution_id,
                        application_id=app.id,
                        alert_type="DEADLINE_APPROACHING",
                        severity=sev,
                        title=f"Submission Deadline in {days_left} Days: {app.application_type}",
                        message=f"Application #{app.id} deadline is {app.target_deadline.strftime('%Y-%m-%d')}. Ensure all mandatory compliance reviews are finalized.",
                        dedup_key=dedup_key,
                        target_role=UserRole.INSTITUTION_ADMIN,
                        due_date=app.target_deadline
                    )

            if days_left < 0:
                dedup_key = f"app_deadline_overdue_{app.id}"
                create_or_dedup_alert(
                    db=db,
                    institution_id=app.institution_id,
                    application_id=app.id,
                    alert_type="DEADLINE_OVERDUE",
                    severity=SeverityLevel.CRITICAL,
                    title=f"CRITICAL: Application Submission Overdue!",
                    message=f"Application #{app.id} passed its target deadline of {app.target_deadline.strftime('%Y-%m-%d')}. Immediate escalation required.",
                    dedup_key=dedup_key,
                    target_role=UserRole.INSTITUTION_ADMIN,
                    due_date=app.target_deadline
                )

        # 2. Check Expiring Documents
        documents = db.query(Document).filter(
            Document.is_current_version == True,
            Document.expiry_date != None
        ).all()

        for doc in documents:
            delta = doc.expiry_date - now
            days_left = delta.days

            if days_left < 0:
                dedup_key = f"doc_expired_{doc.id}"
                create_or_dedup_alert(
                    db=db,
                    institution_id=doc.institution_id,
                    application_id=doc.application_id,
                    alert_type="DOCUMENT_EXPIRED",
                    severity=SeverityLevel.CRITICAL,
                    title=f"Regulatory Certificate Expired: {doc.title}",
                    message=f"Document '{doc.title}' expired on {doc.expiry_date.strftime('%Y-%m-%d')}. Renewal certificate must be uploaded immediately.",
                    dedup_key=dedup_key,
                    target_role=UserRole.COMPLIANCE_OFFICER,
                    due_date=doc.expiry_date
                )
            elif days_left <= 30:
                for interval in [30, 14, 7]:
                    if days_left <= interval:
                        dedup_key = f"doc_expiry_{doc.id}_{interval}d"
                        sev = SeverityLevel.HIGH if interval <= 7 else SeverityLevel.WARNING
                        create_or_dedup_alert(
                            db=db,
                            institution_id=doc.institution_id,
                            application_id=doc.application_id,
                            alert_type="DOCUMENT_EXPIRING",
                            severity=sev,
                            title=f"Certificate Expiring in {days_left} Days: {doc.title}",
                            message=f"Document '{doc.title}' will expire on {doc.expiry_date.strftime('%Y-%m-%d')}.",
                            dedup_key=dedup_key,
                            target_role=UserRole.COMPLIANCE_OFFICER,
                            due_date=doc.expiry_date
                        )

        # 3. Check Overdue Remediation Tasks
        tasks = db.query(RemediationTask).filter(
            RemediationTask.status.in_([TaskStatus.OPEN, TaskStatus.IN_PROGRESS])
        ).all()

        for task in tasks:
            if task.due_date and task.due_date < now:
                dedup_key = f"task_overdue_{task.id}"
                create_or_dedup_alert(
                    db=db,
                    institution_id=task.institution_id,
                    application_id=task.application_id,
                    alert_type="TASK_OVERDUE",
                    severity=SeverityLevel.HIGH,
                    title=f"Remediation Task Overdue: {task.title}",
                    message=f"Corrective action '{task.title}' was due on {task.due_date.strftime('%Y-%m-%d')}. Escalated to Compliance Officer.",
                    dedup_key=dedup_key,
                    target_role=UserRole.COMPLIANCE_OFFICER,
                    due_date=task.due_date
                )

    except Exception as e:
        logger.error(f"Error during alert scheduler run: {e}")
    finally:
        db.close()
