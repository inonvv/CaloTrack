"""add body measurements to profiles

Revision ID: b3c7e1a9d4f2
Revises: 5da2f4be12a7
Create Date: 2026-02-24 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3c7e1a9d4f2'
down_revision: Union[str, None] = '5da2f4be12a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('profiles', sa.Column('waist_cm', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('neck_cm', sa.Float(), nullable=True))
    op.add_column('profiles', sa.Column('hip_cm', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('profiles', 'hip_cm')
    op.drop_column('profiles', 'neck_cm')
    op.drop_column('profiles', 'waist_cm')
