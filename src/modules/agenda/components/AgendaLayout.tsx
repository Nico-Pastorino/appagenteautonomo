'use client'

import { useState } from 'react'
import { CalendarDays } from 'lucide-react'

interface AgendaLayoutProps {
  userName: string
  calendarView: React.ReactNode
  chat: React.ReactNode
}

export function AgendaLayout({ userName, calendarView, chat }: AgendaLayoutProps) {
  const [showCalendar, setShowCalendar] = useState(false)

  return (
    <div className="flex flex-col md:flex-row h-full" style={{ background: 'var(--background)' }}>
      {/* Calendar panel: always visible on md+, toggleable on mobile */}
      <div
        className={[
          'md:w-80 md:shrink-0 md:border-r md:overflow-y-auto',
          'border-b md:border-b-0',
          showCalendar ? 'block max-h-[45vh] overflow-y-auto md:max-h-none' : 'hidden md:block',
        ].join(' ')}
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="p-4 md:p-6">
          <div className="mb-4 md:mb-6">
            <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Agenda</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Tu día, organizado con IA
            </p>
          </div>
          {calendarView}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Status bar */}
        <div
          className="px-4 py-3 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-sm truncate" style={{ color: 'var(--muted)' }}>
              Asistente de agenda activo — {userName}
            </span>
          </div>
          {/* Mobile calendar toggle */}
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="md:hidden flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors shrink-0 ml-2"
            style={{
              borderColor: showCalendar ? 'var(--primary)' : 'var(--border)',
              color: showCalendar ? 'var(--primary)' : 'var(--muted)',
              background: 'transparent',
            }}
          >
            <CalendarDays size={13} />
            {showCalendar ? 'Ocultar' : 'Eventos'}
          </button>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {chat}
        </div>
      </div>
    </div>
  )
}
