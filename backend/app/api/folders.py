from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import ensure_content_role, get_current_user
from app.models.enums import UserRole
from app.models.folder import Folder
from app.models.folder_permission import FolderPermission
from app.models.user import User
from app.schemas.folder import FolderCreate, FolderRead
from app.services.access_service import (
    require_create_inside_folder_access,
    require_folder_delete_access,
    require_folder_read_access,
)
from app.services.audit_service import write_audit

router = APIRouter()


@router.get("/ping")
def ping():
    return {"module": "folders"}


@router.post("/", response_model=FolderRead, status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

    parent = None
    if payload.parent_public_id:
        parent = db.query(Folder).filter(Folder.public_id == payload.parent_public_id).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Родительская папка не найдена",
            )

        require_create_inside_folder_access(db, request, current_user, parent)

    folder = Folder(
        name=payload.name,
        owner_id=current_user.id,
        parent_id=parent.id if parent else None,
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    write_audit(
        db=db,
        request=request,
        action="folder_created",
        success=True,
        actor_user_id=current_user.id,
        resource_type="folder",
        resource_id=folder.id,
        resource_public_id=folder.public_id,
        details={"name": folder.name},
    )

    return folder


@router.get("/", response_model=list[FolderRead])
def list_folders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

    query = db.query(Folder)

    if current_user.role != UserRole.ADMIN:
        readable_folder_ids = (
            db.query(FolderPermission.folder_id)
            .filter(
                FolderPermission.user_id == current_user.id,
                or_(
                    FolderPermission.can_read.is_(True),
                    FolderPermission.can_update.is_(True),
                    FolderPermission.can_delete.is_(True),
                    FolderPermission.can_manage_access.is_(True),
                ),
            )
        )

        query = query.filter(
            or_(
                Folder.owner_id == current_user.id,
                Folder.id.in_(readable_folder_ids),
            )
        )

    return query.order_by(Folder.created_at.desc()).all()


@router.get("/{folder_public_id}", response_model=FolderRead)
def get_folder(
    folder_public_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

    folder = db.query(Folder).filter(Folder.public_id == folder_public_id).first()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Папка не найдена",
        )

    require_folder_read_access(db, request, current_user, folder)

    write_audit(
        db=db,
        request=request,
        action="folder_read",
        success=True,
        actor_user_id=current_user.id,
        resource_type="folder",
        resource_id=folder.id,
        resource_public_id=folder.public_id,
    )

    return folder


@router.delete("/{folder_public_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_public_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_content_role(current_user)

    folder = db.query(Folder).filter(Folder.public_id == folder_public_id).first()
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Папка не найдена",
        )

    require_folder_delete_access(db, request, current_user, folder)

    folder_id = folder.id
    folder_public_id_value = folder.public_id
    folder_name = folder.name

    db.delete(folder)
    db.commit()

    write_audit(
        db=db,
        request=request,
        action="folder_deleted",
        success=True,
        actor_user_id=current_user.id,
        resource_type="folder",
        resource_id=folder_id,
        resource_public_id=folder_public_id_value,
        details={"name": folder_name},
    )
