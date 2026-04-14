from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FolderCreate(BaseModel):
    name: str
    parent_public_id: UUID | None = None


class FolderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    public_id: UUID
    name: str
    owner_id: int
    parent_id: int | None
    created_at: datetime
    updated_at: datetime
