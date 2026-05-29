'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bot, Plus, Search, Trash2 } from 'lucide-react'
import { formatNumber } from '@/lib/utils/format'
import { calcularDemanda, agruparPorSemana } from '@/lib/business/demand'
import type { Operacao } from '@/types/app'
import { toast } from 'sonner'

interface LinhaLote {
  id: string
  query: string
  produto: { id: string; codigo_interno: string; descricao: string } | null
  confirmado: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resultados: Record<string, any> | null
}

interface AnaliseLotePageProps {
  operacoes: Operacao[]
}

export function AnaliseLotePage({ operacoes }: AnaliseLotePageProps) {
  const supabase = createClient()
  const [linhas, setLinhas] = useState<LinhaLote[]>([{ id: '1', query: '', produto: null, confirmado: false, resultados: null }])
  const [janelaUsuario, setJanelaUsuario] = useState('8')
  const [analisando, setAnalisando] = useState(false)
  const [resumoIA, setResumoIA] = useState<string | null>(null)
  const lojas = operacoes.filter((o) => o.tipo === 'loja')

  function addLinha() {
    setLinhas((prev) => [...prev, { id: Date.now().toString(), query: '', produto: null, confirmado: false, resultados: null }])
  }

  function removeLinha(id: string) {
    setLinhas((prev) => prev.filter((l) => l.id !== id))
  }

  async function buscarProduto(id: string, query: string) {
    setLinhas((prev) => prev.map((l) => l.id === id ? { ...l, query, produto: null, confirmado: false } : l))
    if (query.length < 2) return
    const { data } = await supabase
      .from('produtos')
      .select('id, codigo_interno, descricao')
      .or(`codigo_interno.ilike.%${query}%,descricao.ilike.%${query}%`)
      .limit(5)
    if (data && data.length === 1) {
      setLinhas((prev) => prev.map((l) => l.id === id ? { ...l, produto: data[0], confirmado: false } : l))
    }
  }

  function confirmarSku(linhaId: string, produto: { id: string; codigo_interno: string; descricao: string }) {
    setLinhas((prev) => prev.map((l) => l.id === linhaId ? { ...l, produto, confirmado: true } : l))
  }

  async function analisarLote() {
    const confirmados = linhas.filter((l) => l.confirmado && l.produto)
    if (confirmados.length === 0) { toast.error('Confirme ao menos um SKU antes de analisar.'); return }

    setAnalisando(true)

    const resultados: Record<string, Record<string, unknown>> = {}

    for (const linha of confirmados) {
      if (!linha.produto) continue
      const janela = parseInt(janelaUsuario)
      const { data: vendas } = await supabase
        .from('vendas')
        .select('operacao_id, data, quantidade')
        .eq('produto_id', linha.produto.id)
        .gte('data', getDataInicio(janela + 4))

      const { data: estoques } = await supabase
        .from('estoques')
        .select('operacao_id, quantidade')
        .eq('produto_id', linha.produto.id)
        .order('data', { ascending: false })
        .limit(20)

      const porOp: Record<string, unknown> = {}
      for (const op of lojas) {
        const vOp = (vendas ?? []).filter((v: any) => v.operacao_id === op.id)
        const eOp = (estoques ?? []).find((e: any) => e.operacao_id === op.id)
        const vendaSemanais = agruparPorSemana(vOp.map((v: any) => ({ data: v.data, quantidade: v.quantidade })))
        const demanda = calcularDemanda(vendaSemanais, janela)
        const estoqueAtual = eOp?.quantidade ?? 0
        const sugestao = Math.ceil(Math.max(0, demanda.demandaBase * 4 - estoqueAtual))
        porOp[op.codigo] = {
          demandaBase: demanda.demandaBase,
          estoqueAtual,
          sugestao,
          coberturaAtual: demanda.demandaBase > 0 ? estoqueAtual / demanda.demandaBase : 0,
          riscoRuptura: demanda.demandaBase > 0 && (estoqueAtual / demanda.demandaBase) < 1,
        }
      }

      resultados[linha.id] = porOp
    }

    setLinhas((prev) => prev.map((l) => l.confirmado ? { ...l, resultados: resultados[l.id] ?? null } : l))

    // Resumo IA
    const dadosBatch = confirmados
      .filter((l) => resultados[l.id])
      .map((l) => {
        const totalSugestao = Object.values(resultados[l.id] ?? {}).reduce((sum: number, op) => sum + (op as Record<string, number>).sugestao, 0)
        const minCobertura = Math.min(...Object.values(resultados[l.id] ?? {}).map((op) => (op as Record<string, number>).coberturaAtual))
        const temRuptura = Object.values(resultados[l.id] ?? {}).some((op) => (op as Record<string, boolean>).riscoRuptura)
        return {
          sku: l.produto!.codigo_interno,
          descricao: l.produto!.descricao,
          sugestao: totalSugestao,
          riscoRuptura: temRuptura,
          coberturaAtual: minCobertura,
        }
      })

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'lote', dados: dadosBatch }),
      })
      const json = await res.json()
      setResumoIA(json.resumo)
    } catch {
      // IA é opcional
    }

    setAnalisando(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Análise em Lote</h2>
          <p className="text-sm text-muted-foreground">Adicione múltiplos SKUs e analise em paralelo.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={janelaUsuario} onValueChange={setJanelaUsuario}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 semanas</SelectItem>
              <SelectItem value="8">8 semanas</SelectItem>
              <SelectItem value="12">12 semanas</SelectItem>
              <SelectItem value="26">26 semanas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addLinha} variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Linha
          </Button>
          <Button
            onClick={analisarLote}
            disabled={analisando || !linhas.some((l) => l.confirmado)}
            className="bg-colibri-600 hover:bg-colibri-700 gap-2"
          >
            {analisando ? 'Analisando...' : 'Analisar lote'}
          </Button>
        </div>
      </div>

      {/* Linhas de SKU */}
      <div className="space-y-2">
        {linhas.map((linha, idx) => (
          <SkuLinha
            key={linha.id}
            linha={linha}
            numero={idx + 1}
            onQueryChange={(q) => buscarProduto(linha.id, q)}
            onConfirmar={(p) => confirmarSku(linha.id, p)}
            onRemover={() => removeLinha(linha.id)}
            lojas={lojas}
          />
        ))}
      </div>

      {/* Resumo IA */}
      {resumoIA && (
        <Card className="border-colibri-200 bg-colibri-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-colibri-600" /> Resumo executivo IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{resumoIA}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface SkuLinhaProps {
  linha: LinhaLote
  numero: number
  onQueryChange: (q: string) => void
  onConfirmar: (p: { id: string; codigo_interno: string; descricao: string }) => void
  onRemover: () => void
  lojas: Operacao[]
}

function SkuLinha({ linha, numero, onQueryChange, onConfirmar, onRemover, lojas }: SkuLinhaProps) {
  const supabase = createClient()
  const [sugestoes, setSugestoes] = useState<{ id: string; codigo_interno: string; descricao: string }[]>([])
  const [loadingBusca, setLoadingBusca] = useState(false)

  async function buscar(q: string) {
    onQueryChange(q)
    if (q.length < 2) { setSugestoes([]); return }
    setLoadingBusca(true)
    const { data } = await supabase
      .from('produtos')
      .select('id, codigo_interno, descricao')
      .or(`codigo_interno.ilike.%${q}%,descricao.ilike.%${q}%`)
      .limit(6)
    setSugestoes(data ?? [])
    setLoadingBusca(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{numero}.</span>
        <div className="flex-1 relative">
          {!linha.confirmado ? (
            <>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={linha.query}
                onChange={(e) => buscar(e.target.value)}
                placeholder="Código ou descrição do SKU..."
                className="pl-8 h-8 text-sm"
              />
              {sugestoes.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border rounded shadow-lg mt-1">
                  {sugestoes.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onConfirmar(s); setSugestoes([]) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                    >
                      <span className="font-mono text-xs">{s.codigo_interno}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate">{s.descricao}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-colibri-50 border border-colibri-200 rounded h-8">
              <span className="font-mono text-xs font-medium text-colibri-700">{linha.produto?.codigo_interno}</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-sm truncate">{linha.produto?.descricao}</span>
              <Badge variant="success" className="ml-auto text-xs py-0">Confirmado</Badge>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onRemover}>
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Resultados por loja */}
      {linha.resultados && (
        <div className="ml-7 overflow-x-auto">
          <table className="text-xs w-full border rounded">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 py-1">Loja</th>
                <th className="text-right px-2 py-1">Demanda/sem</th>
                <th className="text-right px-2 py-1">Estoque</th>
                <th className="text-right px-2 py-1">Cobertura</th>
                <th className="text-right px-2 py-1">Sugestão</th>
                <th className="px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {lojas.map((op) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const r = linha.resultados![op.codigo] as any
                if (!r) return null
                return (
                  <tr key={op.id} className="border-t">
                    <td className="px-2 py-1 font-medium">{op.codigo}</td>
                    <td className="text-right px-2 py-1">{formatNumber(r.demandaBase, 1)}</td>
                    <td className="text-right px-2 py-1">{formatNumber(r.estoqueAtual)}</td>
                    <td className="text-right px-2 py-1">{formatNumber(r.coberturaAtual, 1)} sem</td>
                    <td className="text-right px-2 py-1 font-bold text-colibri-700">{formatNumber(r.sugestao)}</td>
                    <td className="px-2 py-1">
                      {r.riscoRuptura && <Badge variant="danger" className="text-xs py-0">Ruptura</Badge>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function getDataInicio(semanas: number): string {
  const d = new Date()
  d.setDate(d.getDate() - semanas * 7)
  return d.toISOString().split('T')[0]
}
