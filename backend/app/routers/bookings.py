from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_session
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingRead, UpcomingBookingRead
from app.services.bookings import create_booking as create_booking_record
from app.services.time import naive_utc

router = APIRouter()


@router.get("/bookings", response_model_exclude_none=True)
def list_upcoming_bookings(
    session: Annotated[Session, Depends(get_session)],
) -> list[UpcomingBookingRead]:
    """Предстоящие записи всех типов (в том числе архивных), по возрастанию начала.

    «Прошедшая» запись — та, что уже закончилась (`end` в прошлом). Время в БД —
    naive-UTC; в ответе поля приводятся к aware-UTC схемой.
    """
    now = naive_utc(datetime.now(UTC))
    bookings = session.scalars(
        select(Booking)
        .where(Booking.end > now)
        .order_by(Booking.start)
        .options(selectinload(Booking.event_type))
    ).all()
    return [
        UpcomingBookingRead(
            id=booking.id,
            event_type_id=booking.event_type_id,
            event_type_name=booking.event_type.name,
            guest_name=booking.guest_name,
            guest_email=booking.guest_email,
            note=booking.note,
            start=booking.start,
            end=booking.end,
        )
        for booking in bookings
    ]


@router.post("/bookings", status_code=status.HTTP_201_CREATED, response_model_exclude_none=True)
def create_booking(
    payload: BookingCreate,
    session: Annotated[Session, Depends(get_session)],
) -> BookingRead:
    """Создать запись гостем: доменные правила слота проверяет сервис."""
    return BookingRead.model_validate(create_booking_record(session, payload))


@router.delete("/bookings/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """Удалить запись, освободив её слот. Несуществующая запись — 404.

    Слот освобождается как следствие: свободные слоты считаются из существующих
    записей, поэтому отдельной пометки не требуется.
    """
    booking = session.get(Booking, id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запись не найдена")
    session.delete(booking)
    session.commit()
