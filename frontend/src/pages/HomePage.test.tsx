import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { HomePage } from './HomePage'

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('главное окно', () => {
  it('в навигации есть ссылка «Админка» на /owner', () => {
    renderHome()

    expect(screen.getByRole('link', { name: 'Админка' }).getAttribute('href')).toBe('/owner')
  })

  it('ссылки «Записаться» ведут на /book', () => {
    renderHome()

    const links = screen.getAllByRole('link', { name: 'Записаться' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toBe('/book')
    }
  })

  it('показывает блок «Возможности» с описанием сервиса', () => {
    renderHome()

    expect(screen.getByRole('heading', { name: 'Возможности' })).toBeTruthy()
    expect(screen.getByText('Выбор типа события и удобного времени для встречи.')).toBeTruthy()
    expect(screen.getByText(/Быстрое бронирование/)).toBeTruthy()
    expect(screen.getByText(/Просмотр занятых слотов/)).toBeTruthy()
  })
})
