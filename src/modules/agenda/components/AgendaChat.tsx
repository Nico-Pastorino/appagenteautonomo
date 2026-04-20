'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BLOCK_TYPE_LABELS, type ProposedBlock } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export function AgendaChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de agenda. Puedo ver tus eventos de Google Calendar, encontrar huecos libres y ayudarte a organizar tu día. ¿Qué quieres hacer hoy?',
      createdAt: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [proposedBlock, setProposedBlock] = useState<ProposedBlock | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, module: 'AGENDA' }),
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          createdAt: new Date(),
        },
      ])

      if (data.proposedBlock) {
        setProposedBlock(data.proposedBlock)
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Lo siento, hubo un error: ${err instanceof Error ? err.message : 'Error desconocido'}`,
          createdAt: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmBlock = async (syncToGoogle: boolean) => {
    if (!proposedBlock) return

    try {
      const res = await fetch('/api/agenda/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...proposedBlock, syncToGoogle }),
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ Perfecto, creé el bloque "${proposedBlock.title}"${syncToGoogle ? ' y lo agregué a tu Google Calendar' : ''}. ¿Necesitas algo más?`,
          createdAt: new Date(),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `No pude crear el bloque: ${err instanceof Error ? err.message : 'Error'}`,
          createdAt: new Date(),
        },
      ])
    } finally {
      setProposedBlock(null)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface)' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--primary)' }}
              >
                <Bot size={14} color="white" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed',
                msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
              )}
              style={
                msg.role === 'user'
                  ? { background: 'var(--primary)', color: 'white' }
                  : { background: 'var(--surface-2)', color: 'var(--foreground)' }
              }
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'var(--surface-2)' }}
              >
                <User size={14} style={{ color: 'var(--muted)' }} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary)' }}
            >
              <Bot size={14} color="white" />
            </div>
            <div
              className="px-4 py-3 rounded-2xl rounded-tl-sm"
              style={{ background: 'var(--surface-2)' }}
            >
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--muted)' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Proposed block banner */}
      {proposedBlock && (
        <div
          className="mx-4 mb-2 p-4 rounded-xl border"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--primary)' }}
        >
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--primary)' }}>
            Bloque propuesto — ¿confirmas?
          </p>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {BLOCK_TYPE_LABELS[proposedBlock.type]} {proposedBlock.title}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                {new Date(proposedBlock.startTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}
                {' — '}
                {new Date(proposedBlock.endTime).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setProposedBlock(null)}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--muted)' }}
              >
                Rechazar
              </button>
              <button
                onClick={() => handleConfirmBlock(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: 'var(--primary)', color: 'white' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex gap-2 items-end p-2 rounded-xl border"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            className="flex-1 bg-transparent resize-none outline-none text-sm py-1 px-2 max-h-32"
            style={{ color: 'var(--foreground)' }}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            <Send size={14} color="white" />
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted)' }}>
          Puedes pedirme: "¿Cómo está mi día?", "Organiza mi tarde", "Agrega un bloque de foco a las 3pm"
        </p>
      </div>
    </div>
  )
}
