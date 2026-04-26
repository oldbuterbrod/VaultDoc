from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import ensure_content_role, get_current_user
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
from app.services.document_service import (
    delete_stored_file,
    resolve_stored_file_path,
    save_uploaded_document_file,
)

router = APIRouter()


@router.get("/ping")
def ping():
    return {"module": "documents"}


@router.post("/", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

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
        storage_path=None,
        file_size=None,
        checksum=None,
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


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    title: str | None = Form(None),
    folder_public_id: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

    folder = None

    if folder_public_id:
        folder = db.query(Folder).filter(Folder.public_id == folder_public_id).first()
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Папка не найдена",
            )

        require_create_inside_folder_access(db, request, current_user, folder)

    file_meta = await save_uploaded_document_file(file)

    document_title = (
        title.strip()
        if title and title.strip()
        else Path(str(file_meta["original_file_name"])).stem
    )

    document = Document(
        title=document_title,
        owner_id=current_user.id,
        folder_id=folder.id if folder else None,
        content=None,
        file_name=str(file_meta["original_file_name"]),
        mime_type=str(file_meta["mime_type"]),
        storage_path=str(file_meta["storage_path"]),
        file_size=int(file_meta["file_size"]),
        checksum=str(file_meta["checksum"]),
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)
    except Exception:
        db.rollback()
        delete_stored_file(str(file_meta["storage_path"]))
        raise

    write_audit(
        db=db,
        request=request,
        action="document_uploaded",
        success=True,
        actor_user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        resource_public_id=document.public_id,
        details={
            "title": document.title,
            "file_name": document.file_name,
            "mime_type": document.mime_type,
            "file_size": document.file_size,
        },
    )

    return document


@router.get("/", response_model=list[DocumentRead])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

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


@router.get("/{document_public_id}/download")
def download_document(
    document_public_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

    document = db.query(Document).filter(Document.public_id == document_public_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Документ не найден",
        )

    require_document_read_access(db, request, current_user, document)

    if not document.storage_path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="У документа нет загруженного файла",
        )

    file_path = resolve_stored_file_path(document.storage_path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Файл документа не найден на диске",
        )

    write_audit(
        db=db,
        request=request,
        action="document_downloaded",
        success=True,
        actor_user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        resource_public_id=document.public_id,
        details={
            "title": document.title,
            "file_name": document.file_name,
        },
    )

    return FileResponse(
        path=file_path,
        filename=document.file_name or f"{document.title}",
        media_type=document.mime_type or "application/octet-stream",
    )


@router.get("/{document_public_id}", response_model=DocumentRead)
def get_document(
    document_public_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

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
    ensure_content_role(current_user)

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
    storage_path = document.storage_path

    db.delete(document)
    db.commit()

    delete_stored_file(storage_path)

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