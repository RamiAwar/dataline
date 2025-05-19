"""add_hide_sql_user_setting

Revision ID: ca20728c080d
Revises: 3d35dcd30116
Create Date: 2025-05-19 08:34:13.645769

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca20728c080d'
down_revision: Union[str, None] = '3d35dcd30116'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(sa.Column("hide_sql_preference", sa.Boolean(), server_default=sa.text("0"), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("hide_sql_preference")
