import { agendaTools } from '@/modules/agenda/tools/agenda.tools'
import type { ModuleKey } from '@/types'
import type OpenAI from 'openai'

const TOOL_REGISTRY: Record<ModuleKey, OpenAI.Chat.ChatCompletionTool[]> = {
  AGENDA: agendaTools,
  FINANCES: [],
  AUTOMATION: [],
  SHOPPING: [],
  PRODUCTIVITY: [],
}

export function getToolsForModule(module: ModuleKey): OpenAI.Chat.ChatCompletionTool[] {
  return TOOL_REGISTRY[module] ?? []
}
