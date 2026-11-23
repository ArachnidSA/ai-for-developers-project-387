from fastapi.testclient import TestClient


def test_list_event_types_is_empty_initially(client: TestClient) -> None:
    response = client.get("/api/event-types")

    assert response.status_code == 200
    assert response.json() == []


def test_create_event_type_returns_created_type(client: TestClient) -> None:
    response = client.post(
        "/api/event-types",
        json={
            "name": "Звонок 30 минут",
            "description": "Быстрый созвон по делу",
            "duration_minutes": 30,
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": 1,
        "name": "Звонок 30 минут",
        "description": "Быстрый созвон по делу",
        "duration_minutes": 30,
        "status": "active",
    }


def test_created_event_type_appears_in_list(client: TestClient) -> None:
    created = client.post(
        "/api/event-types",
        json={"name": "Созвон", "description": "Описание", "duration_minutes": 60},
    ).json()

    response = client.get("/api/event-types")

    assert response.status_code == 200
    assert response.json() == [created]


def test_create_event_type_rejects_duration_below_minimum(client: TestClient) -> None:
    response = client.post(
        "/api/event-types",
        json={"name": "Слишком короткий", "description": "", "duration_minutes": 4},
    )

    assert response.status_code == 422


def test_create_event_type_rejects_duration_above_maximum(client: TestClient) -> None:
    response = client.post(
        "/api/event-types",
        json={"name": "Слишком длинный", "description": "", "duration_minutes": 721},
    )

    assert response.status_code == 422
