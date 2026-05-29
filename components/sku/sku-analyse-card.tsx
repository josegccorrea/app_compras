'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { SalesChart } from '../charts/sales-chart'
import { SuggestionPanel } from './suggestion-panel'
import { AlertSemaphore } from '../alerts/alert-semaphore'
import {
  AlertTriangle,
  Bot,
  Building2,
  Package,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  TrendingUp,
} from 'lucide-react'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format'
import { calcularDemanda, agruparPorSemana } from '@/lib/business/demand'
import type { Operacao } from '@/types/app'

interface SkuAnalyseCardProps {
  produtoId: string
  operacoes: Operacao[]
  janelaUsuario: number
}

export function SkuAnalyseCard({ produtoId, operacoes, janelaUsuario }: SkuAnalyseCardProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [produto, setProduto] = useState<Record<string, unknown> | null>(null)
  const [vendasPorOp, setVendasPorOp] = useState<Record<string, { data: string; quantidade: number }[]>>({})
  const [estoquesPorOp, setEstoquesPorOp] = useState<Record<string, { quantidade: number; confiavel: boolean }>>({})
  const [ultimasNfs, setUltimasNfs] = useState<Record<string, unknown>[]>([])
  const [explicacaoIA, setExplicacaoIA] = useState<string | null>(null)
  const [loadingIA, setLoadingIA] = useState(false)

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId])

  async function loadData() {
    setLoading(true)

    const [{ data: prod }, { data: vendas }, { data: estoques }, { data: confiab }, { data: nfs }] =
      await Promise.all([
        supabase
          .from('produtos')
          .select('*, familia:familias(nome), departamento:departamentos(nome), fornecedor_padrao:fornecedores(razao_social, nome_fantasia)')
          .eq('id', produtoId)
          .single(),
        supabase
          .from('vendas')
          .select('operacao_id, data, quantidade')
          .eq('produto_id', produtoId)
          .gte('data', getDataInicio(janelaUsuario + 4)),
        supabase
          .from('estoques')
          .select('operacao_id, data, quantidade')
          .eq('produto_id', produtoId)
          .order('data', { ascending: false })
          .limit(50),
        supabase
          .from('estoque_confiabilidade')
          .select('operacao_id, confiavel')
          .eq('produto_id', produtoId),
        supabase
          .from('nf_entradas')
          .select('operacao_id, data_entrada, quantidade, custo, fornecedor:fornecedores(razao_social)')
          .eq('produto_id', produtoId)
          .order('data_entrada', { ascending: false })
          .limit(9), // até 3 por operação
      ])

    setProduto(prod)

    // Agrupar vendas por operação
    const vMap: Record<string, { data: string; quantidade: number }[]> = {}
    for (const v of vendas ?? []) {
      if (!vMap[v.operacao_id]) vMap[v.operacao_id] = []
      vMap[v.operacao_id].push({ data: v.data, quantidade: v.quantidade })
    }
    setVendasPorOp(vMap)

    // Pegar último estoque por operação
    const eMap: Record<string, { quantidade: number; confiavel: boolean }> = {}
    const confiabMap = new Map((confiab ?? []).map((c: any) => [c.operacao_id, c.confiavel]))
    for (const e of estoques ?? []) {
      if (!eMap[e.operacao_id]) {
        eMap[e.operacao_id] = {
          quantidade: e.quantidade,
          confiavel: (confiabMap.get(e.operacao_id) ?? false) as boolean,
        }
      }
    }
    setEstoquesPorOp(eMap)
    setUltimasNfs(nfs ?? [])
    setLoading(false)
  }

  async function gerarAnaliseIA(operacaoId: string, operacaoNome: string) {
    setLoadingIA(true)
    try {
      const vendas = vendasPorOp[operacaoId] ?? []
      const vendaSemanais = agruparPorSemana(vendas)
      const demanda = calcularDemanda(vendaSemanais, janelaUsuario)
      const estoque = estoquesPorOp[operacaoId] ?? { quantidade: 0, confiavel: false }

      const dados = {
        skuCodigo: (produto as Record<string, unknown>)?.codigo_interno,
        skuDescricao: (produto as Record<string, unknown>)?.descricao,
        janelaEscolhida: janelaUsuario,
        demanda,
        estoqueAtual: estoque.quantidade,
        estoqueConfiavel: estoque.confiavel,
        coberturaAlvo: 4,
        coberturaAtual: demanda.demandaBase > 0 ? estoque.quantidade / demanda.demandaBase : 0,
        sugestaoQuantidade: Math.ceil(Math.max(0, demanda.demandaBase * 4 - estoque.quantidade)),
        operacaoNome,
        leadTimeDias: 7,
        riscoRuptura: false,
        coberturaExcessiva: false,
      }

      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'individual', dados }),
      })
      const json = await res.json()
      setExplicacaoIA(json.explicacao)
    } finally {
      setLoadingIA(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!produto) return null

  const p = produto as Record<string, unknown>
  const fornecedor = p.fornecedor_padrao as Record<string, unknown> | null
  const lojas = operacoes.filter((o) => o.tipo === 'loja')

  return (
    <div className="space-y-4">
      {/* Cabeçalho do SKU */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Fornecedor padrão</p>
              <p className="text-sm font-medium mt-1">
                {fornecedor
                  ? String(fornecedor.nome_fantasia ?? fornecedor.razao_social)
                  : <span className="text-yellow-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Sem fornecedor</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Classificação</p>
              <p className="text-sm font-medium mt-1">
                {p.familia ? String((p.familia as Record<string, unknown>).nome) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">
                <Badge variant={String(p.status) === 'ativo' ? 'success' : 'secondary'}>
                  {String(p.status)}
                </Badge>
                {!!p.sazonal && <Badge variant="info" className="ml-1">Sazonal</Badge>}
                {!!p.aposta && <Badge variant="warning" className="ml-1">Aposta</Badge>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unidade</p>
              <p className="text-sm font-medium mt-1">{String(p.unidade_compra)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs por loja */}
      <Tabs defaultValue={lojas[0]?.id ?? 'todos'}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <TabsList className="flex-shrink-0">
            {lojas.map((op) => (
              <TabsTrigger key={op.id} value={op.id} className="text-xs">
                {op.codigo}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {lojas.map((op) => {
          const vendas = vendasPorOp[op.id] ?? []
          const estoque = estoquesPorOp[op.id] ?? { quantidade: 0, confiavel: false }
          const vendaSemanais = agruparPorSemana(vendas)
          const demanda = calcularDemanda(vendaSemanais, janelaUsuario)
          const nfsLoja = ultimasNfs.filter((n) => (n as Record<string, unknown>).operacao_id === op.id).slice(0, 3)

          return (
            <TabsContent key={op.id} value={op.id}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Coluna principal */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Métricas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Estoque atual</p>
                      <p className="text-xl font-bold mt-1">{formatNumber(estoque.quantidade)}</p>
                      <div className="mt-1">
                        {estoque.confiavel
                          ? <span className="flex items-center gap-1 text-xs text-green-600"><ShieldCheck className="h-3 w-3" />Confiável</span>
                          : <span className="flex items-center gap-1 text-xs text-yellow-600"><ShieldX className="h-3 w-3" />Não confiável</span>}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Demanda base/sem</p>
                      <p className="text-xl font-bold mt-1">{formatNumber(demanda.demandaBase, 1)}</p>
                      <p className="text-xs text-muted-foreground mt-1">CV: {formatNumber(demanda.coeficienteVariacao * 100, 1)}%</p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Cobertura atual</p>
                      <p className="text-xl font-bold mt-1">
                        {demanda.demandaBase > 0
                          ? formatNumber(estoque.quantidade / demanda.demandaBase, 1) + ' sem'
                          : '—'}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground">Sugestão</p>
                      <p className="text-xl font-bold mt-1 text-colibri-700">
                        {formatNumber(Math.ceil(Math.max(0, demanda.demandaBase * 4 - estoque.quantidade)))}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">unidades</p>
                    </Card>
                  </div>

                  {/* Gráfico */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Vendas — últimas {janelaUsuario + 4} semanas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SalesChart vendas={vendas} />
                    </CardContent>
                  </Card>
                </div>

                {/* Coluna lateral */}
                <div className="space-y-4">
                  {/* Últimas NFs */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Últimas entradas (NF)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {nfsLoja.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">Sem entradas registradas.</p>
                      ) : (
                        <div className="space-y-2">
                          {nfsLoja.map((nf, idx) => {
                            const n = nf as Record<string, unknown>
                            const forn = n.fornecedor as Record<string, unknown> | null
                            return (
                              <div key={idx} className="text-xs border rounded p-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{formatDate(String(n.data_entrada))}</span>
                                  <span className="font-medium">{formatNumber(Number(n.quantidade))} un</span>
                                </div>
                                {forn && <p className="text-muted-foreground truncate">{String(forn.razao_social)}</p>}
                                {!!n.custo && <p className="text-muted-foreground">{formatCurrency(Number(n.custo))}/un</p>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Análise IA */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Bot className="h-4 w-4 text-colibri-600" />
                        Análise IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {explicacaoIA ? (
                        <p className="text-xs text-muted-foreground leading-relaxed">{explicacaoIA}</p>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-3">
                            Gere uma explicação didática da sugestão com IA.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => gerarAnaliseIA(op.id, op.nome)}
                            disabled={loadingIA}
                            className="text-xs gap-1"
                          >
                            {loadingIA ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                            {loadingIA ? 'Gerando...' : 'Gerar análise IA'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}

function getDataInicio(semanas: number): string {
  const d = new Date()
  d.setDate(d.getDate() - semanas * 7)
  return d.toISOString().split('T')[0]
}
