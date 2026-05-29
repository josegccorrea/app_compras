import { createClient } from '@/lib/supabase/server'
import { ImportacaoPage } from '@/components/import/importacao-page'

export const metadata = { title: 'Importação — Colibri Compras' }

export default async function Importacao() {
  const supabase = await createClient()

  const { data: historico } = await supabase
    .from('importacoes')
    .select('*, usuario:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  return <ImportacaoPage historico={historico ?? []} />
}
