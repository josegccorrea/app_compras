'use client'

import Link from 'next/link'
import { StatCard } from './stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Package, Tag, Upload, Users } from 'lucide-react'
import type { Profile } from '@/types/app'

interface DashboardCadastroProps {
  profile: Profile
}

export function DashboardCadastro({ profile }: DashboardCadastroProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Bom dia, {profile.full_name.split(' ')[0]}!</h2>
        <p className="text-muted-foreground text-sm">Pendências de cadastro para hoje.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="SKUs incompletos" value="—" icon={Package} variant="warning" />
        <StatCard title="Fornecedores incompletos" value="—" icon={Users} variant="warning" />
        <StatCard title="SKUs sem classificação" value="—" icon={Tag} variant="danger" />
        <StatCard title="Problemas de importação" value="—" icon={AlertTriangle} variant="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/cadastros/produtos">
                <Package className="h-4 w-4" />
                Gerenciar produtos
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/cadastros/fornecedores">
                <Users className="h-4 w-4" />
                Gerenciar fornecedores
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/importacao">
                <Upload className="h-4 w-4" />
                Importar arquivo
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/cadastros/classificacoes">
                <Tag className="h-4 w-4" />
                Gerenciar classificações
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">SKUs novos vindos de NF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhum SKU novo pendente de classificação.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
