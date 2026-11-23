from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.event_type import EventType


class Booking(Base):
    """Факт занятия гостем слота по определённому типу события.

    Время хранится в UTC; SQLite не сохраняет смещение, поэтому `start`/`end`
    пишутся и читаются как naive-UTC (см. `app.services.slots.as_utc`).
    """

    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_type_id: Mapped[int] = mapped_column(ForeignKey("event_types.id"))
    guest_name: Mapped[str] = mapped_column(String(100))
    guest_email: Mapped[str | None] = mapped_column(String(320), default=None)
    note: Mapped[str | None] = mapped_column(String(500), default=None)
    start: Mapped[datetime] = mapped_column(DateTime())
    end: Mapped[datetime] = mapped_column(DateTime())

    event_type: Mapped[EventType] = relationship()
