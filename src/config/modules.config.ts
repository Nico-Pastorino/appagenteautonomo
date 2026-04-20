import { ModuleDefinition } from '@/types'

export const MODULES: ModuleDefinition[] = [
  {
    id: 'AGENDA',
    label: 'Agenda',
    description: 'Organiza tu día automáticamente con IA',
    icon: 'Calendar',
    route: '/agenda',
    status: 'active',
  },
  {
    id: 'FINANCES',
    label: 'Finanzas',
    description: 'Analiza gastos y recibe recomendaciones',
    icon: 'TrendingUp',
    route: '/finances',
    status: 'coming_soon',
  },
  {
    id: 'AUTOMATION',
    label: 'Automatización',
    description: 'Responde mails, WhatsApp y recordatorios',
    icon: 'Zap',
    route: '/automation',
    status: 'coming_soon',
  },
  {
    id: 'SHOPPING',
    label: 'Compras',
    description: 'Compara precios y decide mejor',
    icon: 'ShoppingCart',
    route: '/shopping',
    status: 'coming_soon',
  },
  {
    id: 'PRODUCTIVITY',
    label: 'Productividad',
    description: 'Prioriza tareas y maximiza tu tiempo',
    icon: 'Target',
    route: '/productivity',
    status: 'coming_soon',
  },
]

export const getModule = (id: string) => MODULES.find((m) => m.id === id)
export const getActiveModules = () => MODULES.filter((m) => m.status === 'active')
