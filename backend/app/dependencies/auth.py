from collections.abc import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

CONTENT_ROLES = {
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
}

SECURITY_PANEL_ROLES = {
    UserRole.ADMIN,
    UserRole.SECURITY_ADMIN,
}


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        subject = payload.get("sub")
        if subject is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.public_id == subject).first()
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Пользователь деактивирован",
        )

    return user


def ensure_roles(
    current_user: User,
    allowed_roles: Iterable[UserRole],
    detail: str = "Недостаточно прав",
) -> None:
    if current_user.role not in set(allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


def require_roles(*allowed_roles: UserRole):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        ensure_roles(current_user, allowed_roles)
        return current_user

    return dependency


def ensure_content_role(current_user: User) -> None:
    ensure_roles(
        current_user,
        CONTENT_ROLES,
        detail="Роль не имеет доступа к документам и папкам",
    )
