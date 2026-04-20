import { auth } from '@/lib/auth'
import { MODULES } from '@/config/modules.config'
import { ModuleCard } from '@/components/layout/ModuleCard'
import { Calendar, TrendingUp, Zap, ShoppingCart, Target } from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  Calendar: <Calendar size={22} />,
  TrendingUp: <TrendingUp size={22} />,
  Zap: <Zap size={22} />,
  ShoppingCart: <ShoppingCart size={22} />,
  Target: <Target size={22} />,
}

export default async function DashboardPage() {
  const session = await auth()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Usuario'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="p-4 pb-20 md:p-8 md:pb-8 max-w-5xl mx-auto">
      <div className="mb-8 md:mb-10">
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          {greeting}, {firstName}
        </h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>
          ¿Qué quieres organizar hoy?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => (
          <ModuleCard key={mod.id} mod={mod} icon={ICON_MAP[mod.icon]} />
        ))}
      </div>
    </div>
  )
}
