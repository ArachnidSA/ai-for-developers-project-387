from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.schemas.booking import BookingCreate
from app.services.event_types import get_event_type_or_404
from app.services.overlap import overlaps
from app.services.slots import (
    OWNER_TIMEZONE,
    business_hours,
    owner_today,
    within_booking_window,
)
from app.services.time import as_utc, naive_utc


def create_booking(session: Session, payload: BookingCreate) -> Booking:
    """Создаёт запись гостя, проверяя все доменные правила слота.

    Роутер остаётся тонким: тип события, окно записи, рабочие часы и непересечение
    с другими записями проверяются здесь, единым сообщением об ошибке на каждый случай.
    """
    event_type = get_event_type_or_404(session, payload.event_type_id, active_only=True)

    start = as_utc(payload.start)
    end = start + timedelta(minutes=event_type.duration_minutes)
    # В БД время хранится как naive-UTC, поэтому и сравнения ведём в том же виде.
    start_naive = naive_utc(start)
    end_naive = naive_utc(end)

    # Рабочие часы и окно записи считаются в поясе владельца (ADR-0002).
    day = start.astimezone(OWNER_TIMEZONE).date()
    if not within_booking_window(day, owner_today()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Время вне окна записи")

    day_bounds = business_hours(day)
    if start < day_bounds.start or end > day_bounds.end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Время вне рабочих часов",
        )

    # Полуинтервалы [start, end): пересечение, если booking.start < end и start < booking.end.
    # SQL сужает кандидатов, решение принимает единый помощник `overlaps`.
    candidates = session.scalars(
        select(Booking).where(Booking.start < end_naive, Booking.end > start_naive)
    )
    if any(overlaps(start_naive, end_naive, item.start, item.end) for item in candidates):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Это время уже занято, выберите другой слот",
        )

    booking = Booking(
        event_type_id=event_type.id,
        guest_name=payload.guest_name,
        guest_email=payload.guest_email,
        note=payload.note,
        start=start_naive,
        end=end_naive,
    )
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking
