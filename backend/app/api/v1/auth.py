from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import User, UserRole
from app.schemas.all_schemas import Token, LoginRequest, UserResponse
from app.services.auth_service import verify_password, create_access_token, get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")

    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email, "role": user.role.value, "institution_id": user.institution_id}
    )
    log_audit_event(db, "USER_LOGIN", "USER", str(user.id), user=user)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/demo-login", response_model=Token)
def demo_login(role: UserRole, db: Session = Depends(get_db)):
    """One-click demo login for hackathon evaluators to effortlessly switch between the 4 personas."""
    user = db.query(User).filter(User.role == role, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No active demo user found for role {role.value}")

    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email, "role": user.role.value, "institution_id": user.institution_id}
    )
    log_audit_event(db, "DEMO_LOGIN_SWITCH", "USER", str(user.id), user=user)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_profile(current_user: User = Depends(get_current_user)):
    return current_user
