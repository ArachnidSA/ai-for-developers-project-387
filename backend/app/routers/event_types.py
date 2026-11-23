from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_session
from app.models.booking import Booking
from app.models.event_type import EventType, EventTypeStatus
from app.schemas.event_type import EventTypeCreate, EventTypeRead, EventTypeUpdate
from app.services.event_types import get_event_type_or_404

router = APIRouter()


@router.get("/event-types")
def list_event_types(
    session: Annotated[Session, Depends(get_session)],
    include_archived: bool = False,
) -> list[EventTypeRead]:
    """Список типов событий. Гостю — только действующие, владельцу — все."""
    statement = select(EventType).order_by(EventType.id)
    if not include_archived:
        statement = statement.where(EventType.status == EventTypeStatus.active)
    return [EventTypeRead.model_validate(event_type) for event_type in session.scalars(statement)]


@router.post("/event-types", status_code=status.HTTP_201_CREATED)
def create_event_type(
    payload: EventTypeCreate,
    session: Annotated[Session, Depends(get_session)],
) -> EventTypeRead:
    """Создать тип события."""
    event_type = EventType(
        name=payload.name,
        description=payload.description,
        duration_minutes=payload.duration_minutes,
        status=EventTypeStatus.active,
    )
    session.add(event_type)
    session.commit()
    session.refresh(event_type)
    return EventTypeRead.model_validate(event_type)


@router.patch("/event-types/{event_type_id}")
def update_event_type(
    event_type_id: int,
    payload: EventTypeUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> EventTypeRead:
    """Изменить тип события. Переданные поля обновляются, остальные не трогаются."""
    event_type = get_event_type_or_404(session, event_type_id)

    # Неявный `null` считаем «поле не передано»: контракт допускает пропуск, но не пустое значение.
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(event_type, field, value)
    session.commit()
    session.refresh(event_type)
    return EventTypeRead.model_validate(event_type)


@router.delete("/event-types/{event_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_type(
    event_type_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """Удалить тип события без записей. Тип с записями не удаляем — только архивируем."""
    event_type = get_event_type_or_404(session, event_type_id)

    has_bookings = session.scalar(
        select(Booking.id).where(Booking.event_type_id == event_type_id).limit(1)
    )
    if has_bookings is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="По типу события есть записи, его можно только архивировать",
        )

    session.delete(event_type)
    session.commit()


@router.post("/event-types/{event_type_id}/archive")
def archive_event_type(
    event_type_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> EventTypeRead:
    """Архивировать тип события: он скрывается от гостей, записи по нему сохраняются."""
    event_type = get_event_type_or_404(session, event_type_id)

    event_type.status = EventTypeStatus.archived
    session.commit()
    session.refresh(event_type)
    return EventTypeRead.model_validate(event_type)
