import { prisma } from '@/lib/prisma'
import {
  getEventsForDay,
  getEventsForRange,
  createCalendarEvent,
  deleteCalendarEvent,
  findFreeSlots,
} from '@/integrations/google/calendar'
import { CalendarEvent, FreeSlot } from '@/types'

export async function getDayEvents(userId: string, date: Date, timezone?: string): Promise<CalendarEvent[]> {
  return getEventsForDay(userId, date, timezone)
}

export async function getWeekEvents(userId: string, startDate: Date): Promise<CalendarEvent[]> {
  const end = new Date(startDate)
  end.setDate(end.getDate() + 7)
  return getEventsForRange(userId, startDate, end)
}

export async function getDayFreeSlots(userId: string, date: Date, timezone?: string): Promise<FreeSlot[]> {
  const [prefs, events] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    getEventsForDay(userId, date, timezone),
  ])
  const tz = timezone ?? prefs?.timezone ?? 'America/Argentina/Buenos_Aires'
  return findFreeSlots(events, date, prefs?.workdayStart ?? '09:00', prefs?.workdayEnd ?? '18:00', 30, tz)
}

export async function getDayEventsAndSlots(userId: string, date: Date, timezone?: string) {
  const [prefs, events] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    getEventsForDay(userId, date, timezone),
  ])
  const tz = timezone ?? prefs?.timezone ?? 'America/Argentina/Buenos_Aires'
  const slots = findFreeSlots(events, date, prefs?.workdayStart ?? '09:00', prefs?.workdayEnd ?? '18:00', 30, tz)
  return { events, slots }
}

export async function confirmAndCreateBlock(
  userId: string,
  block: {
    title: string
    description?: string
    startTime: Date
    endTime: Date
    type: 'FOCUS' | 'MEETING' | 'BREAK' | 'TASK' | 'EXERCISE' | 'PERSONAL'
    itemType?: 'event' | 'task' | 'reminder'
    syncToGoogle?: boolean
    reminderAt?: Date
  }
) {
  let externalId: string | undefined

  if (block.syncToGoogle) {
    try {
      externalId = await createCalendarEvent(userId, {
        title: block.title,
        description: block.description,
        startTime: block.startTime,
        endTime: block.endTime,
      })
    } catch {
      // Si falla la sync, igual guardamos localmente
    }
  }

  const itemTypeMap = { event: 'EVENT', task: 'TASK', reminder: 'REMINDER' } as const
  const prismaItemType = itemTypeMap[block.itemType ?? 'event']

  return prisma.agendaBlock.create({
    data: {
      userId,
      title: block.title,
      description: block.description,
      startTime: block.startTime,
      endTime: block.endTime,
      type: block.type,
      itemType: prismaItemType,
      source: 'AI_SUGGESTED',
      confirmed: true,
      reminderAt: block.reminderAt,
      externalId,
    },
  })
}

export async function deleteBlockAndEvent(
  userId: string,
  id: string
): Promise<{ deleted: boolean; wasInGoogle: boolean }> {
  let block = await prisma.agendaBlock.findFirst({ where: { id, userId } })
  if (!block) {
    block = await prisma.agendaBlock.findFirst({ where: { externalId: id, userId } })
  }

  let wasInGoogle = false

  if (block) {
    if (block.externalId) {
      const r = await deleteCalendarEvent(userId, block.externalId)
      wasInGoogle = r.deleted
    }
    await prisma.agendaBlock.delete({ where: { id: block.id } })
  } else {
    const r = await deleteCalendarEvent(userId, id)
    wasInGoogle = r.deleted
  }

  return { deleted: true, wasInGoogle }
}

export async function getBlocksForDay(userId: string, date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return prisma.agendaBlock.findMany({
    where: { userId, startTime: { gte: start }, endTime: { lte: end } },
    orderBy: { startTime: 'asc' },
  })
}
