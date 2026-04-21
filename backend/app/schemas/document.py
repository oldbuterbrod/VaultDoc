from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentCreate(BaseModel):
    title: str
    content: str | None = None
    file_name: str | None = None
    mime_type: str | None = None
    folder_public_id: UUID | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    public_id: UUID
    title: str
    folder_id: int | None
    owner_id: int
    content: str | None
    file_name: str | None
    mime_type: str | None
    created_at: datetime
    updated_at: datetime
