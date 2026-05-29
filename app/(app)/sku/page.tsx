import { createClient } from '@/lib/supabase/server'
import { SkuSearchPage } from '@/components/sku/sku-search-page'

export const metadata = { title: 'Análise de SKU — Colibri Compras' }

export default async function SkuPage() {
  const supabase = await createClient()

  const [{ data: fornecedores }, { data: familias }, { data: operacoes }] = await Promise.all([
    supabase.from('fornecedores').select('id, razao_social, nome_fantasia').eq('status', 'ativo').order('razao_social'),
    supabase.from('familias').select('id, nome').order('nome'),
    supabase.from('operacoes').select('id, codigo, nome, tipo').eq('ativo', true).order('codigo'),
  ])

  return (
    <SkuSearchPage
      fornecedores={fornecedores ?? []}
      familias={familias ?? []}
      operacoes={operacoes ?? []}
    />
  )
}
