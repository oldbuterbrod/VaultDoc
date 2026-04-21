from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter()


@router.get("/ping")
def ping():
    return {"module": "users"}


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Список пользователей доступен только администратору",
        )

    return db.query(User).order_by(User.created_at.asc()).all()
