import { client } from '@/api/client'
import { detailOf } from '@/api/errors'
import {
  calendarApiCreateBooking,
  calendarApiDeleteBooking,
  calendarApiListUpcomingBookings,
  type Booking,
  type BookingCreate,
  type UpcomingBooking,
} from '@/api/generated'

export type { Booking, BookingCreate, UpcomingBooking }

/** Конфликт: выбранный слот уже занят (`409` по контракту). */
export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BookingConflictError'
  }
}

/** Создать запись гостем через сгенерированный SDK. */
export async function createBooking(body: BookingCreate): Promise<Booking> {
  const { data, error, response } = await calendarApiCreateBooking({ client, body })
  if (response?.status === 409) {
    throw new BookingConflictError(detailOf(error, 'Это время уже занято, выберите другой слот'))
  }
  if (data === undefined) {
    throw new Error(detailOf(error, 'Не удалось создать запись'))
  }
  return data
}

/** Предстоящие записи всех типов (в том числе архивных) через сгенерированный SDK. */
export async function listUpcomingBookings(): Promise<UpcomingBooking[]> {
  const { data } = await calendarApiListUpcomingBookings({ client })
  return data ?? []
}

/** Удалить запись, освободив её слот, через сгенерированный SDK. */
export async function deleteBooking(id: number): Promise<void> {
  const { error, response } = await calendarApiDeleteBooking({ client, path: { id } })
  if (response?.ok !== true) {
    throw new Error(detailOf(error, 'Не удалось удалить запись'))
  }
}
