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

export function getValidToolNames(module: ModuleKey): Set<string> {
  return new Set(
    getToolsForModule(module)
      .filter((t): t is OpenAI.Chat.ChatCompletionTool & { function: { name: string } } => 'function' in t)
      .map((t) => t.function.name)
  )
}
