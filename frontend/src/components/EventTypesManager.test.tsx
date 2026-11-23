import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  archiveEventType,
  createEventType,
  deleteEventType,
  EventTypeInUseError,
  listEventTypes,
  updateEventType,
  type EventType,
} from '@/api/eventTypes'

import { EventTypesManager } from './EventTypesManager'

vi.mock('@/api/eventTypes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/eventTypes')>()
  return {
    ...actual,
    listEventTypes: vi.fn(),
    createEventType: vi.fn(),
    updateEventType: vi.fn(),
    deleteEventType: vi.fn(),
    archiveEventType: vi.fn(),
  }
})

const listEventTypesMock = vi.mocked(listEventTypes)
const createEventTypeMock = vi.mocked(createEventType)
const updateEventTypeMock = vi.mocked(updateEventType)
const deleteEventTypeMock = vi.mocked(deleteEventType)
const archiveEventTypeMock = vi.mocked(archiveEventType)

const CONSULTATION: EventType = {
  id: 1,
  name: 'Консультация',
  description: 'Разбор задачи',
  duration_minutes: 30,
  status: 'active',
}

const ARCHIVED_CALL: EventType = {
  id: 2,
  name: 'Старый звонок',
  description: 'Уже не показываем гостям',
  duration_minutes: 60,
  status: 'archived',
}

describe('управление типами событий', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('показывает действующие и архивные типы, запрашивая их с include_archived', async () => {
    listEventTypesMock.mockResolvedValue([CONSULTATION, ARCHIVED_CALL])

    render(<EventTypesManager />)

    expect(await screen.findByText('Консультация')).toBeTruthy()
    expect(screen.getByText('Старый звонок')).toBeTruthy()
    expect(screen.getByText('Архивный')).toBeTruthy()
    expect(listEventTypesMock).toHaveBeenCalledWith({ includeArchived: true })
  })

  it('создаёт тип через SDK и обновляет список', async () => {
    listEventTypesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([CONSULTATION])
    createEventTypeMock.mockResolvedValue(CONSULTATION)

    render(<EventTypesManager />)
    await screen.findByText('Типы событий пока не заведены')

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Консультация' } })
    fireEvent.change(screen.getByLabelText('Описание'), { target: { value: 'Разбор задачи' } })
    fireEvent.change(screen.getByLabelText('Длительность, мин'), { target: { value: '30' } })
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

  it('правит тип через SDK и обновляет список', async () => {
    listEventTypesMock
      .mockResolvedValueOnce([CONSULTATION])
      .mockResolvedValueOnce([{ ...CONSULTATION, name: 'Стратегия', duration_minutes: 45 }])
    updateEventTypeMock.mockResolvedValue({ ...CONSULTATION, name: 'Стратегия' })

    render(<EventTypesManager />)
    await screen.findByText('Консультация')

    fireEvent.click(screen.getByRole('button', { name: 'Изменить' }))
    const row = screen.getByTestId('event-type-1')
    fireEvent.change(within(row).getByLabelText('Название'), { target: { value: 'Стратегия' } })
    fireEvent.change(within(row).getByLabelText('Длительность, мин'), { target: { value: '45' } })
    fireEvent.click(within(row).getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(updateEventTypeMock).toHaveBeenCalledWith(1, {
        name: 'Стратегия',
        description: 'Разбор задачи',
        duration_minutes: 45,
      }),
    )
    expect(await screen.findByText('Стратегия')).toBeTruthy()
  })

  it('архивирует тип и обновляет список', async () => {
    listEventTypesMock
      .mockResolvedValueOnce([CONSULTATION])
      .mockResolvedValueOnce([{ ...CONSULTATION, status: 'archived' }])
    archiveEventTypeMock.mockResolvedValue({ ...CONSULTATION, status: 'archived' })

    render(<EventTypesManager />)
    await screen.findByText('Консультация')

    fireEvent.click(screen.getByRole('button', { name: 'Архивировать' }))

    await waitFor(() => expect(archiveEventTypeMock).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Архивный')).toBeTruthy()
  })

  it('показывает сообщение, когда удаление отклонено из-за записей', async () => {
    listEventTypesMock.mockResolvedValue([CONSULTATION])
    deleteEventTypeMock.mockRejectedValue(
      new EventTypeInUseError('По типу события есть записи, его можно только архивировать'),
    )

    render(<EventTypesManager />)
    await screen.findByText('Консультация')

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('его можно только архивировать')
    // Тип остался на месте: удаление отклонено.
    expect(screen.getByText('Консультация')).toBeTruthy()
  })

  it('удаляет тип без записей и обновляет список', async () => {
    listEventTypesMock.mockResolvedValueOnce([CONSULTATION]).mockResolvedValueOnce([])
    deleteEventTypeMock.mockResolvedValue(undefined)

    render(<EventTypesManager />)
    await screen.findByText('Консультация')

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(deleteEventTypeMock).toHaveBeenCalledWith(1))
    expect(await screen.findByText('Типы событий пока не заведены')).toBeTruthy()
  })
})
