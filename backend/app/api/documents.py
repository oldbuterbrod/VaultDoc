from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.document import Document
from app.models.document_permission import DocumentPermission
from app.models.enums import UserRole
from app.models.folder import Folder
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentRead
from app.services.access_service import (
    require_create_inside_folder_access,
    require_document_delete_access,
    require_document_read_access,
)
from app.services.audit_service import write_audit


router = APIRouter()


@router.post("/", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = None
    if payload.folder_public_id:
        folder = db.query(Folder).filter(Folder.public_id == payload.folder_public_id).first()
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Папка не найдена",
            )

        require_create_inside_folder_access(db, request, current_user, folder)

    document = Document(
        title=payload.title,
        owner_id=current_user.id,
        folder_id=folder.id if folder else None,
        content=payload.content,
        file_name=payload.file_name,
        mime_type=payload.mime_type,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    write_audit(
        db=db,
        request=request,
        action="document_created",
        success=True,
        actor_user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        resource_public_id=document.public_id,
        details={"title": document.title},
    )

    return document


@router.get("/", response_model=list[DocumentRead])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document)

    if current_user.role != UserRole.ADMIN:
        readable_document_ids = (
            db.query(DocumentPermission.document_id)
            .filter(
                DocumentPermission.user_id == current_user.id,
                or_(
                    DocumentPermission.can_read.is_(True),
                    DocumentPermission.can_update.is_(True),
                    DocumentPermission.can_delete.is_(True),
                    DocumentPermission.can_manage_access.is_(True),
                ),
            )
        )

        query = query.filter(
            or_(
                Document.owner_id == current_user.id,
                Document.id.in_(readable_document_ids),
            )
        )

    return query.order_by(Document.created_at.desc()).all()


@router.get("/{document_public_id}", response_model=DocumentRead)
def get_document(
    document_public_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(Document.public_id == document_public_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Документ не найден",
        )

    require_document_read_access(db, request, current_user, document)

    write_audit(
        db=db,
        request=request,
        action="document_read",
        success=True,
        actor_user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        resource_public_id=document.public_id,
    )

    return document


@router.delete("/{document_public_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_public_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(Document.public_id == document_public_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Документ не найден",
        )

    require_document_delete_access(db, request, current_user, document)

    document_id = document.id
    document_public_id_value = document.public_id
    document_title = document.title

    db.delete(document)
    db.commit()

    write_audit(
        db=db,
        request=request,
        action="document_deleted",
        success=True,
        actor_user_id=current_user.id,
        resource_type="document",
        resource_id=document_id,
        resource_public_id=document_public_id_value,
        details={"title": document_title},
    )
