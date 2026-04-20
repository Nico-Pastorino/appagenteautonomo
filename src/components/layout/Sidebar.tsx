'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { MODULES } from '@/config/modules.config'
import {
  Calendar,
  TrendingUp,
  Zap,
  ShoppingCart,
  Target,
  LogOut,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ReactNode> = {
  Calendar: <Calendar size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  Zap: <Zap size={18} />,
  ShoppingCart: <ShoppingCart size={18} />,
  Target: <Target size={18} />,
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 h-screen flex flex-col border-r shrink-0"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary)' }}
          >
            <Layers size={16} color="white" />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
            Assistant AI
          </span>
        </Link>
      </div>

      {/* Modules nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs font-medium px-3 py-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Módulos
        </p>
        {MODULES.map((mod) => {
          const isActive = pathname.startsWith(mod.route)
          const isDisabled = mod.status === 'coming_soon' || mod.status === 'disabled'

          return (
            <Link
              key={mod.id}
              href={isDisabled ? '#' : mod.route}
              onClick={isDisabled ? (e) => e.preventDefault() : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive && !isDisabled
                  ? 'text-white'
                  : isDisabled
                  ? 'cursor-not-allowed'
                  : 'hover:bg-white/5'
              )}
              style={
                isActive && !isDisabled
                  ? { background: 'var(--primary)', color: 'white' }
                  : isDisabled
                  ? { color: 'var(--muted)' }
                  : { color: 'var(--foreground)' }
              }
            >
              <span className={isDisabled ? 'opacity-40' : ''}>
                {ICON_MAP[mod.icon]}
              </span>
              <span className={isDisabled ? 'opacity-40' : ''}>{mod.label}</span>
              {isDisabled && (
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: '10px' }}
                >
                  Pronto
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm transition-all hover:bg-white/5"
          style={{ color: 'var(--muted)' }}
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
