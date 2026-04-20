import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { confirmAndCreateBlock } from '@/modules/agenda/services/agenda.service'

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
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      type,
      syncToGoogle: syncToGoogle ?? true,
    })

    return NextResponse.json({ block })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
