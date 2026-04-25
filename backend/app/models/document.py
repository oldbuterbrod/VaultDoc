import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_owner_id", "owner_id"),
        Index("ix_documents_folder_id", "folder_id"),
        Index("uq_documents_storage_path", "storage_path", unique=True),
        Index("ix_documents_checksum", "checksum"),
        Index("ix_documents_mime_type", "mime_type"),
        Index("ix_documents_owner_folder", "owner_id", "folder_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    public_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        default=uuid.uuid4,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)

    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("folders.id", ondelete="RESTRICT"),
        nullable=True,
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Оставляем content как совместимый текстовый атрибут
    # для текущего MVP и старых записей.
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Метаданные файла. Пока nullable на переходном этапе,
    # чтобы не ломать уже существующий create_document.
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

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

    owner: Mapped["User"] = relationship(
        back_populates="owned_documents",
        foreign_keys=[owner_id],
    )

    folder: Mapped["Folder | None"] = relationship(
        back_populates="documents",
        foreign_keys=[folder_id],
    )

    permissions: Mapped[list["DocumentPermission"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )