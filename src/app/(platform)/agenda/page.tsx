import { auth } from '@/lib/auth'
import { CalendarView } from '@/modules/agenda/components/CalendarView'
import { AgendaChat } from '@/modules/agenda/components/AgendaChat'
import { AgendaLayout } from '@/modules/agenda/components/AgendaLayout'

export default async function AgendaPage() {
  const session = await auth()
  const today = new Date()

  return (
    <AgendaLayout
      userName={session?.user?.name ?? 'Usuario'}
      calendarView={<CalendarView date={today} />}
      chat={<AgendaChat />}
    />
  )
}
