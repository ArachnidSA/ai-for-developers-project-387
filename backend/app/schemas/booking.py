from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.services.time import as_utc


class BookingCreate(BaseModel):
    """Данные для создания записи гостем.

    `end` не передаётся: сервер вычисляет его как `start + duration_minutes` типа события.
    """

    event_type_id: int
    start: datetime
    guest_name: str = Field(min_length=1, max_length=100)
    guest_email: EmailStr | None = None
    note: str | None = Field(default=None, max_length=500)


class BookingRead(BaseModel):
    """Запись в ответе API; `start`/`end` отдаются как aware-UTC."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type_id: int
    guest_name: str
    guest_email: str | None
    note: str | None
    start: datetime
    end: datetime

    @field_validator("start", "end", mode="before")
    @classmethod
    def _to_utc(cls, value: datetime) -> datetime:
        """В БД время хранится как naive-UTC; в ответе приводим к aware-UTC."""
        return as_utc(value)


class UpcomingBookingRead(BookingRead):
    """Предстоящая запись в списке владельца: та же запись плюс название типа."""

    event_type_name: str
