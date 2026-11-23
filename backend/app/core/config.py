from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Настройки приложения. Значения читаются из окружения и файла .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ai-for-developers-project-386 API"
    # Строка подключения SQLAlchemy. По умолчанию — файл SQLite рядом с приложением.
    database_url: str = "sqlite:///./calendar.db"
    # Origins, которым разрешены запросы к API (для CORS).
    cors_origins: list[str] = ["http://localhost:5173"]
    # Каталог со статикой собранного SPA. В образе сюда кладётся `vite build`; если
    # каталога нет, SPA не отдаётся — в dev статику обслуживает Vite.
    frontend_dist_dir: Path = Path("static")


settings = Settings()
