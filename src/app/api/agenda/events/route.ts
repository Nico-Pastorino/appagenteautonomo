import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDayEvents, getBlocksForDay } from '@/modules/agenda/services/agenda.service'
import { localDateStr, startOfDayInTZ } from '@/lib/dateUtils'
import { USER_TIMEZONE } from '@/lib/timezone'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const dateStr = dateParam ?? localDateStr(new Date(), USER_TIMEZONE)
  const date = startOfDayInTZ(dateStr, USER_TIMEZONE)

  try {
    const [calendarEvents, localBlocks] = await Promise.all([
      getDayEvents(session.user.id, date, USER_TIMEZONE),
      getBlocksForDay(session.user.id, date, USER_TIMEZONE),
    ])

    return NextResponse.json({ calendarEvents, localBlocks })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
