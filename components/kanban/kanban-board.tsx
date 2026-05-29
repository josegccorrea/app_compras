'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, GripVertical, AlertTriangle, Calendar, User } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import type { Profile, StatusPedido, PrioridadeTarefa } from '@/types/app'

const COLUNAS: { status: StatusPedido; label: string; cor: string }[] = [
  { status: 'rascunho', label: 'Rascunho', cor: 'bg-gray-100' },
  { status: 'em_analise', label: 'Em análise', cor: 'bg-blue-50' },
  { status: 'aprovado', label: 'Aprovado', cor: 'bg-green-50' },
  { status: 'enviado_fornecedor', label: 'Enviado', cor: 'bg-yellow-50' },
  { status: 'faturado', label: 'Faturado', cor: 'bg-orange-50' },
  { status: 'entregue', label: 'Entregue', cor: 'bg-emerald-50' },
  { status: 'encerrado', label: 'Encerrado', cor: 'bg-gray-50' },
]

const PRIORIDADE_COLORS: Record<PrioridadeTarefa, string> = {
  baixa: 'bg-gray-100 text-gray-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
}

interface KanbanBoardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tarefasIniciais: any[]
  perfil: Profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compradores: any[]
}

export function KanbanBoard({ tarefasIniciais, perfil, compradores }: KanbanBoardProps) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tarefas, setTarefas] = useState<any[]>(tarefasIniciais)
  const [novaDialog, setNovaDialog] = useState(false)
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: '',
    tipo: 'cadastral' as 'fornecedor' | 'loja' | 'cadastral',
    prioridade: 'media' as PrioridadeTarefa,
    responsavel_id: perfil.id,
    prazo: '',
    observacao: '',
  })

  async function moverTarefa(id: string, novoStatus: StatusPedido) {
    const { error } = await supabase.from('tarefas').update({ status: novoStatus }).eq('id', id)
    if (error) {
      toast.error('Erro ao mover tarefa')
      return
    }
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, status: novoStatus } : t)))
    toast.success('Tarefa atualizada')
  }

  async function criarTarefa() {
    const { data, error } = await supabase
      .from('tarefas')
      .insert({
        ...novaTarefa,
        status: 'rascunho',
        prazo: novaTarefa.prazo || null,
      })
      .select('*, responsavel:profiles(id, full_name)')
      .single()

    if (error) { toast.error('Erro ao criar tarefa'); return }

    setTarefas((prev) => [data, ...prev])
    setNovaDialog(false)
    setNovaTarefa({ titulo: '', tipo: 'cadastral', prioridade: 'media', responsavel_id: perfil.id, prazo: '', observacao: '' })
    toast.success('Tarefa criada!')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Tarefas</h2>
          <p className="text-sm text-muted-foreground">{tarefas.length} tarefa(s) no total</p>
        </div>
        <Button onClick={() => setNovaDialog(true)} className="bg-colibri-600 hover:bg-colibri-700 gap-2">
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {COLUNAS.map((col) => {
          const colTarefas = tarefas.filter((t) => t.status === col.status)
          return (
            <div key={col.status} className={cn('flex-shrink-0 w-64 rounded-lg p-3', col.cor)}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 border">
                  {colTarefas.length}
                </span>
              </div>
              <div className="space-y-2">
                {colTarefas.map((tarefa) => (
                  <TarefaCard
                    key={tarefa.id}
                    tarefa={tarefa}
                    colunas={COLUNAS}
                    onMover={moverTarefa}
                    podeGerenciar={perfil.role === 'gerente'}
                  />
                ))}
                {colTarefas.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4 border-2 border-dashed rounded-md">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog nova tarefa */}
      <Dialog open={novaDialog} onOpenChange={setNovaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título *</Label>
              <Input
                value={novaTarefa.titulo}
                onChange={(e) => setNovaTarefa((p) => ({ ...p, titulo: e.target.value }))}
                placeholder="Descreva a tarefa..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={novaTarefa.tipo} onValueChange={(v) => setNovaTarefa((p) => ({ ...p, tipo: v as 'fornecedor' | 'loja' | 'cadastral' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cadastral">Cadastral</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="loja">Loja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={novaTarefa.prioridade} onValueChange={(v) => setNovaTarefa((p) => ({ ...p, prioridade: v as PrioridadeTarefa }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {perfil.role === 'gerente' && (
              <div>
                <Label>Responsável</Label>
                <Select value={novaTarefa.responsavel_id} onValueChange={(v) => setNovaTarefa((p) => ({ ...p, responsavel_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {compradores.map((c: { id: string; full_name: string }) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={novaTarefa.prazo}
                onChange={(e) => setNovaTarefa((p) => ({ ...p, prazo: e.target.value }))}
              />
            </div>
            <div>
              <Label>Observação</Label>
              <Textarea
                value={novaTarefa.observacao}
                onChange={(e) => setNovaTarefa((p) => ({ ...p, observacao: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaDialog(false)}>Cancelar</Button>
            <Button onClick={criarTarefa} disabled={!novaTarefa.titulo} className="bg-colibri-600 hover:bg-colibri-700">
              Criar tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface TarefaCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tarefa: any
  colunas: typeof COLUNAS
  onMover: (id: string, status: StatusPedido) => void
  podeGerenciar: boolean
}

function TarefaCard({ tarefa, colunas, onMover, podeGerenciar }: TarefaCardProps) {
  const prioridade = tarefa.prioridade as PrioridadeTarefa
  const currentIdx = colunas.findIndex((c) => c.status === tarefa.status)

  return (
    <Card className="p-3 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug line-clamp-2">{tarefa.titulo}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', PRIORIDADE_COLORS[prioridade])}>
            {prioridade}
          </span>
          <span className="text-xs text-muted-foreground capitalize">{tarefa.tipo}</span>
        </div>

        {tarefa.prazo && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(tarefa.prazo)}
          </div>
        )}

        {tarefa.responsavel && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {tarefa.responsavel.full_name}
          </div>
        )}

        {/* Botões de mover */}
        <div className="flex gap-1 pt-1">
          {currentIdx > 0 && (
            <button
              onClick={() => onMover(tarefa.id, colunas[currentIdx - 1].status)}
              className="text-xs text-muted-foreground hover:text-foreground flex-1 text-center border rounded py-0.5 hover:bg-gray-50"
            >
              ← Voltar
            </button>
          )}
          {currentIdx < colunas.length - 1 && (
            <button
              onClick={() => onMover(tarefa.id, colunas[currentIdx + 1].status)}
              className="text-xs text-colibri-700 hover:text-colibri-900 flex-1 text-center border border-colibri-200 rounded py-0.5 hover:bg-colibri-50"
            >
              Avançar →
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
