'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ModuleDefinition } from '@/types'

interface ModuleCardProps {
  mod: ModuleDefinition
  icon: React.ReactNode
}

export function ModuleCard({ mod, icon }: ModuleCardProps) {
  const isActive = mod.status === 'active'

  const card = (
    <div
      className="group p-6 rounded-2xl border transition-all duration-200"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
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
          {icon}
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
    <Link href={mod.route}>{card}</Link>
  ) : (
    <div>{card}</div>
  )
}
