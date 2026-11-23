// Календарные дни окна записи. «Сегодня» считается в поясе владельца (ADR-0002),
// а не в поясе браузера гостя: окно из 14 дней и граница прошедших дат принадлежат
// владельцу, поэтому и гость, и сервер отталкиваются от одной точки отсчёта.

/** Пояс владельца. Та же константа на бэкенде — `app.services.slots.OWNER_TIMEZONE`. */
export const OWNER_TIME_ZONE = 'Asia/Yekaterinburg'

/** Окно записи — 14 календарных дней от «сегодня» включительно. */
export const BOOKING_WINDOW_DAYS = 14

/** Календарный день `YYYY-MM-DD`, которому принадлежит момент `moment` в поясе `timeZone`. */
export function dayInTimeZone(moment: Date, timeZone: string = OWNER_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(moment)
  const part = (type: string): string => {
    const found = parts.find((item) => item.type === type)
    if (found === undefined) {
      throw new Error(`Нет части даты «${type}»`)
    }
    return found.value
  }
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** Сдвигает календарный день `YYYY-MM-DD` на `count` дней (может быть отрицательным). */
export function addDays(day: string, count: number): string {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, date + count)).toISOString().slice(0, 10)
}

/**
 * Дни окна записи: `windowDays` календарных дней подряд, начиная с «сегодня»
 * в поясе владельца. Прошедшие и выходящие за окно даты сюда не попадают,
 * поэтому их нельзя выбрать.
 */
export function bookingDays(
  now: Date,
  options: { windowDays?: number; timeZone?: string } = {},
): string[] {
  const { windowDays = BOOKING_WINDOW_DAYS, timeZone = OWNER_TIME_ZONE } = options
  const today = dayInTimeZone(now, timeZone)
  return Array.from({ length: windowDays }, (_, index) => addDays(today, index))
}

/** Попадает ли день в окно записи (включая «сегодня» и последний день окна). */
export function isWithinBookingWindow(
  day: string,
  today: string,
  windowDays: number = BOOKING_WINDOW_DAYS,
): boolean {
  return day >= today && day <= addDays(today, windowDays - 1)
}
