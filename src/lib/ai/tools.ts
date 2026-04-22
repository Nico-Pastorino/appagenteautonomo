import type OpenAI from 'openai'
import { agendaTools } from '@/modules/agenda/tools/agenda.tools'
import type { ModuleKey } from '@/types'

// ── Finanzas ──────────────────────────────────────────────────────────────────
const financeTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description: 'Obtiene las transacciones recientes del usuario.',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', description: '"today" | "week" | "month"' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_spending',
      description: 'Analiza los gastos del usuario por categoría.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Categoría a analizar (opcional).' },
        },
        required: [],
      },
    },
  },
]

// ── Automatización ────────────────────────────────────────────────────────────
const automationTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Envía un email en nombre del usuario.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Destinatario.' },
          subject: { type: 'string', description: 'Asunto.' },
          body: { type: 'string', description: 'Cuerpo del email.' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Crea una tarea o recordatorio.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título de la tarea.' },
          dueDate: { type: 'string', description: 'Fecha límite en ISO 8601 (opcional).' },
        },
        required: ['title'],
      },
    },
  },
]

// ── Compras ───────────────────────────────────────────────────────────────────
const shoppingTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'compare_prices',
      description: 'Compara precios de un producto en distintos proveedores.',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Nombre o descripción del producto.' },
        },
        required: ['product'],
      },
    },
  },
]

// ── Productividad ─────────────────────────────────────────────────────────────
const productivityTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Obtiene las tareas pendientes del usuario.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: '"pending" | "in_progress" | "done"' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'prioritize_tasks',
      description: 'Prioriza una lista de tareas según urgencia e impacto.',
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de tareas a priorizar.',
          },
        },
        required: ['tasks'],
      },
    },
  },
]

// ── Registro central ──────────────────────────────────────────────────────────
const TOOL_REGISTRY: Record<ModuleKey, OpenAI.Chat.ChatCompletionTool[]> = {
  AGENDA: agendaTools,
  FINANCES: financeTools,
  AUTOMATION: automationTools,
  SHOPPING: shoppingTools,
  PRODUCTIVITY: productivityTools,
}

export function getToolsForModule(module: ModuleKey): OpenAI.Chat.ChatCompletionTool[] {
  return TOOL_REGISTRY[module] ?? []
}

export function getValidToolNames(module: ModuleKey): Set<string> {
  return new Set(
    getToolsForModule(module)
      .filter((t): t is OpenAI.Chat.ChatCompletionTool & { function: { name: string } } => 'function' in t)
      .map((t) => t.function.name)
  )
}
