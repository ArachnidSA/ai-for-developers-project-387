import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Сценарий гостя идёт целиком через реальный сервер: Vite (:5173) проксирует /api
// на FastAPI (:8000). API бронирования не подменяется — никаких page.route().
const BACKEND_URL = 'http://127.0.0.1:8000'

// Пояс владельца: окно записи (14 дней от «сегодня») строится в нём — как в BookPage.
const OWNER_TIME_ZONE = 'Asia/Yekaterinburg'

// День берём по индексу 1 (завтра по поясу владельца): он всегда попадает
// в окно записи и гарантированно содержит свободные слоты 09:00–21:00.
const DAY_INDEX = 1

type EventType = { id: number; name: string; description: string; duration_minutes: number }
type Slot = { start: string; end: string }

/** Календарный день `YYYY-MM-DD` в поясе владельца со сдвигом `offsetDays`. */
function ownerDay(offsetDays: number): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: OWNER_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string): string => parts.find((item) => item.type === type)?.value ?? ''
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const [year, month, date] = today.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, date + offsetDays)).toISOString().slice(0, 10)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Заводит тип события через настоящий HTTP API бэкенда. */
async function createEventType(request: APIRequestContext, name: string): Promise<EventType> {
  const response = await request.post(`${BACKEND_URL}/api/event-types`, {
    data: { name, description: 'Созвон для проверки записи', duration_minutes: 30 },
  })
  expect(response.status(), 'тип события должен создаться').toBe(201)
  return (await response.json()) as EventType
}

/** Свободные слоты типа на день — тем же API, что использует фронтенд. */
async function listSlots(
  request: APIRequestContext,
  eventTypeId: number,
  day: string,
): Promise<Slot[]> {
  const response = await request.get(`${BACKEND_URL}/api/event-types/${eventTypeId}/slots`, {
    params: { date: day },
  })
  expect(response.ok(), 'слоты должны отдаться').toBeTruthy()
  return (await response.json()) as Slot[]
}

/** Занимает время в обход UI — тем же API, что и фронтенд. */
async function bookViaApi(
  request: APIRequestContext,
  body: { event_type_id: number; start: string; guest_name: string },
): Promise<void> {
  const response = await request.post(`${BACKEND_URL}/api/bookings`, { data: body })
  expect(response.status(), 'конфликтующая запись должна создаться').toBe(201)
}

async function selectEventType(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(escapeRegExp(name)) }).click()
}

async function selectDay(page: Page): Promise<void> {
  await page.getByRole('group', { name: 'Выберите день' }).getByRole('button').nth(DAY_INDEX).click()
}

test('гость выбирает тип, день и записывается на свободный слот', async ({ page, request }) => {
  const name = `Созвон ${Date.now()}`
  await createEventType(request, name)

  await page.goto('/book')
  await selectEventType(page, name)
  await selectDay(page)

  const slots = page.getByRole('list', { name: 'Свободные слоты' })
  const firstSlot = slots.getByTestId('slot').first()
  await expect(firstSlot).toBeVisible()
  const bookedTime = (await firstSlot.textContent())!.trim()

  await firstSlot.click()
  await page.getByLabel('Имя').fill('Гость Тестовый')
  await page.getByLabel('Email').fill('guest@example.com')
  await page.getByLabel('Заметка').fill('Позвонить по проекту')
  await page.getByRole('button', { name: 'Записаться', exact: true }).click()

  // Подтверждение записи.
  await expect(page.getByRole('heading', { name: 'Запись оформлена' })).toBeVisible()
  await expect(page.getByText('Гость Тестовый')).toBeVisible()
  await expect(page.getByText(bookedTime)).toBeVisible()

  // Занятый слот больше не предлагается: открываем /book заново и смотрим тот же день.
  await page.goto('/book')
  await selectEventType(page, name)
  await selectDay(page)
  await expect(slots.getByTestId('slot').first()).toBeVisible()
  await expect(slots.getByTestId('slot').filter({ hasText: bookedTime })).toHaveCount(0)
})

test('конфликт на занятый слот показывает понятное сообщение', async ({ page, request }) => {
  const name = `Созвон ${Date.now()} конфликт`
  const eventType = await createEventType(request, name)
  const day = ownerDay(DAY_INDEX)

  await page.goto('/book')
  await selectEventType(page, name)
  await selectDay(page)

  const slots = page.getByRole('list', { name: 'Свободные слоты' })
  await expect(slots.getByTestId('slot').first()).toBeVisible()

  // Пока список слотов загружен, занимаем первый слот в обход UI.
  const available = await listSlots(request, eventType.id, day)
  expect(available.length, 'в дне должны быть свободные слоты').toBeGreaterThan(0)
  await bookViaApi(request, {
    event_type_id: eventType.id,
    start: available[0].start,
    guest_name: 'Другой гость',
  })

  // Гость по-прежнему видит устаревший список и пробует записаться на занятый слот.
  await slots.getByTestId('slot').first().click()
  await page.getByLabel('Имя').fill('Опоздавший гость')
  await page.getByRole('button', { name: 'Записаться', exact: true }).click()

  await expect(page.getByRole('alert')).toHaveText('Это время уже занято, выберите другой слот')
})
