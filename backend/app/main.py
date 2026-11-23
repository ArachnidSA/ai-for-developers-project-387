from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.api import API_PREFIX
from app.core.config import settings
from app.core.database import init_db
from app.core.spa import register_spa
from app.routers import bookings, event_types, health, slots


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Готовит хранилище к работе при старте приложения."""
    init_db()
    yield


def create_app(*, static_dir: Path | None = None) -> FastAPI:
    """Собирает приложение: API под `/api` и статика SPA на остальных путях.

    `static_dir` задаёт каталог сборки фронтенда; по умолчанию берётся из настроек.
    """
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, prefix=API_PREFIX, tags=["health"])
    app.include_router(event_types.router, prefix=API_PREFIX, tags=["event-types"])
    app.include_router(slots.router, prefix=API_PREFIX, tags=["slots"])
    app.include_router(bookings.router, prefix=API_PREFIX, tags=["bookings"])

    # Статика монтируется после роутеров API, поэтому `/api/*` она не перехватывает.
    register_spa(app, static_dir if static_dir is not None else settings.frontend_dist_dir)
    return app


app = create_app()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
