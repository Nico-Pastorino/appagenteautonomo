import { auth } from '@/lib/auth'
import { CalendarView } from '@/modules/agenda/components/CalendarView'
import { AgendaChat } from '@/modules/agenda/components/AgendaChat'

export default async function AgendaPage() {
  const session = await auth()
  const today = new Date()

  return (
    <div className="flex h-full" style={{ background: 'var(--background)' }}>
      {/* Left: Calendar view */}
      <div className="w-80 shrink-0 p-6 border-r overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-6">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Agenda</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Tu día, organizado con IA
          </p>
        </div>
        <CalendarView date={today} />
      </div>

      {/* Right: Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm" style={{ color: 'var(--muted)' }}>
              Asistente de agenda activo — {session?.user?.name}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <AgendaChat />
        </div>
      </div>
    </div>
  )
}
