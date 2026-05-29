import { createClient } from '@/lib/supabase/server'
import SemanaSelector from '@/components/ui/SemanaSelector'
import VendasChart from '@/components/charts/VendasChart'

interface Props {
  searchParams: Promise<{ semana?: string }>
}

export default async function ConsolidadoPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, semana_iso')
    .eq('status', 'done')
    .order('semana_iso', { ascending: false })

  if (!uploads?.length) return <p className="text-sm text-[var(--c-muted)]">Nenhum dado disponível.</p>

  const semanaAtual = params.semana ?? uploads[0].semana_iso
  const upload = uploads.find((u) => u.semana_iso === semanaAtual)
  if (!upload) return <p className="text-sm text-[var(--c-muted)]">Semana não encontrada.</p>

  const { data: vendas } = await supabase
    .from('vendas')
    .select('semana_iso, quantidade')
    .eq('upload_id', upload.id)

  const semanas = Array.from(new Set(vendas?.map((v) => v.semana_iso) ?? [])).sort()

  const total = semanas.map((sem) =>
    (vendas ?? []).filter((v) => v.semana_iso === sem).reduce((s, v) => s + Number(v.quantidade), 0)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Vendas Consolidadas</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">Total de todas as lojas por semana</p>
        </div>
        <SemanaSelector semanas={uploads.map((u) => u.semana_iso)} atual={semanaAtual} basePath="/vendas/consolidado" />
      </div>

      <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm">
        <VendasChart
          semanas={semanas}
          porLoja={{ 'Todas as Lojas': total }}
          titulo="Vendas Totais — Catálogo PicPic"
          tipo="bar"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Período', value: total.reduce((s, v) => s + v, 0).toLocaleString('pt-BR') },
          { label: 'Média Semanal', value: semanas.length ? Math.round(total.reduce((s, v) => s + v, 0) / semanas.length).toLocaleString('pt-BR') : '0' },
          { label: 'Semana Pico', value: semanas[total.indexOf(Math.max(...total))] ?? '—' },
          { label: 'Semanas Analisadas', value: semanas.length.toString() },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--c-surface)] rounded-xl p-4 border border-[var(--c-border)] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">{stat.label}</p>
            <p className="text-2xl font-bold text-[var(--c-primary)] mt-2">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
