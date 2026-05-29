'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDate, formatDatetime } from '@/lib/utils/format'
import { ClipboardList } from 'lucide-react'
import type { Profile, StatusPedido } from '@/types/app'
import { STATUS_PEDIDO_LABELS } from '@/types/app'

interface PedidosListPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pedidosIniciais: any[]
  perfil: Profile
}

const statusVariant: Record<StatusPedido, 'default' | 'secondary' | 'warning' | 'success' | 'info' | 'danger'> = {
  rascunho: 'secondary',
  em_analise: 'info',
  aprovado: 'success',
  enviado_fornecedor: 'warning',
  faturado: 'warning',
  entregue: 'success',
  encerrado: 'secondary',
}

export function PedidosListPage({ pedidosIniciais, perfil }: PedidosListPageProps) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pedidos, setPedidos] = useState<any[]>(pedidosIniciais)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  async function avancarStatus(pedido: { id: string; status: StatusPedido; responsavel_id: string }) {
    const fluxo: StatusPedido[] = ['rascunho', 'em_analise', 'aprovado', 'enviado_fornecedor', 'faturado', 'entregue', 'encerrado']
    const idx = fluxo.indexOf(pedido.status)

    // Gerente aprova de em_analise para aprovado
    if (pedido.status === 'em_analise' && perfil.role !== 'gerente') {
      toast.error('Somente o gerente pode aprovar pedidos.')
      return
    }

    if (idx < fluxo.length - 1) {
      const novoStatus = fluxo[idx + 1]
      const updateData: Record<string, unknown> = { status: novoStatus }
      if (novoStatus === 'aprovado') {
        updateData.aprovado_por = perfil.id
        updateData.aprovado_em = new Date().toISOString()
      }

      const { error } = await supabase.from('pedidos').update(updateData).eq('id', pedido.id)
      if (error) { toast.error(error.message); return }
      setPedidos((prev) => prev.map((p) => p.id === pedido.id ? { ...p, ...updateData } : p))
      toast.success(`Pedido avançado para: ${STATUS_PEDIDO_LABELS[novoStatus]}`)
    }
  }

  const pedidosFiltrados = filtroStatus === 'todos'
    ? pedidos
    : pedidos.filter((p) => p.status === filtroStatus)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Pedidos</h2>
          <p className="text-sm text-muted-foreground">{pedidos.length} pedido(s)</p>
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(STATUS_PEDIDO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {pedidosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
              <p className="text-sm text-muted-foreground mt-1">Crie pedidos a partir da análise de SKU ou sugestão de compra.</p>
            </div>
          ) : (
            <div className="divide-y">
              {pedidosFiltrados.map((pedido) => (
                <div key={pedido.id} className="px-4 py-4 hover:bg-muted/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {pedido.fornecedor?.nome_fantasia ?? pedido.fornecedor?.razao_social ?? '—'}
                        </p>
                        <Badge variant={statusVariant[pedido.status as StatusPedido]}>
                          {STATUS_PEDIDO_LABELS[pedido.status as StatusPedido]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Responsável: {pedido.responsavel?.full_name}</span>
                        <span>Criado: {formatDatetime(pedido.created_at)}</span>
                        {pedido.numero_pedido_externo && <span>Pedido nº {pedido.numero_pedido_externo}</span>}
                      </div>
                      {pedido.observacoes && <p className="text-xs text-muted-foreground mt-1">{pedido.observacoes}</p>}
                    </div>
                    <div className="flex gap-2">
                      {pedido.status !== 'encerrado' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => avancarStatus(pedido)}
                          className="text-xs"
                        >
                          Avançar →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
