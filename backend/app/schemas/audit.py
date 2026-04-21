from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_user_id: int | None
    action: str
    resource_type: str
    resource_id: int | None
    resource_public_id: UUID | None
    success: bool
    ip_address: str | None
    user_agent: str | None
    details: dict[str, Any]
    created_at: datetime

    @field_validator("ip_address", mode="before")
    @classmethod
    def convert_ip_address(cls, value):
        if value is None:
            return None
        return str(value)
