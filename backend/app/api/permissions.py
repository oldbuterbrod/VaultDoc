from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.document import Document
from app.models.document_permission import DocumentPermission
from app.models.enums import UserRole
from app.models.folder import Folder
from app.models.folder_permission import FolderPermission
from app.models.user import User
from app.schemas.permission import (
    DocumentPermissionRead,
    FolderPermissionRead,
    PermissionGrant,
)
from app.services.audit_service import write_audit


router = APIRouter()


def _can_manage_folder_permissions(db: Session, current_user: User, folder: Folder) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if folder.owner_id == current_user.id:
        return True

    perm = (
        db.query(FolderPermission)
        .filter(
            FolderPermission.user_id == current_user.id,
            FolderPermission.folder_id == folder.id,
        )
        .first()
    )
    return bool(perm and perm.can_manage_access)


def _can_manage_document_permissions(db: Session, current_user: User, document: Document) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if document.owner_id == current_user.id:
        return True

    perm = (
        db.query(DocumentPermission)
        .filter(
            DocumentPermission.user_id == current_user.id,
            DocumentPermission.document_id == document.id,
        )
        .first()
    )
    return bool(perm and perm.can_manage_access)


@router.post("/folders/{folder_public_id}", response_model=FolderPermissionRead, status_code=status.HTTP_201_CREATED)
def grant_folder_permission(
    folder_public_id: str,
    payload: PermissionGrant,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    folder = db.query(Folder).filter(Folder.public_id == folder_public_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Папка не найдена")

    if not _can_manage_folder_permissions(db, current_user, folder):
        write_audit(
            db=db,
            request=request,
            action="access_denied",
            success=False,
            actor_user_id=current_user.id,
            resource_type="folder",
            resource_id=folder.id,
            resource_public_id=folder.public_id,
            details={"reason": "cannot manage folder permissions"},
        )
        raise HTTPException(status_code=403, detail="Нет доступа к управлению правами папки")

    target_user = db.query(User).filter(User.public_id == payload.user_public_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    permission = (
        db.query(FolderPermission)
        .filter(
            FolderPermission.user_id == target_user.id,
            FolderPermission.folder_id == folder.id,
        )
        .first()
    )

    created = False
    if not permission:
        permission = FolderPermission(
            user_id=target_user.id,
            folder_id=folder.id,
            granted_by=current_user.id,
        )
        db.add(permission)
        created = True

    permission.can_read = payload.can_read
    permission.can_update = payload.can_update
    permission.can_delete = payload.can_delete
    permission.can_manage_access = payload.can_manage_access
    permission.granted_by = current_user.id

    db.commit()
    db.refresh(permission)

    write_audit(
        db=db,
        request=request,
        action="folder_permission_granted" if created else "folder_permission_updated",
        success=True,
        actor_user_id=current_user.id,
        resource_type="folder",
        resource_id=folder.id,
        resource_public_id=folder.public_id,
        details={
            "target_user_id": target_user.id,
            "can_read": permission.can_read,
            "can_update": permission.can_update,
            "can_delete": permission.can_delete,
            "can_manage_access": permission.can_manage_access,
        },
    )

    return permission


@router.post("/documents/{document_public_id}", response_model=DocumentPermissionRead, status_code=status.HTTP_201_CREATED)
def grant_document_permission(
    document_public_id: str,
    payload: PermissionGrant,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(Document.public_id == document_public_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Документ не найден")

    if not _can_manage_document_permissions(db, current_user, document):
        write_audit(
            db=db,
            request=request,
            action="access_denied",
            success=False,
            actor_user_id=current_user.id,
            resource_type="document",
            resource_id=document.id,
            resource_public_id=document.public_id,
            details={"reason": "cannot manage document permissions"},
        )
        raise HTTPException(status_code=403, detail="Нет доступа к управлению правами документа")

    target_user = db.query(User).filter(User.public_id == payload.user_public_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    permission = (
        db.query(DocumentPermission)
        .filter(
            DocumentPermission.user_id == target_user.id,
            DocumentPermission.document_id == document.id,
        )
        .first()
    )

    created = False
    if not permission:
        permission = DocumentPermission(
            user_id=target_user.id,
            document_id=document.id,
            granted_by=current_user.id,
        )
        db.add(permission)
        created = True

    permission.can_read = payload.can_read
    permission.can_update = payload.can_update
    permission.can_delete = payload.can_delete
    permission.can_manage_access = payload.can_manage_access
    permission.granted_by = current_user.id

    db.commit()
    db.refresh(permission)

    write_audit(
        db=db,
        request=request,
        action="document_permission_granted" if created else "document_permission_updated",
        success=True,
        actor_user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        resource_public_id=document.public_id,
        details={
            "target_user_id": target_user.id,
            "can_read": permission.can_read,
            "can_update": permission.can_update,
            "can_delete": permission.can_delete,
            "can_manage_access": permission.can_manage_access,
        },
    )

    return permission
