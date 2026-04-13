"""
Модуль для работы с безопасностью: JWT, хеширование паролей (упрощенная версия)
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
from app.core.config import settings

# Упрощенное хеширование паролей (для теста, в продакшене используй bcrypt!)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля через обычный sha256"""
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def get_password_hash(password: str) -> str:
    """Хеширование пароля через обычный sha256"""
    return hashlib.sha256(password.encode()).hexdigest()

# Функции для работы с JWT токенами
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Создание JWT токена"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    """Декодирование JWT токена"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

def get_user_id_from_token(token: str) -> Optional[int]:
    """Получение ID пользователя из токена"""
    payload = decode_token(token)
    if payload and "user_id" in payload:
        return payload["user_id"]
    return None
