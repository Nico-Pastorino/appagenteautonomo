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
      description: 'Crea y guarda un bloque de tiempo en la base de datos y lo sincroniza con Google Calendar. No requiere confirmación adicional del usuario.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Título del bloque.' },
          description: { type: 'string', description: 'Descripción opcional.' },
          startTime: { type: 'string', description: 'Inicio en ISO 8601 con offset de timezone (ej: 2026-04-23T12:00:00-03:00).' },
          endTime: { type: 'string', description: 'Fin en ISO 8601 con offset de timezone (ej: 2026-04-23T13:00:00-03:00).' },
          type: {
            type: 'string',
            enum: ['FOCUS', 'MEETING', 'BREAK', 'TASK', 'EXERCISE', 'PERSONAL'],
            description: 'Categoría del bloque.',
          },
          itemType: {
            type: 'string',
            enum: ['event', 'task', 'reminder'],
            description: 'event: evento en Google Calendar. task: tarea solo en DB. reminder: recordatorio solo en DB.',
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
      description: 'Elimina un evento del calendario del usuario (tanto de la DB local como de Google Calendar). Requiere el ID del evento a eliminar. Si no lo tenés, llamá get_day_events primero para obtenerlo.',
      parameters: {
        type: 'object',
        properties: {
          blockId: {
            type: 'string',
            description: 'ID del evento a eliminar. Usá el campo "id" que devuelve get_day_events.',
          },
        },
        required: ['blockId'],
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
