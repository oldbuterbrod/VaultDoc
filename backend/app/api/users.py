"""
Полный CRUD для пользователей (только для администраторов)
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.folder import Folder
from app.models.permission import Permission
from app.models.comment import DocumentComment
from app.api.dependencies import get_current_user, require_admin
from app.core.security import get_password_hash

router = APIRouter()

# Pydantic схемы
class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "employee"

# ============ UPDATE USER ============
@router.put("/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # Только админ
):
    """Обновление информации о пользователе"""
    try:
        # Находим пользователя
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Проверяем, что не изменяем самого себя на неактивного
        if user.id == current_user.id and user_data.is_active is False:
            raise HTTPException(status_code=400, detail="Нельзя деактивировать самого себя")
        
        # Обновляем поля
        if user_data.full_name is not None:
            user.full_name = user_data.full_name
        if user_data.role is not None:
            # Проверяем валидность роли
            valid_roles = ["admin", "manager", "employee"]
            if user_data.role not in valid_roles:
                raise HTTPException(status_code=400, detail=f"Неверная роль. Допустимые: {', '.join(valid_roles)}")
            user.role = user_data.role
        if user_data.is_active is not None:
            user.is_active = user_data.is_active
        if user_data.password is not None:
            if len(user_data.password) < 6:
                raise HTTPException(status_code=400, detail="Пароль должен быть не менее 6 символов")
            user.password_hash = get_password_hash(user_data.password)
        
        db.commit()
        db.refresh(user)
        
        return {
            "status": "success",
            "message": "Пользователь обновлен",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ DELETE USER ============
@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # Только админ
):
    """Удаление пользователя"""
    try:
        # Находим пользователя
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Нельзя удалить самого себя
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
        
        # Проверяем, есть ли у пользователя документы или папки
        documents_count = db.query(Document).filter(Document.owner_id == user_id).count()
        folders_count = db.query(Folder).filter(Folder.owner_id == user_id).count()
        
        if documents_count > 0 or folders_count > 0:
            # Вместо удаления деактивируем пользователя
            user.is_active = False
            db.commit()
            
            return {
                "status": "success",
                "message": f"Пользователь деактивирован (у него {documents_count} документов и {folders_count} папок)",
                "user_id": user_id,
                "action": "deactivated"
            }
        
        # Если нет связанных данных - удаляем
        # Удаляем комментарии пользователя
        db.query(DocumentComment).filter(DocumentComment.author_id == user_id).delete()
        
        # Удаляем права доступа пользователя
        db.query(Permission).filter(Permission.user_id == user_id).delete()
        
        # Удаляем пользователя
        db.delete(user)
        db.commit()
        
        return {
            "status": "success",
            "message": "Пользователь полностью удален",
            "user_id": user_id,
            "action": "deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ GET USER BY ID ============
@router.get("/{user_id}")
async def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получение пользователя по ID"""
    try:
        # Проверяем права: пользователь может видеть только себя, админ - всех
        if current_user.role != "admin" and current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Статистика пользователя
        documents_count = db.query(Document).filter(Document.owner_id == user_id).count()
        folders_count = db.query(Folder).filter(Folder.owner_id == user_id).count()
        comments_count = db.query(DocumentComment).filter(DocumentComment.author_id == user_id).count()
        
        return {
            "status": "success",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "statistics": {
                    "documents": documents_count,
                    "folders": folders_count,
                    "comments": comments_count
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ GET ALL USERS ============
@router.get("/")
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # Только админ
):
    """Получение списка всех пользователей (с фильтрацией)"""
    try:
        query = db.query(User)
        
        # Применяем фильтры
        if role:
            query = query.filter(User.role == role)
        if is_active is not None:
            query = query.filter(User.is_active == is_active)
        
        # Получаем пользователей
        users = query.offset(skip).limit(limit).all()
        
        # Форматируем ответ
        result = []
        for user in users:
            # Статистика для каждого пользователя
            documents_count = db.query(Document).filter(Document.owner_id == user.id).count()
            folders_count = db.query(Folder).filter(Folder.owner_id == user.id).count()
            
            result.append({
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "statistics": {
                    "documents": documents_count,
                    "folders": folders_count
                }
            })
        
        # Общее количество
        total = query.count()
        
        return {
            "status": "success",
            "total": total,
            "skip": skip,
            "limit": limit,
            "users": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")
