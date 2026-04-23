import {
  getDayEvents,
  getDayFreeSlots,
  getDayEventsAndSlots,
  confirmAndCreateBlock,
  deleteBlockAndEvent,
} from '@/modules/agenda/services/agenda.service'
import { localDateStr, localTimeStr, localDateTimeStr, startOfDayInTZ, parseDateTimeInTZ } from '@/lib/dateUtils'
import { USER_TIMEZONE } from '@/lib/timezone'
import type { CalendarEvent, FreeSlot, BlockType } from '@/types'

const PLACEHOLDER_TOOLS = new Set([
  'get_transactions', 'analyze_spending',
  'send_email', 'create_task',
  'compare_prices',
  'get_tasks', 'prioritize_tasks',
])

export async function executeTool(
  rawName: string,
  args: Record<string, unknown>,
  userId: string,
  validToolNames: Set<string>,
  timezone = USER_TIMEZONE
): Promise<unknown> {
  const name = rawName.replace(/^_+/, '')
  console.log(`[toolExecutor] ${name}`, JSON.stringify(args))

  if (!validToolNames.has(name)) {
    console.warn(`[toolExecutor] unknown tool: "${name}"`)
    return { error: `Herramienta "${name}" no disponible. Disponibles: ${[...validToolNames].join(', ')}` }
  }

  if (PLACEHOLDER_TOOLS.has(name)) {
    console.log(`[toolExecutor] placeholder: "${name}"`)
    return { error: `La herramienta "${name}" está en desarrollo. Próximamente disponible.` }
  }

  const todayStr = localDateStr(new Date(), timezone)

  // ── Agenda ─────────────────────────────────────────────────────────────────

  switch (name) {
    case 'get_day_events': {
      const dateStr = (args.date as string | undefined) ?? todayStr
      const date = startOfDayInTZ(dateStr, timezone)
      console.log(`[toolExecutor] INPUT date="${args.date}" timezone="${timezone}" → PARSED=${date.toISOString()} (${localDateStr(date, timezone)})`)
      const events = await getDayEvents(userId, date, timezone)
      const result = {
        date: date.toLocaleDateString('es', { timeZone: timezone }),
        events: events.map((e: CalendarEvent) => ({
          id: e.id,
          title: e.title,
          start: e.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }),
          end: e.end.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }),
          isAllDay: e.isAllDay,
          description: e.description,
        })),
        total: events.length,
      }
      console.log(`[toolExecutor] get_day_events → ${events.length} eventos`)
      return result
    }

    case 'get_free_slots': {
      const date = startOfDayInTZ((args.date as string | undefined) ?? todayStr, timezone)
      const slots = await getDayFreeSlots(userId, date, timezone)
      return {
        date: date.toLocaleDateString('es', { timeZone: timezone }),
        freeSlots: slots.map((s: FreeSlot) => ({
          start: s.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }),
          end: s.end.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }),
          durationMinutes: s.durationMinutes,
        })),
        total: slots.length,
      }
    }

    case 'suggest_day_plan': {
      const date = startOfDayInTZ((args.date as string | undefined) ?? todayStr, timezone)
      const { events, slots } = await getDayEventsAndSlots(userId, date, timezone)
      return {
        date: date.toLocaleDateString('es', { timeZone: timezone }),
        existingEvents: events.map((e: CalendarEvent) => ({
          id: e.id,
          title: e.title,
          start: e.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }),
          end: e.end.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }),
        })),
        freeSlots: slots.map((s: FreeSlot) => ({
          start: s.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
          end: s.end.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
          durationMinutes: s.durationMinutes,
        })),
        priorities: args.priorities ?? [],
      }
    }

    case 'propose_block': {
      const title = (args.title as string | null | undefined)?.trim()
      const rawType = args.type as string | null | undefined
      const rawStart = args.startTime as string | null | undefined
      const rawEnd = args.endTime as string | null | undefined

      const VALID_TYPES = new Set<string>(['FOCUS', 'MEETING', 'BREAK', 'TASK', 'EXERCISE', 'PERSONAL'])

      if (!title) return { error: 'Falta el título del bloque.' }
      if (!rawType || !VALID_TYPES.has(rawType)) {
        return { error: `Tipo inválido "${rawType}". Debe ser: FOCUS, MEETING, BREAK, TASK, EXERCISE, PERSONAL.` }
      }
      if (!rawStart || !rawEnd) {
        return { error: 'Faltan startTime o endTime en formato ISO 8601.' }
      }

      const startTime = parseDateTimeInTZ(rawStart, timezone)
      const endTime = parseDateTimeInTZ(rawEnd, timezone)

      console.log(`[toolExecutor] INPUT startTime="${rawStart}" endTime="${rawEnd}"`)
      console.log(`[toolExecutor] FINAL DATES: start=${startTime.toISOString()} end=${endTime.toISOString()}`)

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return { error: `Fecha inválida (recibido: "${rawStart}", "${rawEnd}"). Usa ISO 8601 con offset: ${todayStr}T15:00:00-03:00.` }
      }
      if (endTime <= startTime) {
        return { error: `endTime debe ser posterior a startTime.` }
      }

      const VALID_ITEM_TYPES = new Set(['event', 'task', 'reminder'])
      const itemType = VALID_ITEM_TYPES.has(args.itemType as string)
        ? (args.itemType as 'event' | 'task' | 'reminder')
        : 'event'
      const syncToGoogle = itemType === 'event'

      const block = await confirmAndCreateBlock(userId, {
        title,
        description: args.description as string | undefined,
        startTime,
        endTime,
        type: rawType as BlockType,
        itemType,
        syncToGoogle,
        reminderAt: itemType === 'reminder' ? startTime : undefined,
        timezone,
      })

      const startLocal = localTimeStr(block.startTime, timezone)
      const endLocal = localTimeStr(block.endTime, timezone)
      const dateLocal = localDateStr(block.startTime, timezone)

      const confirmMsg =
        itemType === 'task'
          ? `Creé la tarea: "${block.title}" para el ${dateLocal}.`
          : itemType === 'reminder'
          ? `Te voy a recordar "${block.title}" el ${dateLocal} a las ${startLocal}.`
          : `Agendé "${block.title}" el ${dateLocal} de ${startLocal} a ${endLocal}.`

      console.log(`[toolExecutor] propose_block → created blockId=${block.id} itemType=${itemType} startLocal=${startLocal} startUTC=${block.startTime.toISOString()}`)
      return {
        created: true,
        blockId: block.id,
        itemType,
        title: block.title,
        startTime: localDateTimeStr(block.startTime, timezone),
        endTime: localDateTimeStr(block.endTime, timezone),
        syncedToGoogle: !!block.externalId,
        message: confirmMsg,
      }
    }

    case 'delete_event': {
      const blockId = (args.blockId as string | null | undefined)?.trim()
      if (!blockId) {
        return { error: 'Falta blockId. Llamá get_day_events primero para obtener el ID.' }
      }
      const result = await deleteBlockAndEvent(userId, blockId)
      console.log(`[toolExecutor] delete_event blockId=${blockId} → deleted=${result.deleted}`)
      return { deleted: result.deleted, wasInGoogle: result.wasInGoogle, message: 'Evento eliminado.' }
    }

    default:
      return { error: `Herramienta "${name}" no implementada.` }
  }
}
