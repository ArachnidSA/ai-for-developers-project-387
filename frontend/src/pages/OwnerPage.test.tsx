import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteBooking,
  listUpcomingBookings,
  type UpcomingBooking,
} from '@/api/bookings'
import { createEventType, listEventTypes, type EventType } from '@/api/eventTypes'

import { OwnerPage } from './OwnerPage'

vi.mock('@/api/eventTypes', () => ({
  listEventTypes: vi.fn(),
  createEventType: vi.fn(),
  updateEventType: vi.fn(),
  deleteEventType: vi.fn(),
  archiveEventType: vi.fn(),
  EventTypeInUseError: class EventTypeInUseError extends Error {},
}))

// Секция предстоящих записей ходит в API через обёртку — в тестах маршрута её подменяем.
vi.mock('@/api/bookings', () => ({
  listUpcomingBookings: vi.fn().mockResolvedValue([]),
  deleteBooking: vi.fn(),
}))

const listEventTypesMock = vi.mocked(listEventTypes)
const createEventTypeMock = vi.mocked(createEventType)
const listUpcomingBookingsMock = vi.mocked(listUpcomingBookings)
const deleteBookingMock = vi.mocked(deleteBooking)

const CONSULTATION: EventType = {
  id: 1,
  name: 'Консультация',
  description: 'Разбор задачи',
  duration_minutes: 30,
  status: 'active',
}

const UPCOMING: UpcomingBooking = {
  id: 5,
  event_type_id: 1,
  event_type_name: 'Консультация',
  guest_name: 'Анна',
  guest_email: 'anna@example.com',
  note: 'Обсудить проект',
  start: '2026-11-20T05:00:00Z',
  end: '2026-11-20T05:30:00Z',
}

function renderOwner() {
  return render(
    <MemoryRouter>
      <OwnerPage />
    </MemoryRouter>,
  )
}

describe('экран владельца', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    listUpcomingBookingsMock.mockResolvedValue([])
  })

  it('показывает типы событий, полученные через сгенерированный SDK', async () => {
    listEventTypesMock.mockResolvedValue([CONSULTATION])

    renderOwner()

    expect(await screen.findByText('Консультация')).toBeTruthy()
    expect(screen.getByText('Разбор задачи')).toBeTruthy()
    expect(screen.getByText('30 мин')).toBeTruthy()
    expect(listEventTypesMock).toHaveBeenCalledTimes(1)
  })

  it('показывает пустое состояние, когда типов ещё нет', async () => {
    listEventTypesMock.mockResolvedValue([])

    renderOwner()

    expect(await screen.findByText('Типы событий пока не заведены')).toBeTruthy()
  })

  it('создаёт тип через SDK и обновляет список', async () => {
    listEventTypesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([CONSULTATION])
    createEventTypeMock.mockResolvedValue(CONSULTATION)

    renderOwner()
    await screen.findByText('Типы событий пока не заведены')

    fireEvent.change(screen.getByLabelText('Название'), {
      target: { value: 'Консультация' },
    })
    fireEvent.change(screen.getByLabelText('Описание'), {
      target: { value: 'Разбор задачи' },
    })
    fireEvent.change(screen.getByLabelText('Длительность, мин'), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Создать тип' }))

    await waitFor(() =>
      expect(createEventTypeMock).toHaveBeenCalledWith({
        name: 'Консультация',
        description: 'Разбор задачи',
        duration_minutes: 30,
      }),
    )
    expect(await screen.findByText('Консультация')).toBeTruthy()
  })

  it('показывает предстоящие записи в своём поясе', async () => {
    listEventTypesMock.mockResolvedValue([])
    listUpcomingBookingsMock.mockResolvedValue([UPCOMING])

    renderOwner()

    expect(await screen.findByText('Предстоящие записи')).toBeTruthy()
    const time = screen.getByTestId('booking-time')
    // 05:00 UTC = 10:00 в поясе владельца (Asia/Yekaterinburg, UTC+5).
    expect(time.textContent).toContain('10:00')
    expect(screen.getByText('Анна')).toBeTruthy()
    expect(screen.getByText('anna@example.com')).toBeTruthy()
    expect(screen.getByText('Обсудить проект')).toBeTruthy()
  })

  it('удаляет запись после подтверждения', async () => {
    listEventTypesMock.mockResolvedValue([])
    listUpcomingBookingsMock.mockResolvedValueOnce([UPCOMING]).mockResolvedValueOnce([])
    deleteBookingMock.mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderOwner()
    await screen.findByText('Анна')

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(deleteBookingMock).toHaveBeenCalledWith(UPCOMING.id))
    expect(await screen.findByText('Предстоящих записей пока нет')).toBeTruthy()
    confirmSpy.mockRestore()
  })
})
