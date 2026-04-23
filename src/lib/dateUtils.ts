/**
 * Timezone-aware date helpers using date-fns-tz.
 *
 * Root problem solved: Date.toISOString().slice(0,10) returns the UTC date.
 * At 23:00 Buenos Aires (UTC-3) UTC is already the next day — the AI was
 * being told "today = April 23" when it was still April 22, so "mañana"
 * resolved to April 24 (Friday) instead of April 23 (Thursday).
 *
 * Rule: NEVER call .toISOString().slice(0,10) for display/AI dates.
 *       ALWAYS use localDateStr(date, timezone).
 */

import { format, fromZonedTime } from 'date-fns-tz'
import { addDays } from 'date-fns'
import { USER_TIMEZONE } from '@/lib/timezone'

/** Returns "YYYY-MM-DD" in the given IANA timezone — never the UTC date. */
export function localDateStr(date: Date, timezone = USER_TIMEZONE): string {
  return format(date, 'yyyy-MM-dd', { timeZone: timezone })
}

/** Returns "HH:mm" in the given IANA timezone. */
export function localTimeStr(date: Date, timezone = USER_TIMEZONE): string {
  return format(date, 'HH:mm', { timeZone: timezone })
}

/** Returns the UTC offset as "+HH:MM" or "-HH:MM" (e.g. "-03:00" for Buenos Aires). */
export function tzOffsetLabel(date: Date, timezone = USER_TIMEZONE): string {
  return format(date, 'xxx', { timeZone: timezone })
}

/**
 * Returns a Date representing 00:00:00 on dateStr in the given timezone.
 * e.g. "2026-04-23" + Buenos Aires (UTC-3) → 2026-04-23T03:00:00Z
 */
export function startOfDayInTZ(dateStr: string, timezone = USER_TIMEZONE): Date {
  return fromZonedTime(`${dateStr}T00:00:00.000`, timezone)
}

/**
 * Returns a Date representing 23:59:59.999 on dateStr in the given timezone.
 */
export function endOfDayInTZ(dateStr: string, timezone = USER_TIMEZONE): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, timezone)
}

export function dayRangeInTZ(dateStr: string, timezone = USER_TIMEZONE) {
  const startOfDay = startOfDayInTZ(dateStr, timezone)
  const endOfDay = endOfDayInTZ(dateStr, timezone)
  return {
    dateStr,
    timezone,
    startOfDay,
    endOfDay,
    startUTC: startOfDay.toISOString(),
    endUTC: endOfDay.toISOString(),
  }
}

/**
 * Parses an ISO datetime string in the given timezone.
 * If the string already carries a timezone (Z or ±HH:MM) it is used as-is.
 * If not (e.g. "2026-04-23T12:00:00"), the user's offset is applied so the
 * result is always correct regardless of server timezone.
 */
export function parseDateTimeInTZ(str: string, timezone = USER_TIMEZONE): Date {
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str)
  }
  const [datePart, timePart = '00:00:00'] = str.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number)
  const normalized = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
  return fromZonedTime(normalized, timezone)
}

/** Returns the current moment (same as new Date() but self-documents intent). */
export function getNow(): Date {
  return new Date()
}

/** Adds n days to a date and returns the YYYY-MM-DD string in the given timezone. */
export function addDaysStr(date: Date, n: number, timezone: string): string {
  return localDateStr(addDays(date, n), timezone)
}
