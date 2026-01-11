"""
Зависимости (dependencies) для проверки аутентификации и прав
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token, get_user_id_from_token
from app.models.user import User
from app.models.document import Document
from app.models.folder import Folder
from app.models.permission import Permission

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Получение текущего пользователя из токена"""
    token = credentials.credentials
    
    user_id = get_user_id_from_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или заблокирован",
        )
    
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    """Проверка что пользователь активен"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Пользователь заблокирован")
    return current_user

def require_admin(current_user: User = Depends(get_current_user)):
    """Требование роли администратора"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуется роль администратора"
        )
    return current_user

def require_manager(current_user: User = Depends(get_current_user)):
    """Требование роли менеджера или администратора"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуется роль менеджера или администратора"
        )
    return current_user
