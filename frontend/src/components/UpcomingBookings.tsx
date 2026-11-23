import { useEffect, useState } from 'react'

import { deleteBooking, listUpcomingBookings, type UpcomingBooking } from '@/api/bookings'
import { Button } from '@/components/ui/button'

// Время записей показываем в поясе владельца (ADR-0002), а не в поясе браузера.
const OWNER_TIME_ZONE = 'Asia/Yekaterinburg'

const ownerTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: OWNER_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** Мгновение из UTC-ISO в дату и время по поясу владельца. */
function formatOwnerTime(iso: string): string {
  return ownerTimeFormatter.format(new Date(iso))
}

function UpcomingBookings() {
  const [bookings, setBookings] = useState<UpcomingBooking[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listUpcomingBookings()
      .then(setBookings)
      .catch(() => setError('Не удалось загрузить предстоящие записи'))
  }, [])

  async function handleDelete(booking: UpcomingBooking) {
    if (!window.confirm(`Удалить запись «${booking.guest_name}»?`)) {
      return
    }
    setError(null)
    try {
      await deleteBooking(booking.id)
      setBookings(await listUpcomingBookings())
    } catch {
      setError('Не удалось удалить запись')
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">Предстоящие записи</h2>
      {error !== null && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {bookings.length === 0 ? (
        <p className="text-muted-foreground">Предстоящих записей пока нет</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bookings.map((booking) => (
            <li key={booking.id} className="rounded-md border p-3">
              <div className="font-medium" data-testid="booking-time">
                {formatOwnerTime(booking.start)}
              </div>
              <dl className="text-muted-foreground flex flex-wrap gap-x-4 text-sm">
                <div className="flex gap-1">
                  <dt>Тип:</dt>
                  <dd>{booking.event_type_name}</dd>
                </div>
                <div className="flex gap-1">
                  <dt>Имя:</dt>
                  <dd>{booking.guest_name}</dd>
                </div>
                {booking.guest_email !== undefined && (
                  <div className="flex gap-1">
                    <dt>Email:</dt>
                    <dd>{booking.guest_email}</dd>
                  </div>
                )}
                {booking.note !== undefined && (
                  <div className="flex gap-1">
                    <dt>Заметка:</dt>
                    <dd>{booking.note}</dd>
                  </div>
                )}
              </dl>
              <Button
                className="mt-2"
                size="sm"
                type="button"
                variant="destructive"
                onClick={() => handleDelete(booking)}
              >
                Удалить
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export { UpcomingBookings }
