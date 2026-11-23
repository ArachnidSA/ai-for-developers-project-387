import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

@service(#{ title: "Calendar API" })
@server("http://127.0.0.1:8000", "Локальный сервер разработки")
namespace Calendar;

/** Статус типа события: действующий или архивный. */
enum EventTypeStatus {
  /** Тип доступен для выбора гостю. */
  active: "active",
  /** Тип скрыт от гостей, но записи по нему сохраняются. */
  archived: "archived",
}

/** Вид встречи, который заводит владелец. */
model EventType {
  /** Системный идентификатор. */
  id: int32;
  /** Название типа события. */
  name: string;
  /** Описание типа события. */
  description: string;
  /** Длительность встречи в минутах (5–720). */
  @minValue(5)
  @maxValue(720)
  duration_minutes: int32;
  /** Статус типа события. */
  status: EventTypeStatus;
}

/** Данные для создания типа события. */
model EventTypeCreate {
  /** Название типа события. */
  name: string;
  /** Описание типа события. */
  description: string;
  /** Длительность встречи в минутах (5–720). */
  @minValue(5)
  @maxValue(720)
  duration_minutes: int32;
}

/** Данные для изменения типа события: переданные поля обновляются, остальные не трогаются. */
model EventTypeUpdate {
  /** Название типа события. */
  name?: string;
  /** Описание типа события. */
  description?: string;
  /** Длительность встречи в минутах (5–720). Не двигает уже сделанные записи. */
  @minValue(5)
  @maxValue(720)
  duration_minutes?: int32;
}

/** Свободный слот: полуинтервал `[start, end)` времени в UTC. */
model Slot {
  /** Начало слота в UTC (ISO 8601). */
  start: utcDateTime;
  /** Конец слота в UTC (ISO 8601). */
  end: utcDateTime;
}

/** Запись гостя на выбранный слот. */
model Booking {
  /** Системный идентификатор. */
  id: int32;
  /** Тип события, на который записался гость. */
  event_type_id: int32;
  /** Имя гостя. */
  guest_name: string;
  /** Email гостя. Поле отсутствует, если гость его не указал (сервер не шлёт `null`). */
  guest_email?: string;
  /** Заметка гостя. Поле отсутствует, если гость её не оставил (сервер не шлёт `null`). */
  note?: string;
  /** Начало встречи в UTC (ISO 8601). */
  start: utcDateTime;
  /** Конец встречи в UTC (ISO 8601). Вычисляется сервером. */
  end: utcDateTime;
}

/** Данные для создания записи гостем. */
model BookingCreate {
  /** Тип события, на который записывается гость. */
  event_type_id: int32;
  /** Начало встречи в UTC (ISO 8601); должно попадать в свободный слот. */
  start: utcDateTime;
  /** Имя гостя (1–100 символов, обязательно). */
  @minLength(1)
  @maxLength(100)
  guest_name: string;
  /** Email гостя (необязательно, проверяется формат). */
  @format("email")
  guest_email?: string;
  /** Заметка гостя (необязательно, до 500 символов). */
  @maxLength(500)
  note?: string;
}

/** Предстоящая запись в списке владельца: время, тип, имя, email и заметка гостя. */
model UpcomingBooking {
  /** Системный идентификатор. */
  id: int32;
  /** Тип события, на который записался гость. */
  event_type_id: int32;
  /** Название типа события. */
  event_type_name: string;
  /** Имя гостя. */
  guest_name: string;
  /** Email гостя. Поле отсутствует, если гость его не указал (сервер не шлёт `null`). */
  guest_email?: string;
  /** Заметка гостя. Поле отсутствует, если гость её не оставил (сервер не шлёт `null`). */
  note?: string;
  /** Начало встречи в UTC (ISO 8601). */
  start: utcDateTime;
  /** Конец встречи в UTC (ISO 8601). */
  end: utcDateTime;
}

/** Тело ответа об ошибке. */
model ApiError {
  /** Понятное человеку описание ошибки. */
  detail: string;
}

@route("/api")
namespace CalendarApi {
  /**
   * Список типов событий. По умолчанию — только действующие (гостевой список);
   * с `include_archived=true` владелец видит и архивные типы.
   */
  @route("/event-types")
  @get
  op listEventTypes(
    /** Включать архивные типы (для владельца). */
    @query include_archived?: boolean = false,
  ): EventType[];

  /** Создать тип события. */
  @route("/event-types")
  @post
  op createEventType(@body body: EventTypeCreate): {
    @statusCode statusCode: 201;
    @body body: EventType;
  };

  /** Изменить тип события. Переданные поля обновляются, остальные не трогаются. */
  @route("/event-types/{event_type_id}")
  @patch
  op updateEventType(
    /** Идентификатор типа события. */
    @path event_type_id: int32,
    @body body: EventTypeUpdate,
  ): {
    @statusCode statusCode: 200;
    @body body: EventType;
  } | {
    @statusCode statusCode: 404;
    @body body: ApiError;
  };

  /**
   * Удалить тип события без записей. Если по типу уже есть записи — 409,
   * историю не теряем, вместо удаления предлагается архивация.
   */
  @route("/event-types/{event_type_id}")
  @delete
  op deleteEventType(
    /** Идентификатор типа события. */
    @path event_type_id: int32,
  ): {
    @statusCode statusCode: 204;
  } | {
    @statusCode statusCode: 404;
    @body body: ApiError;
  } | {
    @statusCode statusCode: 409;
    @body body: ApiError;
  };

  /** Архивировать тип события: скрывается от гостей, записи по нему сохраняются. */
  @route("/event-types/{event_type_id}/archive")
  @post
  op archiveEventType(
    /** Идентификатор типа события. */
    @path event_type_id: int32,
  ): {
    @statusCode statusCode: 200;
    @body body: EventType;
  } | {
    @statusCode statusCode: 404;
    @body body: ApiError;
  };

  /**
   * Свободные слоты типа события на календарный день в поясе владельца.
   * Слоты идут встык с шагом, равным длительности типа, и не выходят за рабочие часы 09:00–21:00.
   * Неизвестный или архивный тип — 404; дата вне окна записи (14 дней от «сегодня») — 400.
   * `422` (некорректный формат даты) отдаёт валидация FastAPI и в контракт не входит.
   */
  @route("/event-types/{event_type_id}/slots")
  @get
  op listEventTypeSlots(
    /** Идентификатор типа события. */
    @path event_type_id: int32,
    /** Календарный день в поясе владельца (YYYY-MM-DD). */
    @query date: plainDate,
  ): {
    @statusCode statusCode: 200;
    @body body: Slot[];
  } | {
    @statusCode statusCode: 400;
    @body body: ApiError;
  } | {
    @statusCode statusCode: 404;
    @body body: ApiError;
  };

  /**
   * Создать запись гостем. `end` вычисляется сервером как `start + duration_minutes` типа.
   * Неизвестный или архивный тип — 404; время вне рабочих часов или окна записи — 400;
   * пересечение с любой существующей записью (в т.ч. другого типа) — 409.
   * `422` (некорректные поля тела) отдаёт валидация FastAPI и в контракт не входит.
   */
  @route("/bookings")
  @post
  op createBooking(@body body: BookingCreate): {
    @statusCode statusCode: 201;
    @body body: Booking;
  } | {
    @statusCode statusCode: 400;
    @body body: ApiError;
  } | {
    @statusCode statusCode: 404;
    @body body: ApiError;
  } | {
    @statusCode statusCode: 409;
    @body body: ApiError;
  };

  /**
   * Предстоящие записи всех типов (в том числе архивных) для владельца.
   * Прошедшие записи не попадают в список; порядок — по возрастанию начала.
   */
  @route("/bookings")
  @get
  op listUpcomingBookings(): UpcomingBooking[];

  /**
   * Удалить запись, освободив её слот. Несуществующая запись — 404.
   */
  @route("/bookings/{id}")
  @delete
  op deleteBooking(
    /** Идентификатор записи. */
    @path id: int32,
  ): {
    @statusCode statusCode: 204;
  } | {
    @statusCode statusCode: 404;
    @body body: ApiError;
  };
}
