/**
 * Timezone-aware date helpers using Intl APIs (Node.js built-in, no extra deps).
 *
 * Root problem solved: Date.toISOString().slice(0, 10) returns the UTC date, not
 * the user's local date. At 23:00 Buenos Aires (UTC-3), UTC is already the next
 * day — so the AI prompt said "today = April 23" when it was still April 22.
 */

/** Returns "YYYY-MM-DD" in the given IANA timezone (never in UTC). */
export function localDateStr(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date)
}

/** Returns "HH:mm" in the given IANA timezone. */
export function localTimeStr(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Returns the UTC offset for a timezone as "+HH:MM" or "-HH:MM".
 * Used to append to ISO strings so the AI sends fully-qualified datetimes.
 */
export function tzOffsetLabel(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date)
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const m = tz.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!m) return '+00:00'
  return `${m[1]}${m[2].padStart(2, '0')}:${(m[3] ?? '0').padStart(2, '0')}`
}

/** Internal: UTC offset in milliseconds for a timezone at a given moment. */
function getTZOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date)
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'
  const m = tz.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!m) return 0
  const sign = m[1] === '+' ? 1 : -1
  return sign * (parseInt(m[2]) * 60 + parseInt(m[3] ?? '0')) * 60000
}

/**
 * Returns a Date representing 00:00:00 on dateStr in the given timezone.
 * e.g. "2026-04-23" + Buenos Aires (UTC-3) → 2026-04-23T03:00:00Z
 */
export function startOfDayInTZ(dateStr: string, timezone: string): Date {
  // Use noon to safely determine the timezone offset (avoids DST boundaries at midnight)
  const ref = new Date(`${dateStr}T12:00:00Z`)
  const offsetMs = getTZOffsetMs(ref, timezone)
  return new Date(new Date(`${dateStr}T00:00:00Z`).getTime() - offsetMs)
}

/**
 * Returns a Date representing 23:59:59.999 on dateStr in the given timezone.
 */
export function endOfDayInTZ(dateStr: string, timezone: string): Date {
  return new Date(startOfDayInTZ(dateStr, timezone).getTime() + 86400000 - 1)
}

/**
 * Parses an ISO datetime string in the given timezone.
 * If the string already has a timezone (Z or ±HH:MM) it is used as-is.
 * If not (e.g. "2026-04-23T12:00:00"), the user's timezone offset is appended.
 */
export function parseDateTimeInTZ(str: string, timezone: string): Date {
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str)
  }
  // Get the offset for the date in the string (handles DST correctly per date)
  const datePart = str.split('T')[0]
  const offset = tzOffsetLabel(new Date(`${datePart}T12:00:00Z`), timezone)
  return new Date(`${str}${offset}`)
}
