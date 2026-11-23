import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BookingConflictError, createBooking, type Booking } from '@/api/bookings'
import { listEventTypes, type EventType } from '@/api/eventTypes'
import { listEventTypeSlots, type Slot } from '@/api/slots'
import { addDays, dayInTimeZone } from '@/lib/dates'

import { BookPage } from './BookPage'

vi.mock('@/api/eventTypes', () => ({
  listEventTypes: vi.fn(),
  createEventType: vi.fn(),
}))

vi.mock('@/api/slots', () => ({
  listEventTypeSlots: vi.fn(),
}))

vi.mock('@/api/bookings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/bookings')>()
  return { ...actual, createBooking: vi.fn() }
})

const listEventTypesMock = vi.mocked(listEventTypes)
const listEventTypeSlotsMock = vi.mocked(listEventTypeSlots)
const createBookingMock = vi.mocked(createBooking)

const MEETING: EventType = {
  id: 1,
  name: 'Встреча 60 минут',
  description: 'Обсуждение проекта',
  duration_minutes: 60,
  status: 'active',
}

const MORNING_SLOT: Slot = {
  start: '2026-11-20T04:00:00Z',
  end: '2026-11-20T05:00:00Z',
}

const SECOND_SLOT: Slot = {
  start: '2026-11-20T05:00:00Z',
  end: '2026-11-20T06:00:00Z',
}

const CREATED_BOOKING: Booking = {
  id: 1,
  event_type_id: MEETING.id,
  guest_name: 'Анна',
  guest_email: 'anna@example.com',
  note: 'Обсудить проект',
  start: MORNING_SLOT.start,
  end: MORNING_SLOT.end,
}

/** День окна как `YYYY-MM-DD` по дате владельца (окно строится в его поясе). */
function ownerIso(offsetDays = 0): string {
  return addDays(dayInTimeZone(new Date()), offsetDays)
}

function renderBookPage() {
  return render(
    <MemoryRouter>
      <BookPage />
    </MemoryRouter>,
  )
}

function selectDay(offsetDays = 0) {
  const group = screen.getByRole('group', { name: 'Выберите день' })
  fireEvent.click(within(group).getAllByRole('button')[offsetDays])
}

describe('экран записи гостя', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('показывает доступные типы событий через сгенерированный SDK', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])

    renderBookPage()

    expect(await screen.findByText('Встреча 60 минут')).toBeTruthy()
    expect(screen.getByText('60 мин')).toBeTruthy()
    expect(listEventTypesMock).toHaveBeenCalledTimes(1)
  })

  it('запрашивает слоты только после выбора типа и дня', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])
    listEventTypeSlotsMock.mockResolvedValue([MORNING_SLOT])

    renderBookPage()
    await screen.findByText('Встреча 60 минут')
    expect(listEventTypeSlotsMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Встреча 60 минут/ }))
    expect(listEventTypeSlotsMock).not.toHaveBeenCalled()

    selectDay(0)

    await waitFor(() =>
      expect(listEventTypeSlotsMock).toHaveBeenCalledWith(MEETING.id, ownerIso(0)),
    )
  })

  it('показывает свободные слоты выбранного дня', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])
    listEventTypeSlotsMock.mockResolvedValue([MORNING_SLOT])

    renderBookPage()
    await screen.findByText('Встреча 60 минут')
    fireEvent.click(screen.getByRole('button', { name: /Встреча 60 минут/ }))
    selectDay(0)

    expect(await screen.findByTestId('slot')).toBeTruthy()
  })

  it('показывает сообщение, когда свободных слотов нет', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])
    listEventTypeSlotsMock.mockResolvedValue([])

    renderBookPage()
    await screen.findByText('Встреча 60 минут')
    fireEvent.click(screen.getByRole('button', { name: /Встреча 60 минут/ }))
    selectDay(0)

    expect(await screen.findByText('Нет свободных слотов')).toBeTruthy()
  })

  it('предлагает выбрать день из окна в 14 дней', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])

    renderBookPage()
    await screen.findByText('Встреча 60 минут')

    const group = screen.getByRole('group', { name: 'Выберите день' })
    expect(within(group).getAllByRole('button')).toHaveLength(14)
  })

  it('показывает форму и подтверждение после успешной записи', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])
    listEventTypeSlotsMock.mockResolvedValue([MORNING_SLOT])
    createBookingMock.mockResolvedValue(CREATED_BOOKING)

    renderBookPage()
    await screen.findByText('Встреча 60 минут')
    fireEvent.click(screen.getByRole('button', { name: /Встреча 60 минут/ }))
    selectDay(0)
    fireEvent.click(await screen.findByTestId('slot'))

    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Анна' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'anna@example.com' } })
    fireEvent.change(screen.getByLabelText('Заметка'), { target: { value: 'Обсудить проект' } })
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))

    await waitFor(() =>
      expect(createBookingMock).toHaveBeenCalledWith({
        event_type_id: MEETING.id,
        start: MORNING_SLOT.start,
        guest_name: 'Анна',
        guest_email: 'anna@example.com',
        note: 'Обсудить проект',
      }),
    )
    expect(await screen.findByText('Запись оформлена')).toBeTruthy()
  })

  it('отправляет только имя, когда email и заметка пустые', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])
    listEventTypeSlotsMock.mockResolvedValue([MORNING_SLOT])
    createBookingMock.mockResolvedValue(CREATED_BOOKING)

    renderBookPage()
    await screen.findByText('Встреча 60 минут')
    fireEvent.click(screen.getByRole('button', { name: /Встреча 60 минут/ }))
    selectDay(0)
    fireEvent.click(await screen.findByTestId('slot'))

    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Борис' } })
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))

    await waitFor(() =>
      expect(createBookingMock).toHaveBeenCalledWith({
        event_type_id: MEETING.id,
        start: MORNING_SLOT.start,
        guest_name: 'Борис',
        guest_email: undefined,
        note: undefined,
      }),
    )
  })

  it('при конфликте показывает сообщение и даёт выбрать другой слот', async () => {
    listEventTypesMock.mockResolvedValue([MEETING])
    listEventTypeSlotsMock.mockResolvedValue([MORNING_SLOT, SECOND_SLOT])
    createBookingMock.mockRejectedValue(
      new BookingConflictError('Это время уже занято, выберите другой слот'),
    )

    renderBookPage()
    await screen.findByText('Встреча 60 минут')
    fireEvent.click(screen.getByRole('button', { name: /Встреча 60 минут/ }))
    selectDay(0)
    fireEvent.click((await screen.findAllByTestId('slot'))[0])

    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Анна' } })
    fireEvent.click(screen.getByRole('button', { name: 'Записаться' }))

    expect(await screen.findByText('Это время уже занято, выберите другой слот')).toBeTruthy()
    // Слоты снова доступны для выбора — можно записаться на другое время.
    expect(screen.getAllByTestId('slot').length).toBeGreaterThan(0)
  })
})
