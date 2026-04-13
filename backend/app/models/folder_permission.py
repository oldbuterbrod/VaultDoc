from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class FolderPermission(Base):
    __tablename__ = "folder_permissions"
    __table_args__ = (
        UniqueConstraint("user_id", "folder_id", name="uq_folder_permissions_user_folder"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    folder_id: Mapped[int] = mapped_column(
        ForeignKey("folders.id", ondelete="CASCADE"),
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
        back_populates="folder_permissions",
        foreign_keys=[user_id],
    )
    folder: Mapped["Folder"] = relationship(
        back_populates="permissions",
        foreign_keys=[folder_id],
    )
    granted_by_user: Mapped["User"] = relationship(
        back_populates="granted_folder_permissions",
        foreign_keys=[granted_by],
    )