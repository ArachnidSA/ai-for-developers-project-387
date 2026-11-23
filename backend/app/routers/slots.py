from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.booking import Booking
from app.schemas.slot import SlotRead
from app.services.event_types import get_event_type_or_404
from app.services.slots import (
    Slot,
    business_hours,
    generate_slots,
    owner_today,
    within_booking_window,
)
from app.services.time import naive_utc

router = APIRouter()


@router.get("/event-types/{event_type_id}/slots")
def list_event_type_slots(
    event_type_id: int,
    day: Annotated[date, Query(alias="date")],
    session: Annotated[Session, Depends(get_session)],
) -> list[SlotRead]:
    """Свободные слоты типа события на календарный день в поясе владельца."""
    event_type = get_event_type_or_404(session, event_type_id, active_only=True)

    if not within_booking_window(day, owner_today()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Дата вне окна записи",
        )

    day_bounds = business_hours(day)
    # Записи хранятся как naive-UTC; сравниваем с границами дня в том же виде.
    statement = select(Booking).where(
        Booking.start < naive_utc(day_bounds.end),
        Booking.end > naive_utc(day_bounds.start),
    )
    busy = [Slot(booking.start, booking.end) for booking in session.scalars(statement)]
    slots = generate_slots(day, event_type.duration_minutes, busy)
    return [SlotRead(start=slot.start, end=slot.end) for slot in slots]
