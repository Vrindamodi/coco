"""add alerts

Revision ID: 004
Revises: 003
Create Date: 2026-09-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "004"

down_revision: Union[str, None] = "003"

branch_labels: Union[str, Sequence[str], None] = None

depends_on: Union[str, Sequence[str], None] = None


alerttype = postgresql.ENUM(
    "cognitive_decline",
    "inactivity",
    "missed_reminder",
    name="alerttype",
    create_type=False,
)
alertseverity = postgresql.ENUM(
    "low",
    "medium",
    "high",
    name="alertseverity",
    create_type=False,
)
alertstatus = postgresql.ENUM(
    "active",
    "acknowledged",
    "resolved",
    name="alertstatus",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    sa.Enum(
        "cognitive_decline",
        "inactivity",
        "missed_reminder",
        name="alerttype",
    ).create(bind, checkfirst=True)
    sa.Enum(
        "low",
        "medium",
        "high",
        name="alertseverity",
    ).create(bind, checkfirst=True)
    sa.Enum(
        "active",
        "acknowledged",
        "resolved",
        name="alertstatus",
    ).create(bind, checkfirst=True)

    op.create_table(
        "alerts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("caregiver_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("alert_type", alerttype, nullable=False),
        sa.Column("severity", alertseverity, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "status",
            alertstatus,
            nullable=False,
            server_default="active",
        ),
        sa.Column("source_ref", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["caregiver_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alerts_patient_id"), "alerts", ["patient_id"])
    op.create_index(op.f("ix_alerts_caregiver_id"), "alerts", ["caregiver_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_alerts_caregiver_id"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_patient_id"), table_name="alerts")
    op.drop_table("alerts")

    bind = op.get_bind()
    sa.Enum(name="alertstatus").drop(bind, checkfirst=True)
    sa.Enum(name="alertseverity").drop(bind, checkfirst=True)
    sa.Enum(name="alerttype").drop(bind, checkfirst=True)
