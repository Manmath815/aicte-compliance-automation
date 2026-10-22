from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import Institution, AcademicYear, User, UserRole
from app.schemas.all_schemas import (
    InstitutionResponse, InstitutionCreate, InstitutionUpdate, AcademicYearResponse
)
from app.services.auth_service import get_current_user, RequireRole, enforce_institution_access
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.get("/", response_model=List[InstitutionResponse])
def list_institutions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.SUPER_ADMIN:
        return db.query(Institution).all()
    return db.query(Institution).filter(Institution.id == current_user.institution_id).all()

@router.get("/academic-years/all", response_model=List[AcademicYearResponse])
def get_academic_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(AcademicYear).order_by(AcademicYear.name.desc()).all()

@router.get("/{institution_id}", response_model=InstitutionResponse)
def get_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    enforce_institution_access(current_user, institution_id)
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    return inst

@router.post("/", response_model=InstitutionResponse, status_code=status.HTTP_201_CREATED)
def create_institution(
    payload: InstitutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN]))
):
    existing = db.query(Institution).filter(Institution.aicte_id == payload.aicte_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Institution with this AICTE ID already exists")

    inst = Institution(**payload.model_dump())
    db.add(inst)
    db.commit()
    db.refresh(inst)
    log_audit_event(db, "INSTITUTION_REGISTERED", "INSTITUTION", str(inst.id), user=current_user, after_state=payload.model_dump())
    return inst

@router.put("/{institution_id}", response_model=InstitutionResponse)
def update_institution(
    institution_id: int,
    payload: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]))
):
    enforce_institution_access(current_user, institution_id)
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    before_state = {"name": inst.name, "contact_phone": inst.contact_phone, "address": inst.address}
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(inst, field, val)

    db.commit()
    db.refresh(inst)
    log_audit_event(db, "INSTITUTION_UPDATED", "INSTITUTION", str(inst.id), user=current_user, before_state=before_state, after_state=payload.model_dump())
    return inst
