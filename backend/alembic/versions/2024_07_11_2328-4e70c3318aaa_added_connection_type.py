"""added connection type
Revision ID: 4e70c3318aaa
Revises: 1fcab2512ee2
Create Date: 2024-07-11 23:28:01.641837
"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "4e70c3318aaa"
down_revision: Union[str, None] = "1fcab2512ee2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'type' column as nullable
    op.add_column("connections", sa.Column("type", sa.String(), nullable=True))

    # Update 'type' column with values from 'dialect'
    op.execute("UPDATE connections SET type = dialect")

    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table("connections") as batch_op:
        # Recreate the column as non-nullable
        batch_op.alter_column("type", existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    # Drop the 'type' column
    with op.batch_alter_table("connections") as batch_op:
        batch_op.drop_column("type")
