from enum import StrEnum

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EventTypeStatus(StrEnum):
    """Статус типа события: действующий или архивный."""

    active = "active"
    archived = "archived"


class EventType(Base):
    """Вид встречи, который заводит владелец."""

    __tablename__ = "event_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(500), default="")
    duration_minutes: Mapped[int] = mapped_column()
    status: Mapped[str] = mapped_column(String(20), default=EventTypeStatus.active)
