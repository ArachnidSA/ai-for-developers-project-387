from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.api import API_PREFIX

# Маршрут-ловушка для клиентской маршрутизации SPA. Регистрируется последним,
# поэтому уже объявленные `/api/*` совпадают раньше и статика их не перехватывает.
SPA_FALLBACK_PATH = "/{spa_path:path}"

# Корень API без ведущего слэша: под ним статика уступает роутерам.
API_ROOT = API_PREFIX.strip("/")


def register_spa(app: FastAPI, dist_dir: str | Path) -> None:
    """Отдаёт собранный SPA из каталога сборки Vite.

    Статика (`/assets/*`, `favicon.svg` и т.п.) отдаётся как есть, а неизвестные пути
    (клиентские маршруты `/book`, `/owner`) возвращают `index.html`, чтобы ссылки
    работали при перезагрузке страницы. Префикс `/api` уступает роутерам API.
    """
    dist = Path(dist_dir).resolve()
    index = dist / "index.html"

    assets = dist / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="spa-assets")

    @app.get(SPA_FALLBACK_PATH, include_in_schema=False)
    def serve_spa(spa_path: str) -> FileResponse:
        # Ненайденный `/api/*` должен остаться 404 от API, а не отдать SPA.
        if spa_path == API_ROOT or spa_path.startswith(f"{API_ROOT}/"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        # Файл отдаём, только если он лежит внутри каталога сборки: сегменты `..`
        # в пути не должны вывести за пределы `dist`.
        candidate = (dist / spa_path).resolve()
        if spa_path and candidate.is_file() and candidate.is_relative_to(dist):
            return FileResponse(candidate)
        if index.is_file():
            return FileResponse(index)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
