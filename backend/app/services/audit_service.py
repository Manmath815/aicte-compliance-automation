from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import AuditLog, User

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user: Optional[User] = None,
    institution_id: Optional[int] = None,
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """Record an immutable, append-only audit event in the system log."""
    inst_id = institution_id
    user_id = None
    if user:
        user_id = user.id
        if not inst_id:
            inst_id = user.institution_id

    audit_entry = AuditLog(
        user_id=user_id,
        institution_id=inst_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        before_state=before_state,
        after_state=after_state,
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
