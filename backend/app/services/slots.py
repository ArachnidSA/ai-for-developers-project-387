from collections.abc import Sequence
from datetime import UTC, date, datetime, time, timedelta
from typing import NamedTuple
from zoneinfo import ZoneInfo

from app.services.overlap import overlaps
from app.services.time import as_utc

# Рабочие часы и пояс владельца фиксированы спекой (ADR-0002).
OWNER_TIMEZONE = ZoneInfo("Asia/Yekaterinburg")
BUSINESS_HOURS_START = time(9, 0)
BUSINESS_HOURS_END = time(21, 0)
# Окно записи — 14 календарных дней от «сегодня» в поясе владельца.
BOOKING_WINDOW_DAYS = 14


class Slot(NamedTuple):
    """Полуинтервал `[start, end)` в UTC: рабочий день или свободный слот."""

    start: datetime
    end: datetime


def business_hours(day: date) -> Slot:
    """Границы рабочих часов дня как aware-UTC (`09:00–21:00` по поясу владельца)."""
    start = datetime.combine(day, BUSINESS_HOURS_START, tzinfo=OWNER_TIMEZONE).astimezone(UTC)
    end = datetime.combine(day, BUSINESS_HOURS_END, tzinfo=OWNER_TIMEZONE).astimezone(UTC)
    return Slot(start, end)


def owner_today() -> date:
    """Сегодняшний день в поясе владельца."""
    return datetime.now(OWNER_TIMEZONE).date()


def booking_window(today: date) -> tuple[date, date]:
    """Границы окна записи: 14 календарных дней, начиная с `today` включительно."""
    return today, today + timedelta(days=BOOKING_WINDOW_DAYS - 1)


def within_booking_window(day: date, today: date) -> bool:
    """Попадает ли день в окно записи (включая сегодня и 14-й день)."""
    first, last = booking_window(today)
    return first <= day <= last


def generate_slots(
    day: date,
    duration_minutes: int,
    busy: Sequence[Slot],
) -> list[Slot]:
    """Свободные слоты дня: встык с шагом = длительность типа.

    Слоты идут внутри рабочих часов и не выходят за `21:00`. `busy` — занятые
    слоты (aware или naive UTC); слоты, пересекающиеся с ними, исключаются.
    Возвращает слоты как aware-UTC полуинтервалы `[start, end)`.
    """
    step = timedelta(minutes=duration_minutes)
    limit = business_hours(day)
    busy_utc = [Slot(as_utc(item.start), as_utc(item.end)) for item in busy]

    slots: list[Slot] = []
    cursor = limit.start
    while cursor + step <= limit.end:
        slot_end = cursor + step
        if not any(overlaps(cursor, slot_end, item.start, item.end) for item in busy_utc):
            slots.append(Slot(cursor, slot_end))
        cursor = slot_end
    return slots
