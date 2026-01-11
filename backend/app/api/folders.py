"""
Полный CRUD для папок
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.database import get_db
from app.models.user import User
from app.models.folder import Folder
from app.models.permission import Permission
from app.models.document import Document
from app.api.dependencies import get_current_user, require_manager

router = APIRouter()

# Pydantic схемы
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None
    description: Optional[str] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    description: Optional[str] = None

# ============ CREATE ============
@router.post("/")
async def create_folder(
    folder_data: FolderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создание новой папки"""
    try:
        # Проверяем уникальность имени в родительской папке
        if folder_data.parent_id:
            parent_folder = db.query(Folder).filter(Folder.id == folder_data.parent_id).first()
            if not parent_folder:
                raise HTTPException(status_code=404, detail="Родительская папка не найдена")
            
            # Проверяем права на создание в родительской папке
            if current_user.role != "admin" and parent_folder.owner_id != current_user.id:
                permission = db.query(Permission).filter(
                    Permission.user_id == current_user.id,
                    Permission.entity_type == "folder",
                    Permission.entity_id == parent_folder.id,
                    Permission.can_edit == True
                ).first()
                if not permission:
                    raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Создаем папку
        new_folder = Folder(
            name=folder_data.name,
            parent_id=folder_data.parent_id,
            owner_id=current_user.id,
            description=folder_data.description
        )
        
        db.add(new_folder)
        db.commit()
        db.refresh(new_folder)
        
        # Автоматически даем себе полные права
        owner_permission = Permission(
            user_id=current_user.id,
            entity_type="folder",
            entity_id=new_folder.id,
            can_view=True,
            can_edit=True,
            can_delete=True,
            access_level="owner"
        )
        db.add(owner_permission)
        db.commit()
        
        return {
            "status": "success",
            "message": "Папка успешно создана",
            "folder_id": new_folder.id,
            "folder": {
                "id": new_folder.id,
                "name": new_folder.name,
                "parent_id": new_folder.parent_id,
                "owner_id": new_folder.owner_id,
                "description": new_folder.description
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ UPDATE ============
@router.put("/{folder_id}")
async def update_folder(
    folder_id: int,
    folder_data: FolderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновление папки"""
    try:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Папка не найдена")
        
        # Проверяем права
        if current_user.role != "admin" and folder.owner_id != current_user.id:
            permission = db.query(Permission).filter(
                Permission.user_id == current_user.id,
                Permission.entity_type == "folder",
                Permission.entity_id == folder_id,
                Permission.can_edit == True
            ).first()
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Обновляем поля
        if folder_data.name is not None:
            folder.name = folder_data.name
        if folder_data.parent_id is not None:
            # Проверяем, что не делаем папку своим же родителем
            if folder_data.parent_id == folder_id:
                raise HTTPException(status_code=400, detail="Папка не может быть родителем самой себя")
            folder.parent_id = folder_data.parent_id
        if folder_data.description is not None:
            folder.description = folder_data.description
        
        folder.updated_at = db.func.now()
        db.commit()
        db.refresh(folder)
        
        return {
            "status": "success",
            "message": "Папка обновлена",
            "folder": {
                "id": folder.id,
                "name": folder.name,
                "parent_id": folder.parent_id,
                "owner_id": folder.owner_id,
                "description": folder.description
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ DELETE ============
@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)  # Только менеджер+
):
    """Удаление папки"""
    try:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Папка не найдена")
        
        # Проверяем права
        if current_user.role != "admin" and folder.owner_id != current_user.id:
            permission = db.query(Permission).filter(
                Permission.user_id == current_user.id,
                Permission.entity_type == "folder",
                Permission.entity_id == folder_id,
                Permission.can_delete == True
            ).first()
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Проверяем, есть ли подпапки
        subfolders = db.query(Folder).filter(Folder.parent_id == folder_id).count()
        if subfolders > 0:
            raise HTTPException(
                status_code=400,
                detail="Невозможно удалить папку: в ней есть подпапки. Удалите их сначала."
            )
        
        # Проверяем, есть ли документы в папке
        documents = db.query(Document).filter(Document.folder_id == folder_id).count()
        if documents > 0:
            raise HTTPException(
                status_code=400,
                detail="Невозможно удалить папку: в ней есть документы. Удалите или переместите их сначала."
            )
        
        # Удаляем права доступа к папке
        db.query(Permission).filter(
            Permission.entity_type == "folder",
            Permission.entity_id == folder_id
        ).delete()
        
        # Удаляем папку
        db.delete(folder)
        db.commit()
        
        return {
            "status": "success",
            "message": "Папка успешно удалена",
            "folder_id": folder_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ GET ONE ============
@router.get("/{folder_id}")
async def get_folder(
    folder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получение папки по ID с содержимым"""
    try:
        folder = db.query(Folder).filter(Folder.id == folder_id).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Папка не найдена")
        
        # Проверяем права
        if current_user.role != "admin" and folder.owner_id != current_user.id:
            permission = db.query(Permission).filter(
                Permission.user_id == current_user.id,
                Permission.entity_type == "folder",
                Permission.entity_id == folder_id,
                Permission.can_view == True
            ).first()
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Получаем владельца
        owner = db.query(User).filter(User.id == folder.owner_id).first()
        
        # Получаем подпапки
        subfolders = db.query(Folder).filter(Folder.parent_id == folder_id).all()
        
        # Получаем документы в папке
        documents = db.query(Document).filter(Document.folder_id == folder_id).all()
        
        return {
            "status": "success",
            "folder": {
                "id": folder.id,
                "name": folder.name,
                "description": folder.description,
                "parent_id": folder.parent_id,
                "owner_id": folder.owner_id,
                "owner_name": owner.full_name if owner else None,
                "created_at": folder.created_at,
                "updated_at": folder.updated_at,
                "subfolders_count": len(subfolders),
                "documents_count": len(documents),
                "subfolders": [
                    {
                        "id": sf.id,
                        "name": sf.name,
                        "owner_id": sf.owner_id
                    }
                    for sf in subfolders
                ],
                "documents": [
                    {
                        "id": doc.id,
                        "title": doc.title,
                        "status": doc.status,
                        "owner_id": doc.owner_id
                    }
                    for doc in documents
                ]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")
