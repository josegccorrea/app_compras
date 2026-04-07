'use client'

import { useRouter } from 'next/navigation'

interface Props {
  semanas: string[]
  atual: string
  basePath: string
}

export default function SemanaSelector({ semanas, atual, basePath }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-[var(--c-muted)]">Semana:</label>
      <select
        value={atual}
        onChange={(e) => router.push(`${basePath}?semana=${e.target.value}`)}
        className="text-sm border border-[var(--c-border)] rounded-lg px-3 py-1.5 bg-[var(--c-surface)] text-[var(--c-text)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
      >
        {semanas.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
