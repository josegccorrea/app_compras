import { createClient } from '@/lib/supabase/server'
import { ProdutosPage } from '@/components/forms/produtos-page'

export const metadata = { title: 'Produtos — Colibri Compras' }

export default async function Produtos() {
  const supabase = await createClient()

  const [{ data: familias }, { data: fornecedores }] = await Promise.all([
    supabase.from('familias').select('id, nome, departamentos(id, nome, secoes(id, nome))').order('nome'),
    supabase.from('fornecedores').select('id, razao_social, nome_fantasia').eq('status', 'ativo').order('razao_social'),
  ])

  return <ProdutosPage familias={familias ?? []} fornecedores={fornecedores ?? []} />
}
