import { describe, expect, it } from 'vitest'

import {
  addDays,
  bookingDays,
  dayInTimeZone,
  isWithinBookingWindow,
  OWNER_TIME_ZONE,
} from './dates'

// Момент, когда в UTC ещё 20-е число, а у владельца (UTC+5) уже 21-е.
const LATE_EVENING_UTC = new Date('2026-11-20T19:00:00Z')

describe('дни окна записи считаются в поясе владельца', () => {
  it('переводит момент в календарный день пояса владельца', () => {
    expect(dayInTimeZone(new Date('2026-11-20T18:59:00Z'), OWNER_TIME_ZONE)).toBe('2026-11-20')
    expect(dayInTimeZone(LATE_EVENING_UTC, OWNER_TIME_ZONE)).toBe('2026-11-21')
  })

  it('начинает окно с «сегодня» владельца, а не с локальной даты браузера', () => {
    const days = bookingDays(LATE_EVENING_UTC, { timeZone: OWNER_TIME_ZONE })

    expect(days[0]).toBe('2026-11-21')
    expect(days).toHaveLength(14)
    expect(days[13]).toBe('2026-12-04')
  })

  it('не предлагает прошедшие и выходящие за окно даты', () => {
    const days = bookingDays(LATE_EVENING_UTC, { timeZone: OWNER_TIME_ZONE })

    expect(days).not.toContain('2026-11-20')
    expect(isWithinBookingWindow('2026-11-20', '2026-11-21')).toBe(false)
    expect(isWithinBookingWindow('2026-12-04', '2026-11-21')).toBe(true)
    expect(isWithinBookingWindow('2026-12-05', '2026-11-21')).toBe(false)
  })

  it('сдвигает день через границу месяца', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-01', -1)).toBe('2026-11-30')
  })

  it('по умолчанию использует пояс владельца', () => {
    expect(bookingDays(LATE_EVENING_UTC)).toEqual(
      bookingDays(LATE_EVENING_UTC, { timeZone: OWNER_TIME_ZONE }),
    )
  })
})
