import { createClient } from '@/lib/supabase/server'
import { Sugestao, CompraCD, Upload } from '@/types'
import { STATUS_COLORS, STATUS_BG } from '@/lib/constants'
import { AlertTriangle, ShoppingCart, Package, TrendingDown } from 'lucide-react'
import LojaCard from './LojaCard'
import SemanaSelector from '@/components/ui/SemanaSelector'

interface Props {
  searchParams: Promise<{ semana?: string }>
}

export default async function ReposicaoPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  // Get all done uploads for semana selector
  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, semana_iso, created_at, meta')
    .eq('status', 'done')
    .order('semana_iso', { ascending: false })

  if (!uploads?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-[var(--c-muted)]">
        <Package size={40} className="opacity-30" />
        <p className="text-sm">Nenhum dado disponível. Faça um upload primeiro.</p>
        <a href="/upload" className="text-sm font-medium text-[var(--c-primary)] hover:underline">
          Ir para Upload →
        </a>
      </div>
    )
  }

  const semanaAtual = params.semana ?? uploads[0].semana_iso
  const upload = uploads.find((u) => u.semana_iso === semanaAtual) as Upload | undefined

  if (!upload) {
    return <p className="text-sm text-[var(--c-muted)]">Semana não encontrada.</p>
  }

  const meta = upload.meta as Upload['meta']

  const [{ data: sugestoes }, { data: compras }] = await Promise.all([
    supabase
      .from('sugestoes')
      .select('*')
      .eq('upload_id', upload.id)
      .order('loja')
      .order('status'),
    supabase
      .from('compras_cd')
      .select('*')
      .eq('upload_id', upload.id)
      .order('status_cd')
      .order('cobertura_cd_dias'),
  ])

  const sugestoesData = (sugestoes as Sugestao[]) ?? []
  const comprasData = (compras as CompraCD[]) ?? []

  const lojas = Array.from(new Set(sugestoesData.map((s) => s.loja))).sort()

  const criticos = sugestoesData.filter((s) => s.status === 'CRITICO').length
  const alertas = sugestoesData.filter((s) => s.status === 'ALERTA').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Reposição de Estoque</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">
            Semana {semanaAtual} · {meta?.total_skus_catalogo} SKUs · {lojas.length} lojas
          </p>
        </div>
        <SemanaSelector
          semanas={(uploads as Upload[]).map((u) => u.semana_iso)}
          atual={semanaAtual}
          basePath="/reposicao"
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Críticos', value: criticos, color: STATUS_COLORS.CRITICO, bg: STATUS_BG.CRITICO, icon: AlertTriangle },
          { label: 'Em Alerta', value: alertas, color: STATUS_COLORS.ALERTA, bg: STATUS_BG.ALERTA, icon: TrendingDown },
          { label: 'Compras CD', value: comprasData.length, color: STATUS_COLORS.EXCESSO, bg: STATUS_BG.EXCESSO, icon: ShoppingCart },
          { label: 'Total SKUs', value: sugestoesData.length, color: STATUS_COLORS.OK, bg: STATUS_BG.OK, icon: Package },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm"
            style={{ borderTop: `3px solid ${kpi.color}` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">{kpi.label}</p>
                <p className="text-3xl font-bold mt-2" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: kpi.bg }}>
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prazos */}
      {meta?.prazos_pagamento?.length > 0 && (
        <div className="bg-[var(--c-surface)] rounded-xl p-4 border border-[var(--c-border)] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)] mb-3">
            Prazos de Pagamento (Compras CD)
          </p>
          <div className="flex flex-wrap gap-2">
            {meta.prazos_pagamento.map((prazo: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--c-bg)] border border-[var(--c-border)]"
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: 'var(--c-primary)', fontSize: '9px' }}
                >
                  {i + 1}
                </span>
                {prazo}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lojas */}
      <div className="space-y-3">
        {lojas.map((loja) => (
          <LojaCard
            key={loja}
            loja={loja}
            itens={sugestoesData.filter((s) => s.loja === loja)}
          />
        ))}
      </div>

      {/* Compras CD */}
      {comprasData.length > 0 && (
        <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--c-border)] flex items-center gap-2">
            <ShoppingCart size={16} className="text-[var(--c-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--c-text)]">
              Compras CD ← Indústria ({comprasData.length} SKUs)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table" aria-label="Compras CD">
              <thead>
                <tr className="bg-[var(--c-bg)] text-[var(--c-muted)]">
                  {['Cód.', 'Descrição', 'Linha', 'Tam.', 'Cor', 'Est. CD', 'Dem/sem', 'Cobertura', 'Status', 'Qtd Comprar'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comprasData.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-[var(--c-border)] hover:bg-[var(--c-bg)] transition-colors"
                  >
                    <td className="px-3 py-2 font-mono">{item.codigo}</td>
                    <td className="px-3 py-2 max-w-[200px] truncate">{item.descricao}</td>
                    <td className="px-3 py-2">{item.linha}</td>
                    <td className="px-3 py-2">{item.tamanho}</td>
                    <td className="px-3 py-2">{item.cor}</td>
                    <td className="px-3 py-2 text-right">{item.estoque_cd}</td>
                    <td className="px-3 py-2 text-right">{item.demanda_total_semanal}</td>
                    <td className="px-3 py-2 text-right">
                      {item.cobertura_cd_dias !== null ? `${item.cobertura_cd_dias}d` : '∞'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="px-2 py-0.5 rounded-md font-semibold"
                        style={{
                          color: STATUS_COLORS[item.status_cd],
                          background: STATUS_BG[item.status_cd],
                        }}
                      >
                        {item.status_cd}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[var(--c-primary)]">
                      {item.qtd_comprar}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
