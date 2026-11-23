from pathlib import Path

import pytest
from app.main import create_app
from fastapi.testclient import TestClient

# Разметка «собранного» SPA: признак того, что отдан именно index.html, а не заглушка.
INDEX_HTML = '<!doctype html><html><body><div id="root">SPA index</div></body></html>'


def build_dist(root: Path) -> Path:
    """Собирает временный каталог со статикой, как его кладёт `vite build`."""
    dist = root / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log('spa')", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    return dist


def spa_client(root: Path) -> TestClient:
    """Приложение, отдающее статику из временного каталога."""
    return TestClient(create_app(static_dir=build_dist(root)))


def test_root_serves_built_spa(tmp_path: Path) -> None:
    response = spa_client(tmp_path).get("/")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert response.text == INDEX_HTML


@pytest.mark.parametrize("route", ["/book", "/owner"])
def test_spa_route_falls_back_to_index(tmp_path: Path, route: str) -> None:
    response = spa_client(tmp_path).get(route)

    assert response.status_code == 200
    assert response.text == INDEX_HTML


def test_real_static_file_is_served(tmp_path: Path) -> None:
    response = spa_client(tmp_path).get("/assets/app.js")

    assert response.status_code == 200
    assert "console.log" in response.text


def test_api_route_is_not_shadowed_by_spa(tmp_path: Path) -> None:
    response = spa_client(tmp_path).get("/api/healthcheck")

    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_unknown_api_route_is_not_spa(tmp_path: Path) -> None:
    response = spa_client(tmp_path).get("/api/does-not-exist")

    assert response.status_code == 404
    assert INDEX_HTML not in response.text


def test_missing_static_dir_leaves_api_working(tmp_path: Path) -> None:
    # Дефолты для dev: каталога сборки нет — API работает, а SPA не отдаётся.
    client = TestClient(create_app(static_dir=tmp_path / "absent"))

    assert client.get("/api/healthcheck").status_code == 200
    assert client.get("/").status_code == 404
