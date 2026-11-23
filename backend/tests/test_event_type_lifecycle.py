from datetime import datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from conftest import (
    EventTypePayload,
    add_booking,
    create_event_type,
    owner_time,
    owner_today,
)


def owner_event_types(client: TestClient) -> list[EventTypePayload]:
    """Список типов так, как его видит владелец: вместе с архивными."""
    response = client.get("/api/event-types", params={"include_archived": "true"})
    assert response.status_code == 200
    return response.json()


def test_update_event_type_changes_fields(client: TestClient) -> None:
    created = create_event_type(
        client, name="Консультация", description="Разбор задачи", duration_minutes=30
    )

    response = client.patch(
        f"/api/event-types/{created['id']}",
        json={
            "name": "Стратегическая сессия",
            "description": "Обсуждаем план",
            "duration_minutes": 60,
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "id": created["id"],
        "name": "Стратегическая сессия",
        "description": "Обсуждаем план",
        "duration_minutes": 60,
        "status": "active",
    }


def test_update_event_type_keeps_unsent_fields(client: TestClient) -> None:
    created = create_event_type(
        client, name="Консультация", description="Разбор задачи", duration_minutes=30
    )

    response = client.patch(f"/api/event-types/{created['id']}", json={"duration_minutes": 45})

    assert response.status_code == 200
    assert response.json()["name"] == "Консультация"
    assert response.json()["description"] == "Разбор задачи"
    assert response.json()["duration_minutes"] == 45


def test_update_duration_does_not_move_existing_bookings(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    # Изменение длительности не трогает уже сделанные записи (ADR-0004):
    # запись хранит абсолютные start/end, поэтому её длина не растягивается.
    day = owner_today() + timedelta(days=1)
    changed_type_id = create_event_type(client, duration_minutes=30)["id"]
    other_type_id = create_event_type(client, duration_minutes=30)["id"]
    add_booking(session_factory, changed_type_id, owner_time(day, 10, 0), owner_time(day, 10, 30))

    updated = client.patch(f"/api/event-types/{changed_type_id}", json={"duration_minutes": 60})
    assert updated.status_code == 200
    assert updated.json()["duration_minutes"] == 60

    # Смотрим слоты другого типа: старая запись по-прежнему занимает ровно 10:00–10:30.
    slots = client.get(
        f"/api/event-types/{other_type_id}/slots",
        params={"date": day.isoformat()},
    ).json()
    starts = [datetime.fromisoformat(slot["start"]) for slot in slots]
    assert owner_time(day, 10, 0) not in starts
    assert owner_time(day, 10, 30) in starts


def test_update_rejects_duration_out_of_range(client: TestClient) -> None:
    created = create_event_type(client, duration_minutes=30)

    response = client.patch(f"/api/event-types/{created['id']}", json={"duration_minutes": 4})

    assert response.status_code == 422


def test_update_unknown_event_type_is_not_found(client: TestClient) -> None:
    response = client.patch("/api/event-types/999", json={"name": "Нет такого"})

    assert response.status_code == 404


def test_delete_event_type_without_bookings_removes_it(client: TestClient) -> None:
    created = create_event_type(client, duration_minutes=30)

    response = client.delete(f"/api/event-types/{created['id']}")

    assert response.status_code == 204
    assert client.get("/api/event-types").json() == []
    assert owner_event_types(client) == []


def test_delete_event_type_with_bookings_is_conflict(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    day = owner_today() + timedelta(days=1)
    created = create_event_type(client, duration_minutes=30)
    add_booking(session_factory, created["id"], owner_time(day, 10, 0), owner_time(day, 10, 30))

    response = client.delete(f"/api/event-types/{created['id']}")

    assert response.status_code == 409
    detail = response.json()["detail"]
    assert isinstance(detail, str)
    assert detail
    # Удаление отклонено: тип остался, владельцу предлагается архивация.
    assert [event_type["id"] for event_type in owner_event_types(client)] == [created["id"]]


def test_delete_unknown_event_type_is_not_found(client: TestClient) -> None:
    response = client.delete("/api/event-types/999")

    assert response.status_code == 404


def test_archive_hides_type_from_guests_but_owner_sees_it(client: TestClient) -> None:
    created = create_event_type(client, duration_minutes=30)

    response = client.post(f"/api/event-types/{created['id']}/archive")

    assert response.status_code == 200
    assert response.json()["status"] == "archived"
    # Гостевой список архивный тип не показывает.
    assert client.get("/api/event-types").json() == []
    # Владелец с include_archived=true видит архивный тип.
    assert owner_event_types(client) == [response.json()]


def test_list_without_archived_shows_only_active(client: TestClient) -> None:
    active = create_event_type(client, name="Активный", duration_minutes=30)
    archived = create_event_type(client, name="Архивный", duration_minutes=30)
    client.post(f"/api/event-types/{archived['id']}/archive")

    assert client.get("/api/event-types").json() == [active]


def test_archive_twice_stays_archived(client: TestClient) -> None:
    created = create_event_type(client, duration_minutes=30)
    client.post(f"/api/event-types/{created['id']}/archive")

    response = client.post(f"/api/event-types/{created['id']}/archive")

    assert response.status_code == 200
    assert response.json()["status"] == "archived"


def test_archived_type_slots_are_hidden_from_guests(client: TestClient) -> None:
    day = owner_today() + timedelta(days=1)
    created = create_event_type(client, duration_minutes=30)
    client.post(f"/api/event-types/{created['id']}/archive")

    response = client.get(
        f"/api/event-types/{created['id']}/slots",
        params={"date": day.isoformat()},
    )

    assert response.status_code == 404


def test_archive_unknown_event_type_is_not_found(client: TestClient) -> None:
    response = client.post("/api/event-types/999/archive")

    assert response.status_code == 404
