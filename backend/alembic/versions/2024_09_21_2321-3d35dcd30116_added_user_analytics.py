"""added user analytics

Revision ID: 3d35dcd30116
Revises: fa9cefccac47
Create Date: 2024-09-21 23:21:13.944649

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3d35dcd30116"
down_revision: Union[str, None] = "fa9cefccac47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(sa.Column("analytics_enabled", sa.Boolean(), server_default=sa.text("1"), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("analytics_enabled")
