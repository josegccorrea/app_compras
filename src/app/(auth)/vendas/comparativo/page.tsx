import { createClient } from '@/lib/supabase/server'
import SemanaSelector from '@/components/ui/SemanaSelector'
import VendasChart from '@/components/charts/VendasChart'

interface Props {
  searchParams: Promise<{ semana?: string }>
}

export default async function ComparativoPage({ searchParams }: Props) {
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
    .select('semana_iso, loja, quantidade')
    .eq('upload_id', upload.id)

  const semanas = Array.from(new Set(vendas?.map((v) => v.semana_iso) ?? [])).sort()
  const lojas = Array.from(new Set(vendas?.map((v) => v.loja) ?? [])).sort()

  // por_loja[loja] = [qtd por semana] — mesma estrutura, renderiza como bar
  const por_loja: Record<string, number[]> = {}
  for (const loja of lojas) {
    por_loja[loja] = semanas.map((sem) =>
      (vendas ?? [])
        .filter((v) => v.loja === loja && v.semana_iso === sem)
        .reduce((s, v) => s + Number(v.quantidade), 0)
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Comparativo entre Lojas</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">Volume de vendas por semana</p>
        </div>
        <SemanaSelector semanas={uploads.map((u) => u.semana_iso)} atual={semanaAtual} basePath="/vendas/comparativo" />
      </div>

      <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm">
        <VendasChart semanas={semanas} porLoja={por_loja} tipo="bar" titulo="Comparativo de Lojas por Semana" />
      </div>

      {/* Tabela comparativa */}
      <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--c-border)]">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Tabela Detalhada</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--c-bg)] text-[var(--c-muted)]">
                <th className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide">Loja</th>
                {semanas.map((s) => (
                  <th key={s} className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide whitespace-nowrap">
                    {s.replace(/\d{4}-W/, 'S')}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {lojas.map((loja) => {
                const qtds = por_loja[loja]
                const total = qtds.reduce((s, v) => s + v, 0)
                return (
                  <tr key={loja} className="border-t border-[var(--c-border)] hover:bg-[var(--c-bg)] transition-colors">
                    <td className="px-4 py-2 font-medium text-[var(--c-text)]">{loja}</td>
                    {qtds.map((q, i) => (
                      <td key={i} className="px-3 py-2 text-right text-[var(--c-muted)]">{q || '—'}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold text-[var(--c-primary)]">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
