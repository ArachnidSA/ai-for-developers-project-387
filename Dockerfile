# syntax=docker/dockerfile:1
#
# Один образ приложения: стадия на Node собирает SPA, python-стадия ставит
# зависимости бэкенда и отдаёт статику вместе с `/api` одним процессом FastAPI.
# Образ стартует без ручных команд: слушает `0.0.0.0` и порт из `PORT` (по умолчанию 8000).

# --- Стадия 1: сборка фронтенда -------------------------------------------------
FROM node:24-alpine AS frontend

WORKDIR /app/frontend
# Сначала только манифесты — слой с зависимостями кэшируется между сборками.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
# VITE_API_BASE_URL пуст: собранный SPA ходит на `/api` того же origin.
COPY frontend/ ./
RUN npm run build

# --- Стадия 2: рантайм приложения ----------------------------------------------
FROM python:3.14-slim AS runtime

# uv из официального образа — им ставим зафиксированные зависимости бэкенда.
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /uvx /bin/
ENV UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PYTHON=3.14 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

# Код бэкенда и собранная статика фронтенда.
COPY backend/app ./app
COPY --from=frontend /app/frontend/dist /app/static

# SQLite пишется в каталог с правом записи; каталог создаём заранее и отдаём
# непривилегированному пользователю, под которым работает сервис.
ENV DATABASE_URL="sqlite:////app/data/calendar.db" \
    FRONTEND_DIST_DIR=/app/static \
    PORT=8000
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /app/data \
    && chown app:app /app/data
USER app

EXPOSE 8000

# Один воркер обязателен: инвариант непересечения записей опирается на сериализацию
# писателей в SQLite (`BEGIN IMMEDIATE`, см. ADR-0001 и `configure_sqlite_engine`).
CMD ["sh", "-c", "exec /app/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8000}\" --workers 1 --app-dir /app/backend"]
