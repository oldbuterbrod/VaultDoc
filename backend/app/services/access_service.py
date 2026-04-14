from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_permission import DocumentPermission
from app.models.enums import UserRole
from app.models.folder import Folder
from app.models.folder_permission import FolderPermission
from app.models.user import User
from app.services.audit_service import write_audit


def _deny(
    db: Session,
    request: Request,
    current_user: User,
    resource_type: str,
    resource_id: int | None,
    resource_public_id,
    reason: str,
    detail: str,
) -> None:
    write_audit(
        db=db,
        request=request,
        action="access_denied",
        success=False,
        actor_user_id=current_user.id,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_public_id=resource_public_id,
        details={"reason": reason},
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


def _folder_perm(db: Session, user_id: int, folder_id: int) -> FolderPermission | None:
    return (
        db.query(FolderPermission)
        .filter(
            FolderPermission.user_id == user_id,
            FolderPermission.folder_id == folder_id,
        )
        .first()
    )


def _document_perm(db: Session, user_id: int, document_id: int) -> DocumentPermission | None:
    return (
        db.query(DocumentPermission)
        .filter(
            DocumentPermission.user_id == user_id,
            DocumentPermission.document_id == document_id,
        )
        .first()
    )


def can_read_folder(db: Session, current_user: User, folder: Folder) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if folder.owner_id == current_user.id:
        return True

    perm = _folder_perm(db, current_user.id, folder.id)
    if not perm:
        return False

    return any(
        [
            perm.can_read,
            perm.can_update,
            perm.can_delete,
            perm.can_manage_access,
        ]
    )


def can_delete_folder(db: Session, current_user: User, folder: Folder) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if folder.owner_id == current_user.id:
        return True

    perm = _folder_perm(db, current_user.id, folder.id)
    return bool(perm and perm.can_delete)


def can_create_inside_folder(db: Session, current_user: User, folder: Folder) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if folder.owner_id == current_user.id:
        return True

    perm = _folder_perm(db, current_user.id, folder.id)
    return bool(perm and (perm.can_update or perm.can_manage_access))


def can_read_document(db: Session, current_user: User, document: Document) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if document.owner_id == current_user.id:
        return True

    perm = _document_perm(db, current_user.id, document.id)
    if not perm:
        return False

    return any(
        [
            perm.can_read,
            perm.can_update,
            perm.can_delete,
            perm.can_manage_access,
        ]
    )


def can_delete_document(db: Session, current_user: User, document: Document) -> bool:
    if current_user.role == UserRole.ADMIN:
        return True
    if document.owner_id == current_user.id:
        return True

    perm = _document_perm(db, current_user.id, document.id)
    return bool(perm and perm.can_delete)


def require_folder_read_access(
    db: Session,
    request: Request,
    current_user: User,
    folder: Folder,
) -> None:
    if not can_read_folder(db, current_user, folder):
        _deny(
            db=db,
            request=request,
            current_user=current_user,
            resource_type="folder",
            resource_id=folder.id,
            resource_public_id=folder.public_id,
            reason="read forbidden",
            detail="Нет доступа к папке",
        )


def require_folder_delete_access(
    db: Session,
    request: Request,
    current_user: User,
    folder: Folder,
) -> None:
    if not can_delete_folder(db, current_user, folder):
        _deny(
            db=db,
            request=request,
            current_user=current_user,
            resource_type="folder",
            resource_id=folder.id,
            resource_public_id=folder.public_id,
            reason="delete forbidden",
            detail="Нет доступа к удалению папки",
        )


def require_create_inside_folder_access(
    db: Session,
    request: Request,
    current_user: User,
    folder: Folder,
) -> None:
    if not can_create_inside_folder(db, current_user, folder):
        _deny(
            db=db,
            request=request,
            current_user=current_user,
            resource_type="folder",
            resource_id=folder.id,
            resource_public_id=folder.public_id,
            reason="cannot create inside folder",
            detail="Нет доступа к папке",
        )


def require_document_read_access(
    db: Session,
    request: Request,
    current_user: User,
    document: Document,
) -> None:
    if not can_read_document(db, current_user, document):
        _deny(
            db=db,
            request=request,
            current_user=current_user,
            resource_type="document",
            resource_id=document.id,
            resource_public_id=document.public_id,
            reason="read forbidden",
            detail="Нет доступа к документу",
        )


def require_document_delete_access(
    db: Session,
    request: Request,
    current_user: User,
    document: Document,
) -> None:
    if not can_delete_document(db, current_user, document):
        _deny(
            db=db,
            request=request,
            current_user=current_user,
            resource_type="document",
            resource_id=document.id,
            resource_public_id=document.public_id,
            reason="delete forbidden",
            detail="Нет доступа к удалению документа",
        )
