from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PermissionGrant(BaseModel):
    user_public_id: UUID
    can_read: bool = False
    can_update: bool = False
    can_delete: bool = False
    can_manage_access: bool = False


class FolderPermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    folder_id: int
    granted_by: int
    can_read: bool
    can_update: bool
    can_delete: bool
    can_manage_access: bool
    granted_at: datetime


class DocumentPermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    document_id: int
    granted_by: int
    can_read: bool
    can_update: bool
    can_delete: bool
    can_manage_access: bool
    granted_at: datetime
