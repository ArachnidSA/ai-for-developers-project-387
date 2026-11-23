from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.event_type import EventType, EventTypeStatus


def get_event_type_or_404(
    session: Session,
    event_type_id: int,
    *,
    active_only: bool = False,
) -> EventType:
    """Возвращает тип события по id или бросает 404 с единым сообщением.

    `active_only=True` — для гостевых операций (слоты, запись): архивный тип
    неотличим от несуществующего. Владельцу доступны все типы — по умолчанию.
    """
    event_type = session.get(EventType, event_type_id)
    if event_type is None or (active_only and event_type.status != EventTypeStatus.active):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Тип события не найден")
    return event_type
