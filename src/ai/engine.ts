import type OpenAI from 'openai'
import { openai } from '@/lib/openai'
import { prisma } from '@/lib/prisma'
import { getToolsForModule, getValidToolNames } from './tool-registry'
import { buildAgendaSystemPrompt } from '@/modules/agenda/prompts/agenda.prompt'
import { getDayEvents, getDayFreeSlots, getDayEventsAndSlots, confirmAndCreateBlock } from '@/modules/agenda/services/agenda.service'
import { deleteCalendarEvent } from '@/integrations/google/calendar'
import type { ModuleKey, CalendarEvent, FreeSlot, BlockType } from '@/types'
import type { Message } from '@prisma/client'

interface RunAgentOptions {
  userId: string
  conversationId: string
  userMessage: string
  module: ModuleKey
  userName: string
  timezone?: string
  workdayStart?: string
  workdayEnd?: string
}

interface AgentResult {
  response: string
  blockCreated?: boolean
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(module: ModuleKey, ctx: {
  userName: string
  timezone: string
  workdayStart: string
  workdayEnd: string
}): string {
  const now = new Date()
  const currentDate = now.toLocaleDateString('es', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const currentTime = now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (module === 'AGENDA') {
    return buildAgendaSystemPrompt({
      userName: ctx.userName,
      currentDate,
      currentTime,
      timezone: ctx.timezone,
      workdayStart: ctx.workdayStart,
      workdayEnd: ctx.workdayEnd,
    })
  }

  return `Eres el asistente personal de ${ctx.userName}. Módulo: ${module}.`
}

// ─── Tool executor ────────────────────────────────────────────────────────────

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  validToolNames: Set<string>
): Promise<unknown> {
  // Normalize: llama-3.3-70b on Groq sometimes prefixes tool names with "_"
  const normalizedName = toolName.replace(/^_+/, '')

  if (!validToolNames.has(normalizedName)) {
    console.warn(`[agent] Unknown tool called: "${toolName}" (normalized: "${normalizedName}")`)
    return { error: `Tool "${normalizedName}" no está disponible. Solo puedes usar: ${[...validToolNames].join(', ')}` }
  }

  const today = new Date()

  switch (normalizedName) {
    case 'get_day_events': {
      const date = args.date ? parseLocalDate(args.date as string) : today
      const events = await getDayEvents(userId, date)
      return {
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

      if (!title) {
        return { error: 'Falta el título del bloque.' }
      }
      if (!rawType || !VALID_TYPES.has(rawType)) {
        return { error: `Tipo inválido "${rawType}". Debe ser uno de: FOCUS, MEETING, BREAK, TASK, EXERCISE, PERSONAL.` }
      }
      if (!rawStart || !rawEnd) {
        return { error: 'Faltan startTime o endTime. Proporciona fecha y hora de inicio y fin en ISO 8601.' }
      }

      const startTime = new Date(rawStart)
      const endTime = new Date(rawEnd)

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return { error: `Formato de fecha inválido (recibido: "${rawStart}", "${rawEnd}"). Usa ISO 8601, ej: ${today.toISOString().slice(0, 10)}T15:00:00.` }
      }
      if (endTime <= startTime) {
        return { error: `endTime debe ser posterior a startTime (inicio: "${rawStart}", fin: "${rawEnd}").` }
      }

      const block = await confirmAndCreateBlock(userId, {
        title,
        description: args.description as string | undefined,
        startTime,
        endTime,
        type: rawType as BlockType,
        syncToGoogle: true,
      })
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
      const eventId = args.eventId as string
      const eventTitle = args.eventTitle as string
      await deleteCalendarEvent(userId, eventId)
      return { deleted: true, eventTitle, message: `Evento "${eventTitle}" eliminado de Google Calendar.` }
    }

    default:
      return { error: `Tool "${normalizedName}" no implementada.` }
  }
}

// ─── Agent loop ───────────────────────────────────────────────────────────────

const SCHEDULING_RE = /\b(agend[aáe]|agendame|agreg[aá]|agregame|program[aá]|programame|bloqu[eé][aá]|bloqueame|reserv[aá]|reservame|anot[aá]|anotame|cre[aá]|ponm?e|pon[eé])\b/i

function detectSchedulingIntent(message: string): boolean {
  return SCHEDULING_RE.test(message)
}

export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const {
    userId, conversationId, userMessage, module,
    userName,
    timezone = 'America/Argentina/Buenos_Aires',
    workdayStart = '09:00',
    workdayEnd = '18:00',
  } = options

  await prisma.message.create({
    data: { conversationId, role: 'USER', content: userMessage },
  })

  const history = await prisma.message.findMany({
    where: { conversationId, role: { in: ['USER', 'ASSISTANT'] } },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const systemPrompt = buildSystemPrompt(module, { userName, timezone, workdayStart, workdayEnd })
  const tools = getToolsForModule(module)
  const validToolNames = getValidToolNames(module)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: Message) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content as string,
    })),
  ]

  let blockCreated = false
  const mustUseTool = tools.length > 0 && detectSchedulingIntent(userMessage)

  for (let i = 0; i < 5; i++) {
    const toolChoice = tools.length > 0
      ? (mustUseTool && i === 0 ? 'required' : 'auto')
      : undefined

    const completion = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: toolChoice,
    })

    const choice = completion.choices[0]

    if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) {
      const finalContent = choice.message.content ?? ''
      await prisma.message.create({
        data: { conversationId, role: 'ASSISTANT', content: finalContent },
      })
      return { response: finalContent, blockCreated }
    }

    messages.push(choice.message)

    for (const tc of choice.message.tool_calls) {
      const fn = (tc as OpenAI.Chat.ChatCompletionMessageFunctionToolCall).function
      let args: Record<string, unknown> = {}

      try {
        args = JSON.parse(fn.arguments) as Record<string, unknown>
      } catch {
        args = {}
      }

      let result: unknown
      try {
        result = await executeToolCall(fn.name, args, userId, validToolNames)
      } catch (err) {
        result = { error: err instanceof Error ? err.message : 'Error al ejecutar herramienta' }
      }

      const normalizedName = fn.name.replace(/^_+/, '')
      if (normalizedName === 'propose_block' && (result as Record<string, unknown>)?.created) {
        blockCreated = true
      }

      await prisma.message.create({
        data: {
          conversationId,
          role: 'TOOL',
          content: JSON.stringify(result),
          toolName: normalizedName,
          toolInput: args as unknown as import('@prisma/client').Prisma.InputJsonValue,
          toolOutput: result as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      })

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }
  }

  return { response: 'No pude completar la solicitud. Intenta de nuevo.', blockCreated }
}

export async function getOrCreateConversation(userId: string, module: ModuleKey) {
  const existing = await prisma.conversation.findFirst({
    where: { userId, module },
    orderBy: { updatedAt: 'desc' },
  })

  if (existing) return existing

  return prisma.conversation.create({
    data: { userId, module, title: `Agenda — ${new Date().toLocaleDateString('es')}` },
  })
}
