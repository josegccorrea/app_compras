import { createClient } from '@/lib/supabase/server'
import SkuSearch from './SkuSearch'

export default async function SkuPage() {
  const supabase = await createClient()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, semana_iso')
    .eq('status', 'done')
    .order('semana_iso', { ascending: false })

  if (!uploads?.length) return <p className="text-sm text-[var(--c-muted)]">Nenhum dado disponível.</p>

  // Get all distinct SKUs across all uploads from catalog
  const { data: catalogo } = await supabase
    .from('catalogo')
    .select('codigo, descricao, linha, tamanho, cor')
    .eq('upload_id', uploads[0].id)
    .order('codigo')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--c-text)]">Drill-down por SKU</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">Evolução histórica de vendas por produto</p>
      </div>
      <SkuSearch catalogo={catalogo ?? []} uploadIds={uploads.map((u) => ({ id: u.id, semana: u.semana_iso }))} />
    </div>
  )
}
