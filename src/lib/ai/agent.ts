import type OpenAI from 'openai'
import { openai } from './openai'
import { prisma } from '@/lib/prisma'
import { getToolsForModule, getValidToolNames } from './tools'
import { executeTool } from './toolExecutor'
import { buildAgendaSystemPrompt } from '@/modules/agenda/prompts/agenda.prompt'
import type { ModuleKey } from '@/types'
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

// ── System prompt ─────────────────────────────────────────────────────────────

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

  return `Eres el asistente personal de ${ctx.userName}. Módulo: ${module}. Fecha: ${currentDate}.`
}

// ── Intent detection ──────────────────────────────────────────────────────────

const SCHEDULING_RE = /\b(agend[aáe]|agendame|agreg[aá]|agregame|program[aá]|programame|bloqu[eé][aá]|bloqueame|reserv[aá]|reservame|anot[aá]|anotame|cre[aá]|ponm?e|pon[eé])\b/i
const DELETE_RE = /\b(borr[aá]|borrame|elimin[aá]|eliminame|sac[aá]|sacame|cancel[aá]|cancelame)\b/i
const QUERY_RE = /\b(qu[eé]\s+tengo|mi\s+agenda|mis\s+eventos|qu[eé]\s+hay|c[oó]mo\s+est[aá]\s+mi|tengo\s+algo|qu[eé]\s+pasa|organiz[aá]me|organiz[aá]\s+mi|plan(eá|ea|ificá)|libre[s]?\s+(hoy|mañana|el)|huecos?\s+libres?)\b/i

// ── Agent loop ────────────────────────────────────────────────────────────────

export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const {
    userId, conversationId, userMessage, module,
    userName,
    timezone = 'America/Argentina/Buenos_Aires',
    workdayStart = '09:00',
    workdayEnd = '18:00',
  } = options

  console.log(`[agent] start userId=${userId} module=${module} message="${userMessage}"`)

  await prisma.message.create({
    data: { conversationId, role: 'USER', content: userMessage },
  })

  const history = await prisma.message.findMany({
    where: { conversationId, role: { in: ['USER', 'ASSISTANT'] } },
    orderBy: { createdAt: 'asc' },
    take: 10,
  })

  const systemPrompt = buildSystemPrompt(module, { userName, timezone, workdayStart, workdayEnd })
  const tools = getToolsForModule(module)
  const validToolNames = getValidToolNames(module)

  const isScheduling = tools.length > 0 && SCHEDULING_RE.test(userMessage)
  const isDelete = tools.length > 0 && DELETE_RE.test(userMessage)
  const isQuery = tools.length > 0 && QUERY_RE.test(userMessage)
  const mustUseTool = isScheduling || isDelete || isQuery

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m: Message) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content as string,
    })),
  ]

  let blockCreated = false

  for (let i = 0; i < 5; i++) {
    let toolChoice: OpenAI.Chat.ChatCompletionToolChoiceOption | undefined
    if (!tools.length) {
      toolChoice = undefined
    } else if (i === 0 && isScheduling) {
      toolChoice = { type: 'function', function: { name: 'propose_block' } }
    } else if (i === 0 && isQuery && !isDelete) {
      toolChoice = { type: 'function', function: { name: 'get_day_events' } }
    } else if (i === 0 && mustUseTool) {
      toolChoice = 'required'
    } else {
      toolChoice = 'auto'
    }

    console.log(`[agent] iteration=${i} toolChoice=${JSON.stringify(toolChoice)}`)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: toolChoice,
    })

    const choice = completion.choices[0]
    console.log(`[agent] finish_reason=${choice.finish_reason} tool_calls=${choice.message.tool_calls?.length ?? 0}`)

    if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) {
      const finalContent = choice.message.content ?? ''
      if (finalContent) {
        await prisma.message.create({
          data: { conversationId, role: 'ASSISTANT', content: finalContent },
        })
      }
      console.log(`[agent] done response="${finalContent.slice(0, 80)}"`)
      return { response: finalContent, blockCreated }
    }

    messages.push(choice.message)

    for (const tc of choice.message.tool_calls) {
      const fn = (tc as OpenAI.Chat.ChatCompletionMessageFunctionToolCall).function
      let args: Record<string, unknown> = {}

      try {
        args = JSON.parse(fn.arguments) as Record<string, unknown>
      } catch {
        console.error(`[agent] invalid JSON in tool args for "${fn.name}":`, fn.arguments)
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify({ error: 'JSON inválido en arguments' }),
        })
        continue
      }

      let result: unknown
      try {
        result = await executeTool(fn.name, args, userId, validToolNames)
      } catch (err) {
        console.error(`[agent] tool execution error for "${fn.name}":`, err)
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

  console.warn(`[agent] exhausted iterations for userId=${userId}`)
  return {
    response: 'No pude completar la solicitud. Por favor intentá de nuevo.',
    blockCreated,
  }
}

// ── Conversation ──────────────────────────────────────────────────────────────

export async function getOrCreateConversation(userId: string, module: ModuleKey) {
  const existing = await prisma.conversation.findFirst({
    where: { userId, module },
    orderBy: { updatedAt: 'desc' },
  })

  if (existing) return existing

  return prisma.conversation.create({
    data: { userId, module, title: `${module} — ${new Date().toLocaleDateString('es')}` },
  })
}
