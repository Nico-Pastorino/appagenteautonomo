import type OpenAI from 'openai'

export const agendaTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_day_events',
      description: 'Obtiene todos los eventos del calendario de Google del usuario para un día específico.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha en formato ISO 8601 (YYYY-MM-DD). Si no se especifica, usa hoy.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_free_slots',
      description: 'Detecta los huecos libres en el calendario del usuario para un día específico, dentro de su horario laboral.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha en formato ISO 8601 (YYYY-MM-DD).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'suggest_day_plan',
      description: 'Genera sugerencias de bloques de tiempo para organizar el día del usuario, basándose en sus eventos existentes y huecos libres.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha en formato ISO 8601 (YYYY-MM-DD).',
          },
          priorities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de tareas o prioridades que el usuario mencionó.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_block',
      description: 'Propone un bloque de tiempo específico para confirmación del usuario antes de crearlo. SIEMPRE usar esto antes de crear un evento, nunca crear sin confirmación.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título del bloque.' },
          description: { type: 'string', description: 'Descripción opcional.' },
          startTime: { type: 'string', description: 'Inicio en ISO 8601.' },
          endTime: { type: 'string', description: 'Fin en ISO 8601.' },
          type: {
            type: 'string',
            enum: ['FOCUS', 'MEETING', 'BREAK', 'TASK', 'EXERCISE', 'PERSONAL'],
            description: 'Tipo de bloque.',
          },
        },
        required: ['title', 'startTime', 'endTime', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Elimina un evento del Google Calendar del usuario. SOLO llamar después de que el usuario haya confirmado explícitamente que quiere borrarlo.',
      parameters: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'ID del evento de Google Calendar.' },
          eventTitle: { type: 'string', description: 'Título del evento, para confirmar al usuario.' },
        },
        required: ['eventId', 'eventTitle'],
      },
    },
  },
]

export type AgendaToolName =
  | 'get_day_events'
  | 'get_free_slots'
  | 'suggest_day_plan'
  | 'propose_block'
  | 'delete_event'
