from collections.abc import Iterator
from typing import Any

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Базовый класс моделей SQLAlchemy."""


def _connect_args(database_url: str) -> dict[str, object]:
    # SQLite в FastAPI используется из разных потоков, поэтому снимаем проверку потока.
    # timeout — это busy-timeout: сколько ждать снятия блокировки, прежде чем отдать ошибку.
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False, "timeout": 30}
    return {}


def configure_sqlite_engine(engine: Engine) -> Engine:
    """Готовит SQLite-движок к сериализации писателей.

    Транзакция начинается с `BEGIN IMMEDIATE`, то есть RESERVED-блокировка берётся
    сразу, до чтения. Поэтому одновременные запросы на создание записи выстраиваются
    в очередь: второй видит уже вставленную первую и получает конфликт, а не проходит
    вслепую по схеме «проверил-потом-вставил». Этого требует инвариант непересечения
    записей (задача #15).
    """
    if engine.dialect.name != "sqlite":
        return engine

    @event.listens_for(engine, "connect")
    def _disable_implicit_begin(dbapi_connection: Any, _record: Any) -> None:
        # pysqlite иначе открывает транзакцию неявно и только на первый DML: не получится
        # взять блокировку до чтения. Управляем транзакцией явно (см. обработчик "begin").
        dbapi_connection.isolation_level = None

    @event.listens_for(engine, "begin")
    def _begin_immediate(connection: Any) -> None:
        connection.exec_driver_sql("BEGIN IMMEDIATE")

    return engine


DATABASE_URL = settings.database_url
engine = configure_sqlite_engine(
    create_engine(DATABASE_URL, connect_args=_connect_args(DATABASE_URL))
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session() -> Iterator[Session]:
    """Отдаёт сессию БД на время запроса."""
    with SessionLocal() as session:
        yield session


def init_db() -> None:
    """Создаёт таблицы, если их ещё нет."""
    # Импорт регистрирует модели в metadata Base.
    from app.models import booking, event_type  # noqa: F401

    Base.metadata.create_all(bind=engine)
