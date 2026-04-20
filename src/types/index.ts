export type ModuleKey = 'AGENDA' | 'FINANCES' | 'AUTOMATION' | 'SHOPPING' | 'PRODUCTIVITY'
export type ModuleStatus = 'active' | 'coming_soon' | 'disabled'

export interface ModuleDefinition {
  id: ModuleKey
  label: string
  description: string
  icon: string
  route: string
  status: ModuleStatus
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  description?: string
  location?: string
  isAllDay: boolean
  source: 'google' | 'local'
  externalId?: string
}

export interface FreeSlot {
  start: Date
  end: Date
  durationMinutes: number
}

export type BlockType = 'FOCUS' | 'MEETING' | 'BREAK' | 'TASK' | 'EXERCISE' | 'PERSONAL'

export interface ProposedBlock {
  title: string
  description?: string
  startTime: string
  endTime: string
  type: BlockType
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  FOCUS: '🎯 Foco',
  MEETING: '📅 Reunión',
  BREAK: '☕ Descanso',
  TASK: '✅ Tarea',
  EXERCISE: '🏃 Ejercicio',
  PERSONAL: '👤 Personal',
}

export interface DaySuggestion {
  title: string
  description: string
  startTime: Date
  endTime: Date
  type: 'FOCUS' | 'BREAK' | 'TASK' | 'EXERCISE' | 'PERSONAL' | 'MEETING'
  reason: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  toolInput?: unknown
  toolOutput?: unknown
  createdAt: Date
}
