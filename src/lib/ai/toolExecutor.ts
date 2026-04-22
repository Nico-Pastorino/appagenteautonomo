import {
  getDayEvents,
  getDayFreeSlots,
  getDayEventsAndSlots,
  confirmAndCreateBlock,
  deleteBlockAndEvent,
} from '@/modules/agenda/services/agenda.service'
import type { CalendarEvent, FreeSlot, BlockType } from '@/types'

const PLACEHOLDER_TOOLS = new Set([
  'get_transactions', 'analyze_spending',
  'send_email', 'create_task',
  'compare_prices',
  'get_tasks', 'prioritize_tasks',
])

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export async function executeTool(
  rawName: string,
  args: Record<string, unknown>,
  userId: string,
  validToolNames: Set<string>
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

  const today = new Date()

  // ── Agenda ─────────────────────────────────────────────────────────────────

  switch (name) {
    case 'get_day_events': {
      const date = args.date ? parseLocalDate(args.date as string) : today
      const events = await getDayEvents(userId, date)
      const result = {
        date: date.toLocaleDateString('es'),
        events: events.map((e: CalendarEvent) => ({
          id: e.id,
          title: e.title,
          start: e.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
          end: e.end.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
          isAllDay: e.isAllDay,
          description: e.description,
        })),
        total: events.length,
      }
      console.log(`[toolExecutor] get_day_events → ${events.length} eventos`)
      return result
    }

    case 'get_free_slots': {
      const date = args.date ? parseLocalDate(args.date as string) : today
      const slots = await getDayFreeSlots(userId, date)
      return {
        date: date.toLocaleDateString('es'),
        freeSlots: slots.map((s: FreeSlot) => ({
          start: s.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
          end: s.end.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
          durationMinutes: s.durationMinutes,
        })),
        total: slots.length,
      }
    }

    case 'suggest_day_plan': {
      const date = args.date ? parseLocalDate(args.date as string) : today
      const { events, slots } = await getDayEventsAndSlots(userId, date)
      return {
        date: date.toLocaleDateString('es'),
        existingEvents: events.map((e: CalendarEvent) => ({
          id: e.id,
          title: e.title,
          start: e.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
          end: e.end.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false }),
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

      const startTime = new Date(rawStart)
      const endTime = new Date(rawEnd)

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return { error: `Fecha inválida (recibido: "${rawStart}", "${rawEnd}"). Usa ISO 8601: ${today.toISOString().slice(0, 10)}T15:00:00.` }
      }
      if (endTime <= startTime) {
        return { error: `endTime debe ser posterior a startTime.` }
      }

      const block = await confirmAndCreateBlock(userId, {
        title,
        description: args.description as string | undefined,
        startTime,
        endTime,
        type: rawType as BlockType,
        syncToGoogle: true,
      })

      console.log(`[toolExecutor] propose_block → created blockId=${block.id}`)
      return {
        created: true,
        blockId: block.id,
        title: block.title,
        startTime: block.startTime.toISOString(),
        endTime: block.endTime.toISOString(),
        syncedToGoogle: !!block.externalId,
        message: `Bloque "${block.title}" creado y sincronizado.`,
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
