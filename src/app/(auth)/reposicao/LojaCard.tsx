'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Sugestao } from '@/types'
import { STATUS_COLORS, STATUS_BG } from '@/lib/constants'

const STATUS_ORDER = { CRITICO: 0, ALERTA: 1, OK: 2, EXCESSO: 3 }

type FilterStatus = 'TODOS' | 'CRITICO' | 'ALERTA' | 'OK' | 'EXCESSO'

interface Props {
  loja: string
  itens: Sugestao[]
}

export default function LojaCard({ loja, itens }: Props) {
  const [open, setOpen] = useState(true)
  const [filtro, setFiltro] = useState<FilterStatus>('TODOS')

  const criticos = itens.filter((i) => i.status === 'CRITICO').length
  const alertas = itens.filter((i) => i.status === 'ALERTA').length

  const sorted = [...itens].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  )

  const filtered = filtro === 'TODOS' ? sorted : sorted.filter((i) => i.status === filtro)

  const filters: FilterStatus[] = ['TODOS', 'CRITICO', 'ALERTA', 'OK', 'EXCESSO']

  return (
    <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[var(--c-bg)] transition-colors text-left"
      >
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-sm text-[var(--c-text)]">{loja}</span>
          <span className="text-xs text-[var(--c-muted)]">{itens.length} SKUs</span>
          {criticos > 0 && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ color: STATUS_COLORS.CRITICO, background: STATUS_BG.CRITICO }}>
              {criticos} crítico{criticos > 1 ? 's' : ''}
            </span>
          )}
          {alertas > 0 && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ color: STATUS_COLORS.ALERTA, background: STATUS_BG.ALERTA }}>
              {alertas} alerta{alertas > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--c-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="flex gap-1.5 px-5 py-2 border-t border-[var(--c-border)] bg-[var(--c-bg)] flex-wrap">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-primary)] ${
                  filtro === f
                    ? 'bg-[var(--c-primary)] text-white'
                    : 'bg-[var(--c-surface)] text-[var(--c-muted)] hover:text-[var(--c-text)] border border-[var(--c-border)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label={`Sugestões para ${loja}`}>
              <thead>
                <tr className="bg-[var(--c-bg)] text-[var(--c-muted)]">
                  {['Cód. Interno', 'Cód. Barras', 'Linha', 'Tam.', 'Cor', 'Estoque', 'Dem/sem', 'Cobertura', 'Status', 'Qtd Enviar'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={`${item.loja}-${item.codigo}`}
                    className="border-t border-[var(--c-border)] hover:brightness-[0.97] transition-all"
                    style={{ background: item.qtd_a_enviar > 0 ? STATUS_BG[item.status] : undefined }}
                  >
                    <td className="px-3 py-2 font-mono text-[var(--c-text)]">{item.codigo}</td>
                    <td className="px-3 py-2 font-mono text-[var(--c-muted)]">{item.cod_barras || '—'}</td>
                    <td className="px-3 py-2">{item.linha}</td>
                    <td className="px-3 py-2">{item.tamanho}</td>
                    <td className="px-3 py-2">{item.cor}</td>
                    <td className="px-3 py-2 text-right">{item.estoque_atual}</td>
                    <td className="px-3 py-2 text-right">{item.demanda_semanal}</td>
                    <td className="px-3 py-2 text-right">
                      {item.cobertura_dias !== null ? `${item.cobertura_dias}d` : '∞'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="px-2 py-0.5 rounded-md font-semibold"
                        style={{ color: STATUS_COLORS[item.status], background: STATUS_BG[item.status] }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="font-semibold text-[var(--c-primary)]">{item.qtd_a_enviar}</span>
                      {item.por_minimo && (
                        <span
                          className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ background: '#FEF9C3', color: '#92400E' }}
                        >
                          mín
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-4 text-center text-[var(--c-muted)]">
                      Nenhum item com status {filtro}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
