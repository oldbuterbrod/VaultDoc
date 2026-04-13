import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
    SAEnum(
        UserRole,
        name="user_role",
        values_callable=lambda enum_cls: [item.value for item in enum_cls],
    ),
    nullable=False,
    default=UserRole.EMPLOYEE,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    owned_folders: Mapped[list["Folder"]] = relationship(
        back_populates="owner",
        foreign_keys="Folder.owner_id",
    )
    owned_documents: Mapped[list["Document"]] = relationship(
        back_populates="owner",
        foreign_keys="Document.owner_id",
    )

    folder_permissions: Mapped[list["FolderPermission"]] = relationship(
        back_populates="user",
        foreign_keys="FolderPermission.user_id",
        cascade="all, delete-orphan",
    )
    document_permissions: Mapped[list["DocumentPermission"]] = relationship(
        back_populates="user",
        foreign_keys="DocumentPermission.user_id",
        cascade="all, delete-orphan",
    )

    granted_folder_permissions: Mapped[list["FolderPermission"]] = relationship(
        back_populates="granted_by_user",
        foreign_keys="FolderPermission.granted_by",
    )
    granted_document_permissions: Mapped[list["DocumentPermission"]] = relationship(
        back_populates="granted_by_user",
        foreign_keys="DocumentPermission.granted_by",
    )

    audit_events: Mapped[list["AuditLog"]] = relationship(
        back_populates="actor_user",
        foreign_keys="AuditLog.actor_user_id",
    )