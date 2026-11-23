import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AppRoutes } from './App'

// Экраны /owner и /book получают данные через SDK — в тестах маршрутизации
// подменяем сетевой слой, чтобы не ходить в API.
vi.mock('@/api/eventTypes', () => ({
  listEventTypes: vi.fn().mockResolvedValue([]),
  createEventType: vi.fn(),
  updateEventType: vi.fn(),
  deleteEventType: vi.fn(),
  archiveEventType: vi.fn(),
  EventTypeInUseError: class EventTypeInUseError extends Error {},
}))

vi.mock('@/api/bookings', () => ({
  listUpcomingBookings: vi.fn().mockResolvedValue([]),
  deleteBooking: vi.fn(),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('маршрутизация', () => {
  it('на / показывает главное окно', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeTruthy()
  })

  it('на /book показывает экран записи', () => {
    renderAt('/book')

    expect(screen.getByRole('heading', { name: 'Запись на звонок' })).toBeTruthy()
  })

  it('на /owner показывает экран владельца', () => {
    renderAt('/owner')

    expect(screen.getByRole('heading', { name: 'Админка' })).toBeTruthy()
  })

  it('на неизвестном пути показывает «страница не найдена»', () => {
    renderAt('/нет-такой-страницы')

    expect(screen.getByRole('heading', { name: 'Страница не найдена' })).toBeTruthy()
  })
})
