import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { BookingConflictError, createBooking, type Booking } from '@/api/bookings'
import { listEventTypes, type EventType } from '@/api/eventTypes'
import { listEventTypeSlots, type Slot } from '@/api/slots'
import { bookingDays } from '@/lib/dates'

const dayLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  weekday: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
})

function formatDay(iso: string): string {
  const [year, month, date] = iso.split('-').map(Number)
  return dayLabelFormatter.format(new Date(year, month - 1, date))
}

/** Время слота в локальном поясе гостя (в API время приходит в UTC). */
function formatTimeRange(slot: Slot): string {
  const start = timeFormatter.format(new Date(slot.start))
  const end = timeFormatter.format(new Date(slot.end))
  return `${start}–${end}`
}

function BookPage() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [slotResult, setSlotResult] = useState<{
    key: string
    slots: Slot[] | null
    error: string | null
  }>({ key: '', slots: null, error: null })

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<Booking | null>(null)

  const [days] = useState(() => bookingDays(new Date()))

  useEffect(() => {
    listEventTypes()
      .then(setEventTypes)
      .catch(() => setEventTypes([]))
  }, [])

  useEffect(() => {
    if (selectedTypeId === null || selectedDay === null) {
      return
    }
    let active = true
    const key = `${selectedTypeId}:${selectedDay}`
    listEventTypeSlots(selectedTypeId, selectedDay)
      .then((result) => {
        if (active) setSlotResult({ key, slots: result, error: null })
      })
      .catch(() => {
        if (active) {
          setSlotResult({ key, slots: [], error: 'Не удалось загрузить свободные слоты' })
        }
      })
    return () => {
      active = false
    }
  }, [selectedTypeId, selectedDay])

  const selectionKey =
    selectedTypeId !== null && selectedDay !== null ? `${selectedTypeId}:${selectedDay}` : null
  const currentResult = selectionKey !== null && slotResult.key === selectionKey ? slotResult : null
  const slots = currentResult?.slots ?? null
  const slotsError = currentResult?.error ?? null

  function chooseEventType(eventTypeId: number) {
    setSelectedTypeId(eventTypeId)
    setSelectedSlot(null)
    setFormError(null)
  }

  function chooseDay(day: string) {
    setSelectedDay(day)
    setSelectedSlot(null)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (selectedSlot === null || selectedTypeId === null) {
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const booking = await createBooking({
        event_type_id: selectedTypeId,
        start: selectedSlot.start,
        guest_name: guestName,
        guest_email: guestEmail === '' ? undefined : guestEmail,
        note: note === '' ? undefined : note,
      })
      setCreated(booking)
    } catch (error) {
      // Слот заняли, пока гость заполнял форму: снова показываем список слотов.
      setSelectedSlot(null)
      setFormError(
        error instanceof BookingConflictError
          ? error.message
          : 'Не удалось создать запись, попробуйте ещё раз',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (created !== null) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight">Запись оформлена</h1>
        <p>
          Мы ждём вас {formatTimeRange(created)}. Имя: {created.guest_name}
        </p>
        <div className="flex items-center gap-4">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            type="button"
            onClick={() => {
              setCreated(null)
              setSelectedSlot(null)
              setGuestName('')
              setGuestEmail('')
              setNote('')
            }}
          >
            Записаться ещё
          </button>
          <Link className="text-sm underline underline-offset-4" to="/">
            На главную
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Запись на звонок</h1>
      <p className="text-muted-foreground">Выберите подходящий тип события.</p>

      {eventTypes.length > 0 ? (
        <ul aria-label="Типы событий" className="flex flex-col gap-2">
          {eventTypes.map((eventType) => (
            <li key={eventType.id}>
              <button
                className={`flex w-full flex-col rounded-md border p-3 text-left ${
                  selectedTypeId === eventType.id ? 'border-foreground' : ''
                }`}
                type="button"
                onClick={() => chooseEventType(eventType.id)}
              >
                <span className="font-medium">{eventType.name}</span>
                <span className="text-muted-foreground text-sm">{eventType.description}</span>
                <span className="text-sm">{eventType.duration_minutes} мин</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Типы событий пока не заведены</p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">День</h2>
        <div aria-label="Выберите день" className="flex flex-wrap gap-2" role="group">
          {days.map((day) => (
            <button
              key={day}
              className={`rounded-md border px-3 py-1 text-sm ${
                selectedDay === day ? 'border-foreground font-medium' : ''
              }`}
              type="button"
              onClick={() => chooseDay(day)}
            >
              {formatDay(day)}
            </button>
          ))}
        </div>
      </section>

      {selectedTypeId !== null && selectedDay !== null && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Свободные слоты</h2>
          {slotsError !== null ? (
            <p className="text-sm text-red-600">{slotsError}</p>
          ) : slots === null ? (
            <p className="text-muted-foreground">Загрузка…</p>
          ) : slots.length === 0 ? (
            <p className="text-muted-foreground">Нет свободных слотов</p>
          ) : (
            <ul aria-label="Свободные слоты" className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <li key={slot.start}>
                  <button
                    className={`rounded-md border px-3 py-1 text-sm ${
                      selectedSlot?.start === slot.start ? 'border-foreground font-medium' : ''
                    }`}
                    data-testid="slot"
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot)
                      setFormError(null)
                    }}
                  >
                    {formatTimeRange(slot)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {formError !== null && (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          )}
        </section>
      )}

      {selectedSlot !== null && (
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold">Ваши данные</h2>
          <label className="flex flex-col gap-1 text-sm">
            Имя
            <input
              className="rounded-md border px-3 py-1"
              required
              maxLength={100}
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              className="rounded-md border px-3 py-1"
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Заметка
            <textarea
              className="rounded-md border px-3 py-1"
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button
            className="rounded-md border px-3 py-1 text-sm"
            disabled={submitting}
            type="submit"
          >
            Записаться
          </button>
        </form>
      )}

      <Link className="text-sm underline underline-offset-4" to="/">
        На главную
      </Link>
    </main>
  )
}

export { BookPage }
