'use client'

import { type ProposedBlock } from '@/types'

interface BlockConfirmModalProps {
  block: ProposedBlock
  onConfirm: (syncToGoogle: boolean) => void
  onReject: () => void
}

export function BlockConfirmModal({ block, onConfirm, onReject }: BlockConfirmModalProps) {
  const start = new Date(block.startTime).toLocaleTimeString('es', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const end = new Date(block.endTime).toLocaleTimeString('es', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
          Confirmar bloque
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
          ¿Deseas agregar este bloque a tu agenda?
        </p>

        <div className="p-4 rounded-xl mb-5" style={{ background: 'var(--surface-2)' }}>
          <p className="font-medium" style={{ color: 'var(--foreground)' }}>{block.title}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--primary)' }}>{start} — {end}</p>
          {block.description && (
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{block.description}</p>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onConfirm(true)}
            className="w-full py-2.5 rounded-xl font-medium text-sm transition-colors"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            Confirmar y agregar a Google Calendar
          </button>
          <button
            onClick={() => onConfirm(false)}
            className="w-full py-2.5 rounded-xl text-sm transition-colors border"
            style={{ background: 'transparent', color: 'var(--foreground)', borderColor: 'var(--border)' }}
          >
            Confirmar solo localmente
          </button>
          <button
            onClick={onReject}
            className="w-full py-2.5 rounded-xl text-sm transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
