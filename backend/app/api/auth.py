"""
Эндпоинты для аутентификации
"""
from datetime import timedelta
from typing import Annotated, Union
from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister, Token
from app.schemas.user import UserResponse
from app.api.dependencies import get_current_user

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    login_data: Union[UserLogin, None] = None,
    username: Annotated[str, Form()] = None,
    password: Annotated[str, Form()] = None,
    db: Session = Depends(get_db)
):
    """Аутентификация пользователя (поддерживает JSON и форму)"""
    # Определяем откуда брать данные
    if login_data:
        # Если пришел JSON
        email = login_data.email
        password_input = login_data.password
    else:
        # Если пришла форма
        email = username
        password_input = password
    
    if not email or not password_input:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email и пароль обязательны"
        )
    
    # Ищем пользователя по email
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Auttainticate": "Bearer"},
        )
    
    # Проверяем пароль
    if not verify_password(password_input, user.password_hash):
        # Для отладки покажем хеш
        print(f"Пароль: {password_input}")
        print(f"Хеш в БД: {user.password_hash}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь заблокирован"
        )
    
    # Создаем токен
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"user_id": user.id, "email": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/login_json", response_model=Token)
async def login_json(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """Аутентификация через JSON (альтернативный эндпоинт)"""
    return await login(login_data=login_data, db=db)

@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """Регистрация нового пользователя"""
    # Проверяем, существует ли пользователь с таким email
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Создаем нового пользователя
    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user)
):
    """Получить информацию о текущем пользователе"""
    return current_user
