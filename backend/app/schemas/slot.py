from datetime import datetime

from pydantic import BaseModel


class SlotRead(BaseModel):
    """Свободный слот в ответе API: полуинтервал `[start, end)` в UTC."""

    start: datetime
    end: datetime
