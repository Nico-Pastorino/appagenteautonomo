'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatTime } from '@/lib/utils'
import { RefreshCw, Trash2 } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  isAllDay: boolean
  description?: string
  source: string
}

interface LocalBlock {
  id: string
  title: string
  startTime: string
  endTime: string
  type: string
  confirmed: boolean
}

const BLOCK_COLORS: Record<string, string> = {
  FOCUS: '#6366f1',
  MEETING: '#f59e0b',
  BREAK: '#10b981',
  TASK: '#3b82f6',
  EXERCISE: '#ec4899',
  PERSONAL: '#8b5cf6',
}

export function CalendarView() {
  const [date] = useState(() => new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [blocks, setBlocks] = useState<LocalBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dateStr = date.toLocaleDateString('sv')
      const res = await fetch(`/api/agenda/events?date=${dateStr}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEvents(data.calendarEvents ?? [])
      setBlocks(data.localBlocks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar eventos')
    } finally {
      setLoading(false)
    }
  }, [date])

  const deleteBlock = async (blockId: string) => {
    try {
      const res = await fetch(`/api/agenda/blocks?id=${blockId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setBlocks((prev) => prev.filter((b) => b.id !== blockId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  useEffect(() => {
    queueMicrotask(() => { void fetchEvents() })
  }, [fetchEvents])

  useEffect(() => {
    const handler = () => { void fetchEvents() }
    window.addEventListener('block-created', handler)
    return () => window.removeEventListener('block-created', handler)
  }, [fetchEvents])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--muted)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--surface-2)', color: '#ef4444' }}>
        {error}
        <button onClick={fetchEvents} className="ml-2 underline" style={{ color: 'var(--primary)' }}>
          Reintentar
        </button>
      </div>
    )
  }

  const hasContent = events.length > 0 || blocks.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
          {date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h3>
        <button onClick={fetchEvents} className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
          <RefreshCw size={14} style={{ color: 'var(--muted)' }} />
        </button>
      </div>

      {!hasContent ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--muted)' }}>
          No hay eventos para hoy. Pídele a la IA que organice tu día.
        </p>
      ) : (
        <div className="space-y-2">
          {events.filter(e => !e.isAllDay).map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'var(--surface-2)' }}
            >
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ background: '#22d3ee', minHeight: '2rem' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {event.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {formatTime(new Date(event.start))} — {formatTime(new Date(event.end))}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                Google
              </span>
            </div>
          ))}

          {blocks.map((block) => (
            <div
              key={block.id}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'var(--surface-2)' }}
            >
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ background: BLOCK_COLORS[block.type] ?? 'var(--primary)', minHeight: '2rem' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {block.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {formatTime(new Date(block.startTime))} — {formatTime(new Date(block.endTime))}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{
                background: BLOCK_COLORS[block.type] + '22',
                color: BLOCK_COLORS[block.type] ?? 'var(--primary)',
              }}>
                {block.type}
              </span>
              <button
                onClick={() => deleteBlock(block.id)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                title="Eliminar bloque"
              >
                <Trash2 size={13} style={{ color: 'var(--muted)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
