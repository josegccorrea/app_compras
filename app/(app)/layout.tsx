import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile = defaultProfile

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) profile = data
  }

  return <AppShell profile={profile}>{children}</AppShell>
}
