import { google, calendar_v3 } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { CalendarEvent, FreeSlot } from '@/types'

function mapGoogleEvent(item: calendar_v3.Schema$Event): CalendarEvent {
  return {
    id: item.id ?? '',
    title: item.summary ?? 'Sin título',
    start: new Date(item.start?.dateTime ?? item.start?.date ?? ''),
    end: new Date(item.end?.dateTime ?? item.end?.date ?? ''),
    description: item.description ?? undefined,
    location: item.location ?? undefined,
    isAllDay: !item.start?.dateTime,
    source: 'google',
    externalId: item.id ?? undefined,
  }
}

async function getCalendarClient(userId: string) {
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: 'GOOGLE_CALENDAR' } },
  })

  if (!integration?.accessToken) {
    throw new Error('Google Calendar no conectado')
  }

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000') + '/api/auth/callback/google'
  )

  if (integration.expiresAt && integration.expiresAt < new Date() && integration.refreshToken) {
    oauth2.setCredentials({ refresh_token: integration.refreshToken })
    const { credentials } = await oauth2.refreshAccessToken()

    await prisma.integration.update({
      where: { userId_provider: { userId, provider: 'GOOGLE_CALENDAR' } },
      data: {
        accessToken: credentials.access_token,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      },
    })

    oauth2.setCredentials(credentials)
  } else {
    oauth2.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken ?? undefined,
    })
  }

  return google.calendar({ version: 'v3', auth: oauth2 })
}

export async function getEventsForDay(userId: string, date: Date): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(userId)

  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })

  return (res.data.items ?? []).map(mapGoogleEvent)
}

export async function getEventsForRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(userId)

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  })

  return (res.data.items ?? []).map(mapGoogleEvent)
}

export async function createCalendarEvent(
  userId: string,
  event: {
    title: string
    description?: string
    startTime: Date
    endTime: Date
  }
): Promise<string> {
  const calendar = await getCalendarClient(userId)

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.title,
      description: event.description,
      start: { dateTime: event.startTime.toISOString() },
      end: { dateTime: event.endTime.toISOString() },
    },
  })

  return res.data.id ?? ''
}

export async function deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
  const calendar = await getCalendarClient(userId)
  await calendar.events.delete({ calendarId: 'primary', eventId })
}

export function findFreeSlots(
  events: CalendarEvent[],
  date: Date,
  workdayStart = '09:00',
  workdayEnd = '18:00',
  minSlotMinutes = 30
): FreeSlot[] {
  const [startH, startM] = workdayStart.split(':').map(Number)
  const [endH, endM] = workdayEnd.split(':').map(Number)

  const dayStart = new Date(date)
  dayStart.setHours(startH, startM, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(endH, endM, 0, 0)

  const timedEvents = events
    .filter((e) => !e.isAllDay)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  const slots: FreeSlot[] = []
  let cursor = dayStart

  for (const event of timedEvents) {
    if (event.start > cursor) {
      const duration = Math.round((event.start.getTime() - cursor.getTime()) / 60000)
      if (duration >= minSlotMinutes) {
        slots.push({ start: new Date(cursor), end: new Date(event.start), durationMinutes: duration })
      }
    }
    if (event.end > cursor) {
      cursor = new Date(event.end)
    }
  }

  if (cursor < dayEnd) {
    const duration = Math.round((dayEnd.getTime() - cursor.getTime()) / 60000)
    if (duration >= minSlotMinutes) {
      slots.push({ start: new Date(cursor), end: new Date(dayEnd), durationMinutes: duration })
    }
  }

  return slots
}
