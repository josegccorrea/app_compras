import { createClient } from '@/lib/supabase/server'
import { FornecedoresPage } from '@/components/forms/fornecedores-page'

export const metadata = { title: 'Fornecedores — Colibri Compras' }

export default async function Fornecedores() {
  const supabase = await createClient()
  const { data: compradores } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('ativo', true)
    .in('role', ['comprador', 'gerente'])
    .order('full_name')

  return <FornecedoresPage compradores={compradores ?? []} />
}
