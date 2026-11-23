from datetime import datetime


def overlaps(
    start: datetime,
    end: datetime,
    other_start: datetime,
    other_end: datetime,
) -> bool:
    """Пересекаются ли полуинтервалы `[start, end)` и `[other_start, other_end)`.

    Сравнивать нужно интервалы в одном поясе (в проекте — UTC). Касание встык
    (конец одного равен началу другого) пересечением не считается, поэтому
    две встречи «10:00–11:00» и «11:00–12:00» совместимы.
    """
    return start < other_end and other_start < end
