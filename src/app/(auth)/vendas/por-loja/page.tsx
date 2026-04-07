import { createClient } from '@/lib/supabase/server'
import SemanaSelector from '@/components/ui/SemanaSelector'
import VendasChart from '@/components/charts/VendasChart'

interface Props {
  searchParams: Promise<{ semana?: string }>
}

export default async function VendasPorLojaPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, semana_iso, meta')
    .eq('status', 'done')
    .order('semana_iso', { ascending: false })

  if (!uploads?.length) {
    return <p className="text-sm text-[var(--c-muted)]">Nenhum dado disponível.</p>
  }

  const semanaAtual = params.semana ?? uploads[0].semana_iso
  const upload = uploads.find((u) => u.semana_iso === semanaAtual)
  if (!upload) return <p className="text-sm text-[var(--c-muted)]">Semana não encontrada.</p>

  // Get all vendas for this upload grouped by loja + semana
  const { data: vendas } = await supabase
    .from('vendas')
    .select('semana_iso, loja, quantidade')
    .eq('upload_id', upload.id)

  const lojas = Array.from(new Set(vendas?.map((v) => v.loja) ?? [])).sort()
  const semanas = Array.from(new Set(vendas?.map((v) => v.semana_iso) ?? [])).sort()

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
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Vendas por Loja</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">Catálogo PicPic — histórico semanal</p>
        </div>
        <SemanaSelector
          semanas={uploads.map((u) => u.semana_iso)}
          atual={semanaAtual}
          basePath="/vendas/por-loja"
        />
      </div>

      <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm">
        <VendasChart
          semanas={semanas}
          porLoja={por_loja}
          titulo="Vendas Semanais por Loja"
        />
      </div>
    </div>
  )
}
