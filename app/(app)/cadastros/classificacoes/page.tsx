import { createClient } from '@/lib/supabase/server'
import { ClassificacoesPage } from '@/components/forms/classificacoes-page'

export const metadata = { title: 'Classificações — Colibri Compras' }

export default async function Classificacoes() {
  const supabase = await createClient()
  const { data: familias } = await supabase
    .from('familias')
    .select('id, nome, cobertura_alvo_semanas, cobertura_minima_semanas, departamentos(id, nome, secoes(id, nome))')
    .order('nome')

  return <ClassificacoesPage familiasIniciais={familias ?? []} />
}
