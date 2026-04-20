'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MODULES } from '@/config/modules.config'
import { Calendar, TrendingUp, Zap, ShoppingCart, Target } from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  Calendar: <Calendar size={20} />,
  TrendingUp: <TrendingUp size={20} />,
  Zap: <Zap size={20} />,
  ShoppingCart: <ShoppingCart size={20} />,
  Target: <Target size={20} />,
}

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {MODULES.map((mod) => {
        const isActive = pathname.startsWith(mod.route)
        const isDisabled = mod.status !== 'active'

        return (
          <Link
            key={mod.id}
            href={isDisabled ? '#' : mod.route}
            onClick={isDisabled ? (e) => e.preventDefault() : undefined}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            style={{
              color: isActive ? 'var(--primary)' : 'var(--muted)',
              opacity: isDisabled && !isActive ? 0.35 : 1,
            }}
          >
            {ICON_MAP[mod.icon]}
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{mod.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
