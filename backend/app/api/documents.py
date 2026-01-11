"""
Полный CRUD для документов
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.folder import Folder
from app.models.permission import Permission
from app.models.comment import DocumentComment
from app.api.dependencies import get_current_user, require_manager

router = APIRouter()

# Pydantic схемы
class DocumentCreate(BaseModel):
    title: str
    content: str
    folder_id: Optional[int] = None
    status: str = "draft"

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    folder_id: Optional[int] = None
    status: Optional[str] = None

# ============ CREATE ============
@router.post("/")
async def create_document(
    document_data: DocumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Создание нового документа"""
    try:
        # Проверяем папку, если указана
        if document_data.folder_id:
            folder = db.query(Folder).filter(Folder.id == document_data.folder_id).first()
            if not folder:
                raise HTTPException(status_code=404, detail="Папка не найдена")
            
            # Проверяем права на папку
            if current_user.role != "admin" and folder.owner_id != current_user.id:
                permission = db.query(Permission).filter(
                    Permission.user_id == current_user.id,
                    Permission.entity_type == "folder",
                    Permission.entity_id == folder.id,
                    Permission.can_edit == True
                ).first()
                if not permission:
                    raise HTTPException(status_code=403, detail="Недостаточно прав для создания документа в этой папке")
        
        # Проверяем статус
        valid_statuses = ["draft", "under_review", "approved", "rejected"]
        if document_data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Неверный статус. Допустимые: {', '.join(valid_statuses)}")
        
        # Создаем документ
        new_document = Document(
            title=document_data.title,
            content=document_data.content,
            folder_id=document_data.folder_id,
            owner_id=current_user.id,
            status=document_data.status
        )
        
        db.add(new_document)
        db.commit()
        db.refresh(new_document)
        
        # Автоматически даем себе полные права
        owner_permission = Permission(
            user_id=current_user.id,
            entity_type="document",
            entity_id=new_document.id,
            can_view=True,
            can_edit=True,
            can_delete=True,
            access_level="owner"
        )
        db.add(owner_permission)
        db.commit()
        
        return {
            "status": "success",
            "message": "Документ успешно создан",
            "document_id": new_document.id,
            "document": {
                "id": new_document.id,
                "title": new_document.title,
                "status": new_document.status,
                "folder_id": new_document.folder_id,
                "owner_id": new_document.owner_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ UPDATE ============
@router.put("/{document_id}")
async def update_document(
    document_id: int,
    document_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обновление документа"""
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Документ не найден")
        
        # Проверяем права
        if current_user.role != "admin" and document.owner_id != current_user.id:
            permission = db.query(Permission).filter(
                Permission.user_id == current_user.id,
                Permission.entity_type == "document",
                Permission.entity_id == document_id,
                Permission.can_edit == True
            ).first()
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Обновляем поля
        if document_data.title is not None:
            document.title = document_data.title
        if document_data.content is not None:
            document.content = document_data.content
        if document_data.folder_id is not None:
            document.folder_id = document_data.folder_id
        if document_data.status is not None:
            valid_statuses = ["draft", "under_review", "approved", "rejected"]
            if document_data.status not in valid_statuses:
                raise HTTPException(status_code=400, detail=f"Неверный статус. Допустимые: {', '.join(valid_statuses)}")
            document.status = document_data.status
        
        document.updated_at = db.func.now()
        db.commit()
        db.refresh(document)
        
        return {
            "status": "success",
            "message": "Документ обновлен",
            "document": {
                "id": document.id,
                "title": document.title,
                "status": document.status,
                "folder_id": document.folder_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ DELETE ============
@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)  # Только менеджер+
):
    """Удаление документа"""
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Документ не найден")
        
        # Проверяем права
        if current_user.role != "admin" and document.owner_id != current_user.id:
            permission = db.query(Permission).filter(
                Permission.user_id == current_user.id,
                Permission.entity_type == "document",
                Permission.entity_id == document_id,
                Permission.can_delete == True
            ).first()
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Удаляем связанные комментарии
        db.query(DocumentComment).filter(DocumentComment.document_id == document_id).delete()
        
        # Удаляем связанные права
        db.query(Permission).filter(
            Permission.entity_type == "document",
            Permission.entity_id == document_id
        ).delete()
        
        # Удаляем документ
        db.delete(document)
        db.commit()
        
        return {
            "status": "success",
            "message": "Документ успешно удален",
            "document_id": document_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ GET ONE ============
@router.get("/{document_id}")
async def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получение документа по ID с полной информацией"""
    try:
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Документ не найден")
        
        # Проверяем права
        if current_user.role != "admin" and document.owner_id != current_user.id:
            permission = db.query(Permission).filter(
                Permission.user_id == current_user.id,
                Permission.entity_type == "document",
                Permission.entity_id == document_id,
                Permission.can_view == True
            ).first()
            if not permission:
                raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Получаем владельца
        owner = db.query(User).filter(User.id == document.owner_id).first()
        
        # Получаем папку
        folder = None
        if document.folder_id:
            folder = db.query(Folder).filter(Folder.id == document.folder_id).first()
        
        # Получаем комментарии
        comments = db.query(DocumentComment).filter(DocumentComment.document_id == document_id).all()
        comments_with_authors = []
        for comment in comments:
            author = db.query(User).filter(User.id == comment.author_id).first()
            comments_with_authors.append({
                "id": comment.id,
                "content": comment.content,
                "author_id": comment.author_id,
                "author_name": author.full_name if author else None,
                "created_at": comment.created_at
            })
        
        return {
            "status": "success",
            "document": {
                "id": document.id,
                "title": document.title,
                "content": document.content,
                "folder_id": document.folder_id,
                "folder_name": folder.name if folder else None,
                "owner_id": document.owner_id,
                "owner_name": owner.full_name if owner else None,
                "owner_email": owner.email if owner else None,
                "status": document.status,
                "created_at": document.created_at,
                "updated_at": document.updated_at,
                "comments": comments_with_authors,
                "comments_count": len(comments)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")

# ============ GET ALL ============
@router.get("/")
async def get_documents(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    folder_id: Optional[int] = None,
    owner_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получение списка документов с фильтрацией"""
    try:
        # Админ видит все
        if current_user.role == "admin":
            query = db.query(Document)
        else:
            # Обычные пользователи видят только свои и доступные
            query = db.query(Document).filter(
                (Document.owner_id == current_user.id) |
                (Document.id.in_(
                    db.query(Permission.entity_id).filter(
                        Permission.user_id == current_user.id,
                        Permission.entity_type == "document",
                        Permission.can_view == True
                    )
                ))
            )
        
        # Применяем фильтры
        if status:
            query = query.filter(Document.status == status)
        if folder_id:
            query = query.filter(Document.folder_id == folder_id)
        if owner_id:
            query = query.filter(Document.owner_id == owner_id)
        
        # Получаем документы
        documents = query.offset(skip).limit(limit).all()
        
        # Форматируем ответ
        result = []
        for doc in documents:
            owner = db.query(User).filter(User.id == doc.owner_id).first()
            folder = db.query(Folder).filter(Folder.id == doc.folder_id).first() if doc.folder_id else None
            
            result.append({
                "id": doc.id,
                "title": doc.title,
                "content_preview": doc.content[:100] + "..." if len(doc.content) > 100 else doc.content,
                "folder_id": doc.folder_id,
                "folder_name": folder.name if folder else None,
                "owner_id": doc.owner_id,
                "owner_name": owner.full_name if owner else None,
                "status": doc.status,
                "created_at": doc.created_at,
                "updated_at": doc.updated_at
            })
        
        # Общее количество
        total = query.count()
        
        return {
            "status": "success",
            "total": total,
            "skip": skip,
            "limit": limit,
            "documents": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")
