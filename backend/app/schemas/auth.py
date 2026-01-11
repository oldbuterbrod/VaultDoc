"""
Pydantic схемы для аутентификации
"""
from pydantic import BaseModel

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "employee"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
