import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import type { Profile } from '@/types/app'

export const metadata = { title: 'Tarefas — Colibri Compras' }

const defaultProfile: Profile = {
  id: 'guest', email: '', full_name: 'Colibri Compras', role: 'gerente',
  ativo: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
}

export default async function TarefasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile = defaultProfile
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) profile = data
  }

  const query = supabase
    .from('tarefas')
    .select('*, responsavel:profiles(id, full_name), fornecedor:fornecedores(id, razao_social)')
    .order('created_at', { ascending: false })

  if (user && profile.role === 'comprador') query.eq('responsavel_id', user.id)

  const { data: tarefas } = await query

  const { data: compradores } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('ativo', true)
    .order('full_name')

  return (
    <KanbanBoard
      tarefasIniciais={tarefas ?? []}
      perfil={profile}
      compradores={compradores ?? []}
    />
  )
}
