from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Application, RiskAssessment, User
from app.schemas.all_schemas import RiskAssessmentResponse
from app.services.auth_service import get_current_user, enforce_institution_access
from app.services.risk_engine import compute_application_risk

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])

@router.get("/{application_id}", response_model=RiskAssessmentResponse)
def get_risk_assessment(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    enforce_institution_access(current_user, app.institution_id)

    risk = compute_application_risk(db, application_id)
    return risk
