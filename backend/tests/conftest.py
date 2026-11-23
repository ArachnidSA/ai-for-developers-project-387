import os
from collections.abc import Iterator
from datetime import UTC, date, datetime, time
from typing import TypedDict
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

# Приложению в тестах не нужна файловая БД: подменяем зависимость сессии на
# in-memory SQLite, поэтому переменная окружения лишь отводит реальный движок
# от рабочего `calendar.db`.
os.environ.setdefault("DATABASE_URL", "sqlite://")

# Границы из спеки: рабочие часы 09:00–21:00 в поясе владельца.
OWNER_TZ = ZoneInfo("Asia/Yekaterinburg")


class EventTypePayload(TypedDict):
    """Представление типа события в ответе API."""

    id: int
    name: str
    description: str
    duration_minutes: int
    status: str


def owner_today() -> date:
    """Сегодняшний день в поясе владельца."""
    return datetime.now(OWNER_TZ).date()


def owner_time(day: date, hour: int, minute: int) -> datetime:
    """Время в поясе владельца, переведённое в UTC."""
    return datetime.combine(day, time(hour, minute), tzinfo=OWNER_TZ).astimezone(UTC)


def create_event_type(
    client: TestClient,
    *,
    name: str = "Звонок",
    description: str = "",
    duration_minutes: int = 30,
) -> EventTypePayload:
    """Заводит тип события через API и возвращает его представление."""
    response = client.post(
        "/api/event-types",
        json={"name": name, "description": description, "duration_minutes": duration_minutes},
    )
    assert response.status_code == 201
    return response.json()


def add_booking(
    session_factory: sessionmaker[Session],
    event_type_id: int,
    start: datetime,
    end: datetime,
    *,
    guest_name: str = "Гость",
    guest_email: str | None = None,
    note: str | None = None,
) -> None:
    """Кладёт запись в БД напрямую (naive-UTC), минуя HTTP."""
    from app.models.booking import Booking
    from app.services.time import naive_utc

    with session_factory() as session:
        session.add(
            Booking(
                event_type_id=event_type_id,
                guest_name=guest_name,
                guest_email=guest_email,
                note=note,
                start=naive_utc(start),
                end=naive_utc(end),
            )
        )
        session.commit()


@pytest.fixture
def session_factory() -> Iterator[sessionmaker[Session]]:
    """Фабрика сессий к изолированной in-memory БД для каждого теста.

    Тесты используют её, чтобы напрямую подготовить данные (например, записи),
    а HTTP-клиент — чтобы выполнять запросы к той же базе.
    """
    from app.core.database import Base, configure_sqlite_engine

    # Регистрируем модели в metadata до создания таблиц.
    from app.models import booking, event_type  # noqa: F401

    engine = configure_sqlite_engine(
        create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False, "timeout": 30},
            poolclass=StaticPool,
        )
    )
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    """HTTP-клиент с изолированной in-memory БД для каждого теста."""
    from app.core.database import get_session

    def override_get_session() -> Iterator[Session]:
        with session_factory() as session:
            yield session

    from app.main import app

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
