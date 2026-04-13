from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DocumentPermission(Base):
    __tablename__ = "document_permissions"
    __table_args__ = (
        UniqueConstraint("user_id", "document_id", name="uq_document_permissions_user_document"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    granted_by: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    can_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_update: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    can_manage_access: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship(
        back_populates="document_permissions",
        foreign_keys=[user_id],
    )
    document: Mapped["Document"] = relationship(
        back_populates="permissions",
        foreign_keys=[document_id],
    )
    granted_by_user: Mapped["User"] = relationship(
        back_populates="granted_document_permissions",
        foreign_keys=[granted_by],
    )