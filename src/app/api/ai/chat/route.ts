import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runAgent, getOrCreateConversation } from '@/lib/ai/agent'
import { prisma } from '@/lib/prisma'
import type { ModuleKey } from '@/types'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  console.log('REQUEST BODY:', body)
  const { message, module: requestedModule = 'AGENDA' } = body as { message: string; module: ModuleKey }
  const moduleKey = requestedModule

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }

  try {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId: session.user.id },
    })

    const conversation = await getOrCreateConversation(session.user.id, moduleKey)

    const result = await runAgent({
      userId: session.user.id,
      conversationId: conversation.id,
      userMessage: message,
      module: moduleKey,
      userName: session.user.name ?? 'Usuario',
      timezone: prefs?.timezone ?? 'America/Argentina/Buenos_Aires',
      workdayStart: prefs?.workdayStart ?? '09:00',
      workdayEnd: prefs?.workdayEnd ?? '18:00',
    })

    return Response.json({
      message: result.message,
      blockCreated: result.blockCreated ?? false,
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error('[ai/chat]', error)
    return Response.json({
      message: 'Estoy teniendo un problema técnico, intenta nuevamente',
      blockCreated: false,
    })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const moduleKey = (searchParams.get('module') ?? 'AGENDA') as ModuleKey

  const conversation = await prisma.conversation.findFirst({
    where: { userId: session.user.id, module: moduleKey },
    orderBy: { updatedAt: 'desc' },
  })

  if (conversation) {
    await prisma.conversation.delete({ where: { id: conversation.id } })
  }

  return NextResponse.json({ reset: true })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const moduleKey = (searchParams.get('module') ?? 'AGENDA') as ModuleKey

  const conversation = await prisma.conversation.findFirst({
    where: { userId: session.user.id, module: moduleKey },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        where: { role: { in: ['USER', 'ASSISTANT'] } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  })

  return NextResponse.json({ conversation })
}
