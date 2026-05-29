'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Download, TrendingDown, TrendingUp, Users, Package } from 'lucide-react'

export function RelatoriosPage() {
  const relatorios = [
    { titulo: 'Cobertura média por família', descricao: 'Visão consolidada de cobertura de estoque por família de produtos.', icon: BarChart3, disponivel: true },
    { titulo: 'Capital empatado acima da cobertura', descricao: 'Itens com estoque acima da cobertura alvo e o capital correspondente.', icon: TrendingUp, disponivel: true },
    { titulo: 'Risco de ruptura potencial', descricao: 'SKUs com cobertura abaixo do necessário para atravessar o lead time.', icon: TrendingDown, disponivel: true },
    { titulo: 'Performance por comprador', descricao: 'Análise de pedidos montados, divergências e cumprimento de tarefas.', icon: Users, disponivel: false },
    { titulo: 'Volume por fornecedor', descricao: 'Compras, SKUs vinculados e concentração de risco por fornecedor.', icon: Package, disponivel: false },
    { titulo: 'Divergências da sugestão', descricao: 'Pedidos onde o comprador alterou a quantidade sugerida pelo sistema.', icon: BarChart3, disponivel: false },
    { titulo: 'Relatório de apostas', descricao: 'Itens classificados como aposta e seu comportamento posterior.', icon: Package, disponivel: false },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Relatórios Gerenciais</h2>
        <p className="text-sm text-muted-foreground">Visão analítica consolidada da operação de Compras.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatorios.map((r) => {
          const Icon = r.icon
          return (
            <Card key={r.titulo} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="bg-colibri-50 p-2 rounded-lg">
                    <Icon className="h-5 w-5 text-colibri-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{r.titulo}</p>
                      {!r.disponivel && <Badge variant="secondary" className="text-xs">Em breve</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.descricao}</p>
                    {r.disponivel && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                          <Download className="h-3 w-3" /> XLSX
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                          <Download className="h-3 w-3" /> CSV
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                          <Download className="h-3 w-3" /> PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
