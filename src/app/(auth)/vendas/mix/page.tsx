import { createClient } from '@/lib/supabase/server'
import SemanaSelector from '@/components/ui/SemanaSelector'
import MixChart from './MixChart'

interface Props {
  searchParams: Promise<{ semana?: string }>
}

export default async function MixPage({ searchParams }: Props) {
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

  // Join vendas with catalogo to get linha
  const { data: vendas } = await supabase
    .from('vendas')
    .select('codigo, quantidade')
    .eq('upload_id', upload.id)

  const { data: catalogo } = await supabase
    .from('catalogo')
    .select('codigo, linha, marca')
    .eq('upload_id', upload.id)

  const catMap = new Map((catalogo ?? []).map((c) => [c.codigo, c]))

  // Aggregate by linha
  const porLinha: Record<string, number> = {}
  for (const v of vendas ?? []) {
    const cat = catMap.get(v.codigo)
    if (!cat) continue
    const linha = cat.linha || 'Outros'
    porLinha[linha] = (porLinha[linha] ?? 0) + Number(v.quantidade)
  }

  const sorted = Object.entries(porLinha).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Mix de Vendas</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">Distribuição por Linha</p>
        </div>
        <SemanaSelector semanas={uploads.map((u) => u.semana_iso)} atual={semanaAtual} basePath="/vendas/mix" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm">
          <MixChart porLinha={Object.fromEntries(sorted)} />
        </div>

        <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--c-border)]">
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Ranking por Linha</h2>
          </div>
          <div className="divide-y divide-[var(--c-border)]">
            {sorted.map(([linha, qtd], i) => {
              const total = sorted.reduce((s, [, v]) => s + v, 0)
              const pct = total > 0 ? ((qtd / total) * 100).toFixed(1) : '0'
              return (
                <div key={linha} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs font-bold text-[var(--c-muted)] w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--c-text)] truncate">{linha}</span>
                      <span className="text-xs text-[var(--c-muted)] ml-2">{pct}%</span>
                    </div>
                    <div className="w-full bg-[var(--c-bg)] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, background: 'var(--c-primary)' }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[var(--c-primary)] w-16 text-right">{qtd.toLocaleString('pt-BR')}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
