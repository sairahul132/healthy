"""medicine delete + activity history

Revision ID: 9c1f4a7b2d6e
Revises: 3f72668c2b67
Create Date: 2026-09-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

import app.db.types


# revision identifiers, used by Alembic.
revision: str = '9c1f4a7b2d6e'
down_revision: Union[str, None] = '3f72668c2b67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite can't ALTER a constraint onto an existing table directly — batch
    # mode does the copy-and-move dance for us (same pattern used for
    # sharing_sessions.doctor_user_id in 7390280e3a0e).
    with op.batch_alter_table('timeline_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('related_medicine_id', app.db.types.GUID(), nullable=True))
        batch_op.create_foreign_key(
            'fk_timeline_events_related_medicine_id_medicines',
            'medicines',
            ['related_medicine_id'],
            ['id'],
            ondelete='CASCADE',
        )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('history_cleared_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('history_cleared_at')
    with op.batch_alter_table('timeline_events', schema=None) as batch_op:
        batch_op.drop_constraint(
            'fk_timeline_events_related_medicine_id_medicines', type_='foreignkey'
        )
        batch_op.drop_column('related_medicine_id')
