"""add sync operations

Revision ID: 003
Revises: 9579a831a845
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sync_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation_id", sa.String(length=100), nullable=False),
        sa.Column("device_id", sa.String(length=255), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation_type", sa.String(length=50), nullable=False),
        sa.Column("payload", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("client_timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("device_id", "operation_id", name="uq_sync_device_operation"),
    )
    op.create_index(op.f("ix_sync_operations_device_id"), "sync_operations", ["device_id"])
    op.create_index(op.f("ix_sync_operations_patient_id"), "sync_operations", ["patient_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_sync_operations_patient_id"), table_name="sync_operations")
    op.drop_index(op.f("ix_sync_operations_device_id"), table_name="sync_operations")
    op.drop_table("sync_operations")
