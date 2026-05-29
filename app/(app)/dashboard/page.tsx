import { createClient } from '@/lib/supabase/server'
import { DashboardComprador } from '@/components/dashboard/dashboard-comprador'
import { DashboardCadastro } from '@/components/dashboard/dashboard-cadastro'
import { DashboardGerente } from '@/components/dashboard/dashboard-gerente'
import type { Profile } from '@/types/app'

const defaultProfile: Profile = {
  id: 'guest',
  email: '',
  full_name: 'Colibri Compras',
  role: 'gerente',
  ativo: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile = defaultProfile
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) profile = data
  }

  if (profile.role === 'comprador') return <DashboardComprador profile={profile} />
  if (profile.role === 'cadastro') return <DashboardCadastro profile={profile} />
  return <DashboardGerente profile={profile} />
}
