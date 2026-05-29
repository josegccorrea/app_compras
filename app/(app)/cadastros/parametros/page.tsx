import { createClient } from '@/lib/supabase/server'
import { ParametrosPage } from '@/components/forms/parametros-page'

export const metadata = { title: 'Parâmetros — Colibri Compras' }

export default async function Parametros() {
  const supabase = await createClient()
  const { data: familias } = await supabase
    .from('familias')
    .select('id, nome, cobertura_alvo_semanas, cobertura_minima_semanas, parametros_operacionais(id, lead_time_fornecedor_cd, lead_time_fornecedor_loja, lead_time_cd_loja)')
    .order('nome')

  return <ParametrosPage familiasIniciais={familias ?? []} />
}
