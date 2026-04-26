from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app.dependencies.auth import get_current_user
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserActivationUpdate, UserAdminCreate, UserRead
from app.services.audit_service import write_audit

router = APIRouter()


@router.get("/ping")
def ping():
    return {"module": "users"}


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {UserRole.ADMIN, UserRole.SECURITY_ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Список пользователей доступен только администратору системы и администратору безопасности",
        )

    return db.query(User).order_by(User.created_at.asc()).all()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserAdminCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Создание пользователей доступно только администратору системы",
        )

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
        role=payload.role,
        is_active=payload.is_active,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    write_audit(
        db=db,
        request=request,
        action="user_created",
        success=True,
        actor_user_id=current_user.id,
        resource_type="user",
        resource_id=user.id,
        resource_public_id=user.public_id,
        details={
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
        },
    )

    return user


@router.patch("/{user_public_id}/activation", response_model=UserRead)
def update_user_activation(
    user_public_id: str,
    payload: UserActivationUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Изменение активности пользователя доступно только администратору системы",
        )

    target_user = db.query(User).filter(User.public_id == user_public_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден",
        )

    if target_user.id == current_user.id and payload.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя деактивировать собственную учётную запись",
        )

    target_user.is_active = payload.is_active

    db.commit()
    db.refresh(target_user)

    write_audit(
        db=db,
        request=request,
        action="user_activated" if payload.is_active else "user_deactivated",
        success=True,
        actor_user_id=current_user.id,
        resource_type="user",
        resource_id=target_user.id,
        resource_public_id=target_user.public_id,
        details={
            "email": target_user.email,
            "role": target_user.role.value,
            "is_active": target_user.is_active,
        },
    )

    return target_user