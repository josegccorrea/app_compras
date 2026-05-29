'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Search, Edit, Package } from 'lucide-react'

const produtoSchema = z.object({
  codigo_interno: z.string().min(1, 'Código obrigatório'),
  descricao: z.string().min(1, 'Descrição obrigatória'),
  codigo_barras: z.string().optional().nullable(),
  unidade_compra: z.string().min(1, 'Unidade obrigatória'),
  unidade_venda: z.string().min(1, 'Unidade obrigatória'),
  fator_conversao: z.number().default(1),
  fornecedor_padrao_id: z.string().optional().nullable(),
  familia_id: z.string().optional().nullable(),
  departamento_id: z.string().optional().nullable(),
  secao_id: z.string().optional().nullable(),
  status: z.enum(['ativo', 'inativo', 'bloqueado']).default('ativo'),
  sazonal: z.boolean().default(false),
  aposta: z.boolean().default(false),
  observacoes: z.string().optional().nullable(),
})

type ProdutoForm = z.infer<typeof produtoSchema>

interface ProdutosPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  familias: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fornecedores: any[]
}

export function ProdutosPage({ familias, fornecedores }: ProdutosPageProps) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [dialog, setDialog] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editando, setEditando] = useState<any>(null)
  const [selectedFamilia, setSelectedFamilia] = useState<string>('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ProdutoForm>({
    resolver: zodResolver(produtoSchema),
    defaultValues: { unidade_compra: 'UN', unidade_venda: 'UN', fator_conversao: 1, status: 'ativo', sazonal: false, aposta: false },
  })

  const familiaId = watch('familia_id')
  const familiaAtual = familias.find((f: { id: string }) => f.id === familiaId)

  useEffect(() => { carregarProdutos() }, [])

  async function carregarProdutos() {
    setLoading(true)
    const { data } = await supabase
      .from('produtos')
      .select('id, codigo_interno, descricao, status, sazonal, aposta, unidade_compra, familia:familias(nome), fornecedor_padrao:fornecedores(razao_social)')
      .order('descricao')
      .limit(100)
    setProdutos(data ?? [])
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    reset({ unidade_compra: 'UN', unidade_venda: 'UN', fator_conversao: 1, status: 'ativo', sazonal: false, aposta: false })
    setDialog(true)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function abrirEdicao(produto: any) {
    setEditando(produto)
    reset({
      codigo_interno: produto.codigo_interno,
      descricao: produto.descricao,
      unidade_compra: produto.unidade_compra,
      unidade_venda: produto.unidade_venda,
      fator_conversao: produto.fator_conversao ?? 1,
      status: produto.status,
      sazonal: produto.sazonal,
      aposta: produto.aposta,
      fornecedor_padrao_id: produto.fornecedor_padrao_id,
      familia_id: produto.familia_id,
      departamento_id: produto.departamento_id,
      secao_id: produto.secao_id,
      observacoes: produto.observacoes,
    })
    setDialog(true)
  }

  async function onSubmit(data: ProdutoForm) {
    const payload = {
      ...data,
      fornecedor_padrao_id: data.fornecedor_padrao_id || null,
      familia_id: data.familia_id || null,
      departamento_id: data.departamento_id || null,
      secao_id: data.secao_id || null,
    }

    if (editando) {
      const { error } = await supabase.from('produtos').update(payload).eq('id', editando.id)
      if (error) { toast.error('Erro ao atualizar: ' + error.message); return }
      toast.success('Produto atualizado!')
    } else {
      const { error } = await supabase.from('produtos').insert(payload)
      if (error) { toast.error('Erro ao criar: ' + error.message); return }
      toast.success('Produto criado!')
    }

    setDialog(false)
    carregarProdutos()
  }

  const produtosFiltrados = produtos.filter((p) =>
    !busca || p.codigo_interno.toLowerCase().includes(busca.toLowerCase()) || p.descricao.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Produtos</h2>
          <p className="text-sm text-muted-foreground">{produtos.length} produto(s) cadastrado(s)</p>
        </div>
        <Button onClick={abrirNovo} className="bg-colibri-600 hover:bg-colibri-700 gap-2">
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por código ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum produto encontrado.</p>
              <Button onClick={abrirNovo} variant="link">Cadastrar o primeiro produto</Button>
            </div>
          ) : (
            <div className="divide-y">
              {produtosFiltrados.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{p.codigo_interno}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm truncate">{p.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {p.familia && <span className="text-xs text-muted-foreground">{p.familia.nome}</span>}
                      {p.fornecedor_padrao && <span className="text-xs text-muted-foreground">· {p.fornecedor_padrao.razao_social}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.sazonal && <Badge variant="info" className="text-xs">Sazonal</Badge>}
                    {p.aposta && <Badge variant="warning" className="text-xs">Aposta</Badge>}
                    <Badge variant={p.status === 'ativo' ? 'success' : p.status === 'bloqueado' ? 'danger' : 'secondary'}>
                      {p.status}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(p)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código interno *</Label>
                <Input {...register('codigo_interno')} className="mt-1" placeholder="Ex: 001234" />
                {errors.codigo_interno && <p className="text-xs text-red-600 mt-1">{errors.codigo_interno.message}</p>}
              </div>
              <div>
                <Label>Código de barras</Label>
                <Input {...register('codigo_barras')} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input {...register('descricao')} className="mt-1" />
              {errors.descricao && <p className="text-xs text-red-600 mt-1">{errors.descricao.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Unidade de compra *</Label>
                <Input {...register('unidade_compra')} className="mt-1" placeholder="UN, CX, KG..." />
              </div>
              <div>
                <Label>Unidade de venda *</Label>
                <Input {...register('unidade_venda')} className="mt-1" />
              </div>
              <div>
                <Label>Fator de conversão</Label>
                <Input type="number" step="0.0001" {...register('fator_conversao', { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Fornecedor padrão</Label>
              <Select onValueChange={(v) => setValue('fornecedor_padrao_id', v === 'none' ? null : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {fornecedores.map((f: { id: string; razao_social: string; nome_fantasia: string | null }) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome_fantasia ?? f.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Família</Label>
                <Select onValueChange={(v) => { setValue('familia_id', v === 'none' ? null : v); setSelectedFamilia(v === 'none' ? '' : v) }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Família..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {familias.map((f: { id: string; nome: string }) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departamento</Label>
                <Select onValueChange={(v) => setValue('departamento_id', v === 'none' ? null : v)} disabled={!selectedFamilia}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Depto..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(familiaAtual?.departamentos ?? []).map((d: { id: string; nome: string }) => (
                      <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select defaultValue="ativo" onValueChange={(v) => setValue('status', v as 'ativo' | 'inativo' | 'bloqueado')}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch id="sazonal" onCheckedChange={(v) => setValue('sazonal', v)} />
                <Label htmlFor="sazonal">Sazonal</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="aposta" onCheckedChange={(v) => setValue('aposta', v)} />
                <Label htmlFor="aposta">Aposta</Label>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea {...register('observacoes')} className="mt-1" rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-colibri-600 hover:bg-colibri-700">
                {isSubmitting ? 'Salvando...' : editando ? 'Atualizar' : 'Criar produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
