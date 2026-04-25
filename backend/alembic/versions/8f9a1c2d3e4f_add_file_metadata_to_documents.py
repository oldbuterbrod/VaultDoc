"""add file metadata to documents

Revision ID: 8f9a1c2d3e4f
Revises: f6a534f7aeba
Create Date: 2026-04-25 15:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8f9a1c2d3e4f"
down_revision: Union[str, Sequence[str], None] = "f6a534f7aeba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("storage_path", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("file_size", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column("checksum", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "documents",
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index("ix_documents_owner_id", "documents", ["owner_id"], unique=False)
    op.create_index("ix_documents_folder_id", "documents", ["folder_id"], unique=False)
    op.create_index(
        "uq_documents_storage_path",
        "documents",
        ["storage_path"],
        unique=True,
    )
    op.create_index("ix_documents_checksum", "documents", ["checksum"], unique=False)
    op.create_index("ix_documents_mime_type", "documents", ["mime_type"], unique=False)
    op.create_index(
        "ix_documents_owner_folder",
        "documents",
        ["owner_id", "folder_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_documents_owner_folder", table_name="documents")
    op.drop_index("ix_documents_mime_type", table_name="documents")
    op.drop_index("ix_documents_checksum", table_name="documents")
    op.drop_index("uq_documents_storage_path", table_name="documents")
    op.drop_index("ix_documents_folder_id", table_name="documents")
    op.drop_index("ix_documents_owner_id", table_name="documents")

    op.drop_column("documents", "uploaded_at")
    op.drop_column("documents", "checksum")
    op.drop_column("documents", "file_size")
    op.drop_column("documents", "storage_path")
