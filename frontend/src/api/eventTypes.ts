import { client } from '@/api/client'
import { detailOf } from '@/api/errors'
import {
  calendarApiArchiveEventType,
  calendarApiCreateEventType,
  calendarApiDeleteEventType,
  calendarApiListEventTypes,
  calendarApiUpdateEventType,
  type EventType,
  type EventTypeCreate,
  type EventTypeUpdate,
} from '@/api/generated'

export type { EventType, EventTypeCreate, EventTypeUpdate }

/** Конфликт: по типу есть записи, удалить нельзя (`409` по контракту). */
export class EventTypeInUseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EventTypeInUseError'
  }
}

/**
 * Список типов событий через сгенерированный SDK.
 * По умолчанию — только действующие (гостевой список); `includeArchived` добавляет архивные (владельцу).
 */
export async function listEventTypes(
  options: { includeArchived?: boolean } = {},
): Promise<EventType[]> {
  const { data } = await calendarApiListEventTypes({
    client,
    query: options.includeArchived ? { include_archived: true } : undefined,
  })
  return data ?? []
}

/** Создать тип события (через сгенерированный SDK). */
export async function createEventType(body: EventTypeCreate): Promise<EventType> {
  const { data } = await calendarApiCreateEventType({ client, body })
  if (data === undefined) {
    throw new Error('Тип события не создан')
  }
  return data
}

/** Изменить тип события: переданные поля обновляются, остальные не трогаются. */
export async function updateEventType(id: number, body: EventTypeUpdate): Promise<EventType> {
  const { data } = await calendarApiUpdateEventType({
    client,
    path: { event_type_id: id },
    body,
  })
  if (data === undefined) {
    throw new Error('Тип события не изменён')
  }
  return data
}

/** Удалить тип события без записей. Тип с записями бросает {@link EventTypeInUseError}. */
export async function deleteEventType(id: number): Promise<void> {
  const { error, response } = await calendarApiDeleteEventType({
    client,
    path: { event_type_id: id },
  })
  if (response?.status === 409) {
    throw new EventTypeInUseError(
      detailOf(error, 'По типу события есть записи, его можно только архивировать'),
    )
  }
  if (response !== undefined && !response.ok) {
    throw new Error(detailOf(error, 'Не удалось удалить тип события'))
  }
}

/** Архивировать тип события: он скрывается от гостей, записи по нему сохраняются. */
export async function archiveEventType(id: number): Promise<EventType> {
  const { data } = await calendarApiArchiveEventType({
    client,
    path: { event_type_id: id },
  })
  if (data === undefined) {
    throw new Error('Тип события не архивирован')
  }
  return data
}
