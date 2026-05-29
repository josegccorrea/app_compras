import { cn } from '@/lib/utils/cn'
import type { Alerta, SeveridadeAlerta } from '@/types/app'

const severidadeStyles: Record<SeveridadeAlerta, string> = {
  critico: 'bg-red-100 border-red-200 text-red-800',
  atencao: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const dotStyles: Record<SeveridadeAlerta, string> = {
  critico: 'bg-red-500',
  atencao: 'bg-yellow-500',
  info: 'bg-blue-500',
}

interface AlertSemaphoreProps {
  alertas: Alerta[]
  compact?: boolean
}

export function AlertSemaphore({ alertas, compact = false }: AlertSemaphoreProps) {
  if (alertas.length === 0) return null

  if (compact) {
    const critico = alertas.find((a) => a.severidade === 'critico')
    const atencao = alertas.find((a) => a.severidade === 'atencao')
    const info = alertas.find((a) => a.severidade === 'info')
    const alerta = critico ?? atencao ?? info
    if (!alerta) return null

    return (
      <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', severidadeStyles[alerta.severidade])}>
        <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[alerta.severidade])} />
        {alerta.mensagem}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      {alertas.map((alerta, idx) => (
        <div
          key={idx}
          className={cn('flex items-start gap-2 text-xs px-3 py-2 rounded-md border', severidadeStyles[alerta.severidade])}
        >
          <span className={cn('h-2 w-2 rounded-full mt-0.5 flex-shrink-0', dotStyles[alerta.severidade])} />
          <span>{alerta.mensagem}</span>
        </div>
      ))}
    </div>
  )
}
