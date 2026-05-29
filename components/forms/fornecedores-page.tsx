'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Edit, Plus, Search, Users } from 'lucide-react'

const fornecedorSchema = z.object({
  razao_social: z.string().min(1, 'Razão social obrigatória'),
  nome_fantasia: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  prazo_entrega_dias: z.number().optional().nullable(),
  habilitado_cd: z.boolean().default(false),
  habilitado_loja: z.boolean().default(true),
  condicao_pagamento: z.string().optional().nullable(),
  nome_vendedor: z.string().optional().nullable(),
  comprador_id: z.string().optional().nullable(),
  observacoes_comerciais: z.string().optional().nullable(),
  politica_comercial: z.string().optional().nullable(),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
})

type FornecedorForm = z.infer<typeof fornecedorSchema>

interface FornecedoresPageProps {
  compradores: { id: string; full_name: string }[]
}

export function FornecedoresPage({ compradores }: FornecedoresPageProps) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [dialog, setDialog] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editando, setEditando] = useState<any>(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FornecedorForm>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: { habilitado_cd: false, habilitado_loja: true, status: 'ativo' },
  })

  const habCd = watch('habilitado_cd')
  const habLoja = watch('habilitado_loja')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('fornecedores')
      .select('id, razao_social, nome_fantasia, cnpj, prazo_entrega_dias, habilitado_cd, habilitado_loja, status, comprador:profiles(full_name)')
      .order('razao_social')
    setFornecedores(data ?? [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    reset({ habilitado_cd: false, habilitado_loja: true, status: 'ativo' })
    setDialog(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function abrirEdicao(f: any) {
    setEditando(f)
    reset(f)
    setDialog(true)
  }

  async function onSubmit(data: FornecedorForm) {
    const payload = { ...data, comprador_id: data.comprador_id || null }

    if (editando) {
      const { error } = await supabase.from('fornecedores').update(payload).eq('id', editando.id)
      if (error) { toast.error('Erro: ' + error.message); return }
      toast.success('Fornecedor atualizado!')
    } else {
      const { error } = await supabase.from('fornecedores').insert(payload)
      if (error) { toast.error('Erro: ' + error.message); return }
      toast.success('Fornecedor criado!')
    }

    setDialog(false)
    carregar()
  }

  const filtrados = fornecedores.filter((f) =>
    !busca || f.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
    (f.nome_fantasia && f.nome_fantasia.toLowerCase().includes(busca.toLowerCase())) ||
    (f.cnpj && f.cnpj.includes(busca))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Fornecedores</h2>
          <p className="text-sm text-muted-foreground">{fornecedores.length} fornecedor(es)</p>
        </div>
        <Button onClick={abrirNovo} className="bg-colibri-600 hover:bg-colibri-700 gap-2">
          <Plus className="h-4 w-4" /> Novo fornecedor
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por razão social, fantasia ou CNPJ..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum fornecedor encontrado.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtrados.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div>
                    <p className="font-medium text-sm">{f.nome_fantasia ?? f.razao_social}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {f.cnpj && <span className="text-xs text-muted-foreground">{f.cnpj}</span>}
                      {f.prazo_entrega_dias && <span className="text-xs text-muted-foreground">{f.prazo_entrega_dias}d entrega</span>}
                      {f.comprador && <span className="text-xs text-muted-foreground">Comprador: {f.comprador.full_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.habilitado_cd && <Badge variant="info" className="text-xs">CD</Badge>}
                    {f.habilitado_loja && <Badge variant="secondary" className="text-xs">Loja</Badge>}
                    <Badge variant={f.status === 'ativo' ? 'success' : 'secondary'}>{f.status}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(f)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Razão social *</Label>
                <Input {...register('razao_social')} className="mt-1" />
                {errors.razao_social && <p className="text-xs text-red-600 mt-1">{errors.razao_social.message}</p>}
              </div>
              <div>
                <Label>Nome fantasia</Label>
                <Input {...register('nome_fantasia')} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CNPJ</Label>
                <Input {...register('cnpj')} className="mt-1" placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <Label>Prazo de entrega (dias)</Label>
                <Input type="number" {...register('prazo_entrega_dias', { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do vendedor</Label>
                <Input {...register('nome_vendedor')} className="mt-1" />
              </div>
              <div>
                <Label>Comprador designado</Label>
                <Select onValueChange={(v) => setValue('comprador_id', v === 'none' ? null : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {compradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Condição de pagamento</Label>
              <Input {...register('condicao_pagamento')} className="mt-1" placeholder="Ex: 30/60/90 DDL" />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch id="hab_cd" checked={habCd} onCheckedChange={(v) => setValue('habilitado_cd', v)} />
                <Label htmlFor="hab_cd">Habilitado para CD</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="hab_loja" checked={habLoja} onCheckedChange={(v) => setValue('habilitado_loja', v)} />
                <Label htmlFor="hab_loja">Habilitado para loja</Label>
              </div>
            </div>
            <div>
              <Label>Política comercial</Label>
              <Textarea {...register('politica_comercial')} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Observações comerciais</Label>
              <Textarea {...register('observacoes_comerciais')} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select defaultValue="ativo" onValueChange={(v) => setValue('status', v as 'ativo' | 'inativo')}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-colibri-600 hover:bg-colibri-700">
                {isSubmitting ? 'Salvando...' : editando ? 'Atualizar' : 'Criar fornecedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
