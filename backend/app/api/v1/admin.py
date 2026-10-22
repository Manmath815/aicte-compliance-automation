from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, UserRole, Institution, ComplianceRule
from app.schemas.all_schemas import UserResponse, UserCreate, UserUpdate, ComplianceRuleResponse
from app.services.auth_service import get_current_user, RequireRole, get_password_hash
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/admin", tags=["Administration & Settings"])

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]))
):
    query = db.query(User)
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.filter(User.institution_id == current_user.institution_id)
    return query.all()

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]))
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    inst_id = payload.institution_id or current_user.institution_id
    if current_user.role != UserRole.SUPER_ADMIN and payload.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot create Super Admin user")

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        designation=payload.designation,
        role=payload.role,
        phone=payload.phone,
        institution_id=inst_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_audit_event(db, "USER_CREATED", "USER", str(user.id), user=current_user, after_state={"email": user.email, "role": user.role.value})
    return user

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRole([UserRole.SUPER_ADMIN, UserRole.INSTITUTION_ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if current_user.role != UserRole.SUPER_ADMIN and user.institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Cannot edit user from another institution")

    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, val)

    db.commit()
    db.refresh(user)
    log_audit_event(db, "USER_UPDATED", "USER", str(user.id), user=current_user)
    return user
