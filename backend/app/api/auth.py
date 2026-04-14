from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.dependencies.auth import get_current_user
from app.models.audit_log import AuditLog
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import LoginResponse
from app.schemas.user import UserCreate, UserRead
from app.services.audit_service import write_audit

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    write_audit(
        db=db,
        request=request,
        action="user_registered",
        success=True,
        actor_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        resource_public_id=user.public_id,
        details={"role": user.role.value},
    )

    return user


@router.post("/bootstrap-admin", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    users_count = db.query(User).count()
    if users_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bootstrap admin доступен только для первого пользователя",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.ADMIN,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    write_audit(
        db=db,
        request=request,
        action="bootstrap_admin_created",
        success=True,
        actor_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        resource_public_id=user.public_id,
        details={"role": user.role.value},
    )

    return user


@router.post("/login", response_model=LoginResponse)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username.lower()).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        write_audit(
            db=db,
            request=request,
            action="login_failed",
            success=False,
            details={"email": form_data.username.lower()},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    if not user.is_active:
        write_audit(
            db=db,
            request=request,
            action="login_failed_inactive",
            success=False,
            actor_user_id=user.id,
            details={"email": user.email},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )

    access_token = create_access_token(
        subject=str(user.public_id),
        extra={"role": user.role.value},
    )

    write_audit(
        db=db,
        request=request,
        action="login_success",
        success=True,
        actor_user_id=user.id,
        resource_type="user",
        resource_id=user.id,
        resource_public_id=user.public_id,
        details={"role": user.role.value},
    )

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


@router.get("/me", response_model=UserRead)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user