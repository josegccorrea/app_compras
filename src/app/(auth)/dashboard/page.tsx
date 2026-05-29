import { createClient } from '@/lib/supabase/server'
import { AlertTriangle, TrendingDown, ShoppingCart, Package } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(1)

  const latestUpload = uploads?.[0]

  if (!latestUpload) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-[var(--c-muted)]">
        <Package size={40} className="opacity-30" />
        <p className="text-sm">Nenhum dado disponível. Faça o primeiro upload.</p>
        <a
          href="/upload"
          className="text-sm font-medium text-[var(--c-primary)] hover:underline"
        >
          Ir para Upload →
        </a>
      </div>
    )
  }

  const meta = latestUpload.meta as {
    total_skus_catalogo: number
    prazos_pagamento: string[]
  }

  const [{ count: criticos }, { count: alertas }, { count: comprasCD }] = await Promise.all([
    supabase.from('sugestoes').select('*', { count: 'exact', head: true })
      .eq('upload_id', latestUpload.id).eq('status', 'CRITICO'),
    supabase.from('sugestoes').select('*', { count: 'exact', head: true })
      .eq('upload_id', latestUpload.id).eq('status', 'ALERTA'),
    supabase.from('compras_cd').select('*', { count: 'exact', head: true })
      .eq('upload_id', latestUpload.id),
  ])

  const kpis = [
    {
      label: 'SKUs Críticos',
      value: criticos ?? 0,
      icon: AlertTriangle,
      color: 'var(--c-critico)',
      bg: 'var(--c-critico-bg)',
    },
    {
      label: 'SKUs em Alerta',
      value: alertas ?? 0,
      icon: TrendingDown,
      color: 'var(--c-alerta)',
      bg: 'var(--c-alerta-bg)',
    },
    {
      label: 'Compras CD',
      value: comprasCD ?? 0,
      icon: ShoppingCart,
      color: 'var(--c-primary)',
      bg: '#EFF6FF',
    },
    {
      label: 'SKUs Catálogo',
      value: meta?.total_skus_catalogo ?? 0,
      icon: Package,
      color: 'var(--c-ok)',
      bg: 'var(--c-ok-bg)',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--c-text)]">Dashboard</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">
          Semana {latestUpload.semana_iso} · atualizado em{' '}
          {new Date(latestUpload.created_at).toLocaleDateString('pt-BR')}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm"
            style={{ borderTop: `3px solid ${kpi.color}` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">
                  {kpi.label}
                </p>
                <p className="text-3xl font-bold mt-2" style={{ color: kpi.color }}>
                  {kpi.value}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: kpi.bg }}
              >
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {meta?.prazos_pagamento?.length > 0 && (
        <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)] mb-3">
            Prazos de Pagamento
          </p>
          <div className="flex flex-wrap gap-2">
            {meta.prazos_pagamento.map((prazo, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--c-bg)] border border-[var(--c-border)] text-[var(--c-text)]"
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
    </div>
  )
}
