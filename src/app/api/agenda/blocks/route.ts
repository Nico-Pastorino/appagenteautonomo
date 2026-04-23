import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { confirmAndCreateBlock } from '@/modules/agenda/services/agenda.service'
import { prisma } from '@/lib/prisma'
import { parseDateTimeInTZ } from '@/lib/dateUtils'
import { USER_TIMEZONE } from '@/lib/timezone'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, startTime, endTime, type, syncToGoogle } = body

  if (!title || !startTime || !endTime || !type) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  try {
    const block = await confirmAndCreateBlock(session.user.id, {
      title,
      description,
      startTime: parseDateTimeInTZ(startTime, USER_TIMEZONE),
      endTime: parseDateTimeInTZ(endTime, USER_TIMEZONE),
      type,
      syncToGoogle: syncToGoogle ?? true,
    })

    return NextResponse.json({ block })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  try {
    await prisma.agendaBlock.deleteMany({
      where: { id, userId: session.user.id },
    })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
