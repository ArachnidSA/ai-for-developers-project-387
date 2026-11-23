from datetime import UTC, datetime


def as_utc(value: datetime) -> datetime:
    """Приводит время к aware-UTC; naive-значение считается записанным в UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def naive_utc(value: datetime) -> datetime:
    """То же время без смещения — представление для хранения в SQLite.

    SQLite не сохраняет смещение, поэтому в БД время лежит как naive-UTC.
    Все преобразования к этому виду идут через одну точку — этот помощник.
    """
    return as_utc(value).replace(tzinfo=None)
