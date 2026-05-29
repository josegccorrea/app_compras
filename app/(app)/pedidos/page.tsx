import { createClient } from '@/lib/supabase/server'
import { PedidosListPage } from '@/components/forms/pedidos-list-page'
import type { Profile } from '@/types/app'

export const metadata = { title: 'Pedidos — Colibri Compras' }

const defaultProfile: Profile = {
  id: 'guest', email: '', full_name: 'Colibri Compras', role: 'gerente',
  ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}

export default async function Pedidos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile = defaultProfile
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) profile = data
  }

  const query = supabase
    .from('pedidos')
    .select('*, fornecedor:fornecedores(razao_social, nome_fantasia), responsavel:profiles!pedidos_responsavel_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (user && profile.role === 'comprador') query.eq('responsavel_id', user.id)

  const { data: pedidos } = await query

  return <PedidosListPage pedidosIniciais={pedidos ?? []} perfil={profile} />
}
