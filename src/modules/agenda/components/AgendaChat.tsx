'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [resetting, setResetting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const resetConversation = async () => {
    if (resetting) return
    setResetting(true)
    try {
      await fetch('/api/ai/chat?module=AGENDA', { method: 'DELETE' })
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '¡Hola! Soy tu asistente de agenda. Puedo ver tus eventos de Google Calendar, encontrar huecos libres y ayudarte a organizar tu día. ¿Qué quieres hacer hoy?',
        createdAt: new Date(),
      }])
    } finally {
      setResetting(false)
    }
  }

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
        body: JSON.stringify({
          message: text,
          module: 'AGENDA',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      let data: { message?: string; error?: string; blockCreated?: boolean }
      try {
        data = await res.json()
        console.log('API RESPONSE:', data)
      } catch {
        throw new Error(`El servidor devolvió HTTP ${res.status} (respuesta no JSON). Revisá /api/ai/health`)
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Error HTTP ${res.status}`)
      }

      const responseText = data.message?.trim() ?? 'Estoy teniendo un problema técnico, intenta nuevamente'
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseText,
          createdAt: new Date(),
        },
      ])

      if (data.blockCreated) {
        window.dispatchEvent(new CustomEvent('block-created'))
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('[AgendaChat]', errorMsg)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Estoy teniendo un problema técnico, intenta nuevamente',
          createdAt: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full pb-16 md:pb-0" style={{ background: 'var(--surface)' }}>
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

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-end mb-2">
          <button
            onClick={resetConversation}
            disabled={resetting}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            style={{ color: 'var(--muted)' }}
            title="Nueva conversación"
          >
            <Trash2 size={12} />
            Nueva conversación
          </button>
        </div>
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
          Puedes pedirme: &quot;¿Cómo está mi día?&quot;, &quot;Organiza mi tarde&quot;, &quot;Agrega un bloque de foco a las 3pm&quot;
        </p>
      </div>
    </div>
  )
}
