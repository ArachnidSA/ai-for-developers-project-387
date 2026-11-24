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

/** Человекочитаемое имя пояса владельца (город) для подписей времени. */
export const OWNER_TIME_ZONE_CITY = 'Екатеринбург'

/**
 * Смещение пояса `timeZone` относительно UTC в момент `moment` в виде «UTC+5»
 * («UTC+5:30» для нецелого смещения, «UTC» для нулевого). Смещение может зависеть
 * от даты (переход на летнее время), поэтому передаём конкретный момент.
 */
export function utcOffsetLabel(moment: Date, timeZone: string = OWNER_TIME_ZONE): string {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(moment)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(name)
  if (match === null) {
    return 'UTC'
  }
  const [, sign, hours, minutes] = match
  const offset = Number(hours)
  const restMinutes = minutes === undefined ? 0 : Number(minutes)
  if (offset === 0 && restMinutes === 0) {
    return 'UTC'
  }
  return restMinutes === 0 ? `UTC${sign}${offset}` : `UTC${sign}${offset}:${minutes}`
}

/** Подпись пояса владельца, например «Екатеринбург, UTC+5». */
export function ownerTimeZoneLabel(moment: Date = new Date()): string {
  return `${OWNER_TIME_ZONE_CITY}, ${utcOffsetLabel(moment, OWNER_TIME_ZONE)}`
}
