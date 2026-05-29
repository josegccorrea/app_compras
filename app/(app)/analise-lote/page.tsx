import { createClient } from '@/lib/supabase/server'
import { AnaliseLotePage } from '@/components/sku/analise-lote-page'

export const metadata = { title: 'Análise em Lote — Colibri Compras' }

export default async function AnaliseLote() {
  const supabase = await createClient()
  const { data: operacoes } = await supabase
    .from('operacoes')
    .select('id, codigo, nome, tipo')
    .eq('ativo', true)
    .order('codigo')

  return <AnaliseLotePage operacoes={operacoes ?? []} />
}
