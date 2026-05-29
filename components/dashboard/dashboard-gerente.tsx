'use client'

import Link from 'next/link'
import { StatCard } from './stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  KanbanSquare,
  Package,
  TrendingDown,
  Users,
} from 'lucide-react'
import type { Profile } from '@/types/app'

interface DashboardGerenteProps {
  profile: Profile
}

export function DashboardGerente({ profile }: DashboardGerenteProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Bom dia, {profile.full_name.split(' ')[0]}!</h2>
        <p className="text-muted-foreground text-sm">Visão consolidada do time de Compras.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pedidos aguardando aprovação" value="—" icon={ClipboardList} variant="warning" />
        <StatCard title="SKUs com risco de ruptura" value="—" icon={AlertTriangle} variant="danger" />
        <StatCard title="Capital acima da cobertura" value="—" icon={TrendingDown} variant="info" />
        <StatCard title="Pedidos aprovados hoje" value="—" icon={CheckCircle2} variant="success" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tarefas por comprador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma tarefa ativa no momento.
            </div>
            <Button asChild variant="link" className="px-0 h-auto text-xs">
              <Link href="/tarefas">Ver Kanban →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Itens com maior risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhum item crítico detectado.
            </div>
            <Button asChild variant="link" className="px-0 h-auto text-xs">
              <Link href="/sku">Analisar SKUs →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pendências cadastrais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKUs sem classificação</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKUs sem fornecedor</span>
                <span className="font-medium">—</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fornecedores incompletos</span>
                <span className="font-medium">—</span>
              </div>
            </div>
            <Button asChild variant="link" className="px-0 h-auto text-xs mt-2">
              <Link href="/relatorios">Ver relatório completo →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">Pedidos por status</CardTitle>
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href="/pedidos">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhum pedido ativo.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">Divergências da sugestão</CardTitle>
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link href="/relatorios">Ver relatório</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma divergência registrada.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
