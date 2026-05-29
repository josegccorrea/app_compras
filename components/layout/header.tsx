'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { LogOut, User, ChevronDown } from 'lucide-react'
import type { Profile } from '@/types/app'

const ROLE_LABELS: Record<string, string> = {
  comprador: 'Comprador',
  cadastro: 'Cadastro',
  gerente: 'Gerente',
}

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'info'> = {
  comprador: 'default',
  cadastro: 'secondary',
  gerente: 'info',
}

interface HeaderProps {
  profile: Profile
  title?: string
}

export function Header({ profile, title }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        {title && <h1 className="text-base font-semibold text-foreground">{title}</h1>}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-9">
            <div className="bg-colibri-100 text-colibri-700 rounded-full h-7 w-7 flex items-center justify-center text-xs font-bold">
              {profile.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium leading-none">{profile.full_name}</p>
              <Badge variant={ROLE_VARIANTS[profile.role] ?? 'default'} className="mt-0.5 text-xs py-0">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </Badge>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <p className="font-medium">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground font-normal">{profile.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
