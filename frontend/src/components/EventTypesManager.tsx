import { type FormEvent, useEffect, useState } from 'react'

import {
  archiveEventType,
  createEventType,
  deleteEventType,
  EventTypeInUseError,
  listEventTypes,
  updateEventType,
  type EventType,
} from '@/api/eventTypes'
import { Button } from '@/components/ui/button'

type EditFields = { name: string; description: string; duration: string }

function fieldsOf(eventType: EventType): EditFields {
  return {
    name: eventType.name,
    description: eventType.description,
    duration: String(eventType.duration_minutes),
  }
}

function EventTypesManager() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFields, setEditFields] = useState<EditFields>({ name: '', description: '', duration: '30' })
  const [error, setError] = useState<string | null>(null)

  function reload() {
    // Владелец видит и архивные типы, гостевой список их по-прежнему скрывает.
    return listEventTypes({ includeArchived: true }).then(setEventTypes)
  }

  useEffect(() => {
    reload().catch(() => setError('Не удалось загрузить типы событий'))
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      await createEventType({ name, description, duration_minutes: Number(duration) })
      await reload()
      setName('')
      setDescription('')
      setDuration('30')
    } catch {
      setError('Не удалось создать тип события')
    }
  }

  function startEdit(eventType: EventType) {
    setError(null)
    setEditingId(eventType.id)
    setEditFields(fieldsOf(eventType))
  }

  async function handleSave(event: FormEvent<HTMLFormElement>, id: number) {
    event.preventDefault()
    setError(null)

    try {
      await updateEventType(id, {
        name: editFields.name,
        description: editFields.description,
        duration_minutes: Number(editFields.duration),
      })
      await reload()
      setEditingId(null)
    } catch {
      setError('Не удалось изменить тип события')
    }
  }

  async function handleArchive(id: number) {
    setError(null)

    try {
      await archiveEventType(id)
      await reload()
    } catch {
      setError('Не удалось архивировать тип события')
    }
  }

  async function handleDelete(id: number) {
    setError(null)

    try {
      await deleteEventType(id)
      await reload()
    } catch (deleteError) {
      setError(
        deleteError instanceof EventTypeInUseError
          ? deleteError.message
          : 'Не удалось удалить тип события',
      )
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Типы событий</h2>
      {eventTypes.length === 0 ? (
        <p className="text-muted-foreground">Типы событий пока не заведены</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {eventTypes.map((eventType) =>
            editingId === eventType.id ? (
              <li
                key={eventType.id}
                className="flex flex-col gap-2 rounded-md border p-3"
                data-testid={`event-type-${eventType.id}`}
              >
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => handleSave(event, eventType.id)}
                >
                  <label
                    className="flex flex-col gap-1 text-sm"
                    htmlFor={`event-type-edit-name-${eventType.id}`}
                  >
                    Название
                    <input
                      id={`event-type-edit-name-${eventType.id}`}
                      className="rounded-md border px-3 py-2"
                      required
                      value={editFields.name}
                      onChange={(event) =>
                        setEditFields({ ...editFields, name: event.target.value })
                      }
                    />
                  </label>
                  <label
                    className="flex flex-col gap-1 text-sm"
                    htmlFor={`event-type-edit-description-${eventType.id}`}
                  >
                    Описание
                    <textarea
                      id={`event-type-edit-description-${eventType.id}`}
                      className="rounded-md border px-3 py-2"
                      value={editFields.description}
                      onChange={(event) =>
                        setEditFields({ ...editFields, description: event.target.value })
                      }
                    />
                  </label>
                  <label
                    className="flex flex-col gap-1 text-sm"
                    htmlFor={`event-type-edit-duration-${eventType.id}`}
                  >
                    Длительность, мин
                    <input
                      id={`event-type-edit-duration-${eventType.id}`}
                      className="rounded-md border px-3 py-2"
                      max={720}
                      min={5}
                      required
                      type="number"
                      value={editFields.duration}
                      onChange={(event) =>
                        setEditFields({ ...editFields, duration: event.target.value })
                      }
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit">Сохранить</Button>
                    <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                      Отмена
                    </Button>
                  </div>
                </form>
              </li>
            ) : (
              <li
                key={eventType.id}
                className="flex flex-col gap-2 rounded-md border p-3"
                data-testid={`event-type-${eventType.id}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{eventType.name}</span>
                  {eventType.status === 'archived' && (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs">Архивный</span>
                  )}
                </div>
                <div className="text-muted-foreground text-sm">{eventType.description}</div>
                <div className="text-sm">{eventType.duration_minutes} мин</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => startEdit(eventType)}>
                    Изменить
                  </Button>
                  {eventType.status === 'active' && (
                    <Button type="button" variant="outline" onClick={() => handleArchive(eventType.id)}>
                      Архивировать
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => handleDelete(eventType.id)}>
                    Удалить
                  </Button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {error !== null && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <form className="flex flex-col gap-3" onSubmit={handleCreate}>
        <h2 className="text-xl font-semibold">Новый тип события</h2>
        <label className="flex flex-col gap-1 text-sm" htmlFor="event-type-name">
          Название
          <input
            id="event-type-name"
            className="rounded-md border px-3 py-2"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="event-type-description">
          Описание
          <textarea
            id="event-type-description"
            className="rounded-md border px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="event-type-duration">
          Длительность, мин
          <input
            id="event-type-duration"
            className="rounded-md border px-3 py-2"
            max={720}
            min={5}
            required
            type="number"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </label>
        <Button type="submit">Создать тип</Button>
      </form>
    </section>
  )
}

export { EventTypesManager }
