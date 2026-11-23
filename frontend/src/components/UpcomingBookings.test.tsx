import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteBooking,
  listUpcomingBookings,
  type UpcomingBooking,
} from '@/api/bookings'

import { UpcomingBookings } from './UpcomingBookings'

vi.mock('@/api/bookings', () => ({
  listUpcomingBookings: vi.fn(),
  deleteBooking: vi.fn(),
}))

const listUpcomingBookingsMock = vi.mocked(listUpcomingBookings)
const deleteBookingMock = vi.mocked(deleteBooking)

// 05:00 UTC = 10:00 в поясе владельца (Asia/Yekaterinburg, UTC+5).
const BOOKING: UpcomingBooking = {
  id: 1,
  event_type_id: 7,
  event_type_name: 'Консультация',
  guest_name: 'Анна',
  guest_email: 'anna@example.com',
  note: 'Обсудить проект',
  start: '2026-11-20T05:00:00Z',
  end: '2026-11-20T06:00:00Z',
}

describe('секция предстоящих записей', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('показывает пять полей записи во времени владельца', async () => {
    listUpcomingBookingsMock.mockResolvedValue([BOOKING])

    render(<UpcomingBookings />)

    const time = await screen.findByTestId('booking-time')
    // То же мгновение в UTC — 05:00, у владельца — 10:00.
    expect(time.textContent).toContain('10:00')
    expect(time.textContent).not.toContain('05:00')
    expect(screen.getByText('Консультация')).toBeTruthy()
    expect(screen.getByText('Анна')).toBeTruthy()
    expect(screen.getByText('anna@example.com')).toBeTruthy()
    expect(screen.getByText('Обсудить проект')).toBeTruthy()
  })

  it('показывает пустое состояние, когда записей нет', async () => {
    listUpcomingBookingsMock.mockResolvedValue([])

    render(<UpcomingBookings />)

    expect(await screen.findByText('Предстоящих записей пока нет')).toBeTruthy()
  })

  it('удаляет запись после подтверждения и обновляет список', async () => {
    listUpcomingBookingsMock.mockResolvedValueOnce([BOOKING]).mockResolvedValueOnce([])
    deleteBookingMock.mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<UpcomingBookings />)
    await screen.findByText('Анна')

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(deleteBookingMock).toHaveBeenCalledWith(BOOKING.id))
    expect(await screen.findByText('Предстоящих записей пока нет')).toBeTruthy()
    confirmSpy.mockRestore()
  })

  it('не удаляет запись без подтверждения', async () => {
    listUpcomingBookingsMock.mockResolvedValue([BOOKING])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<UpcomingBookings />)
    await screen.findByText('Анна')

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(deleteBookingMock).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})
