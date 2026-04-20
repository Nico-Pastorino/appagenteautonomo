import { auth } from '@/lib/auth'
import { MODULES } from '@/config/modules.config'
import Link from 'next/link'
import {
  Calendar, TrendingUp, Zap, ShoppingCart, Target, ArrowRight,
} from 'lucide-react'

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
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
          {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          {greeting}, {firstName}
        </h1>
        <p className="mt-2" style={{ color: 'var(--muted)' }}>
          ¿Qué quieres organizar hoy?
        </p>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => {
          const isActive = mod.status === 'active'
          const card = (
            <div
              className="group p-6 rounded-2xl border transition-all duration-200"
              style={{
                background: 'var(--surface)',
                borderColor: isActive ? 'var(--border)' : 'var(--border)',
                opacity: isActive ? 1 : 0.6,
                cursor: isActive ? 'pointer' : 'default',
              }}
              onMouseEnter={e => {
                if (isActive) e.currentTarget.style.borderColor = 'var(--primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: isActive ? 'var(--primary)' : 'var(--surface-2)',
                    color: isActive ? 'white' : 'var(--muted)',
                  }}
                >
                  {ICON_MAP[mod.icon]}
                </div>
                {isActive ? (
                  <ArrowRight size={16} style={{ color: 'var(--muted)' }} className="group-hover:translate-x-1 transition-transform" />
                ) : (
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}
                  >
                    Próximamente
                  </span>
                )}
              </div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                {mod.label}
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {mod.description}
              </p>
            </div>
          )

          return isActive ? (
            <Link key={mod.id} href={mod.route}>
              {card}
            </Link>
          ) : (
            <div key={mod.id}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
