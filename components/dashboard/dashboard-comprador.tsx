'use client'

import Link from 'next/link'
import { StatCard } from './stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  ClipboardList,
  KanbanSquare,
  ListChecks,
  Package,
  ShoppingCart,
  TrendingDown,
} from 'lucide-react'
import type { Profile } from '@/types/app'

interface DashboardCompradorProps {
  profile: Profile
}

export function DashboardComprador({ profile }: DashboardCompradorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Bom dia, {profile.full_name.split(' ')[0]}!</h2>
        <p className="text-muted-foreground text-sm">Aqui está o resumo da sua carteira hoje.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tarefas do dia" value="—" icon={KanbanSquare} />
        <StatCard title="Pedidos em análise" value="—" icon={ClipboardList} variant="warning" />
        <StatCard title="SKUs com risco de ruptura" value="—" icon={AlertTriangle} variant="danger" />
        <StatCard title="SKUs com cobertura excessiva" value="—" icon={TrendingDown} variant="info" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/analise-lote">
                <ListChecks className="h-4 w-4" />
                Nova análise em lote
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/sku">
                <Package className="h-4 w-4" />
                Pesquisar SKU
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start gap-2">
              <Link href="/compras">
                <ShoppingCart className="h-4 w-4" />
                Ver sugestões de compra
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alertas da carteira</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-muted-foreground">Nenhum alerta crítico no momento.</span>
              </div>
            </div>
            <Button asChild variant="link" className="px-0 mt-2 h-auto text-xs">
              <Link href="/sku">Ver todos os SKUs →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Pending orders */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base">Pedidos recentes</CardTitle>
          <Button asChild variant="link" className="h-auto p-0 text-xs">
            <Link href="/pedidos">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground py-4 text-center">
            Nenhum pedido encontrado. <Link href="/compras" className="text-colibri-600 hover:underline">Crie o primeiro pedido.</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
