'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SkuAnalyseCard } from './sku-analyse-card'
import { Search, X } from 'lucide-react'
import type { Operacao, Familia } from '@/types/app'

interface SkuSearchPageProps {
  fornecedores: { id: string; razao_social: string; nome_fantasia: string | null }[]
  familias: { id: string; nome: string }[]
  operacoes: Operacao[]
}

export function SkuSearchPage({ fornecedores, familias, operacoes }: SkuSearchPageProps) {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; codigo_interno: string; descricao: string; status: string }[]>([])
  const [selectedSku, setSelectedSku] = useState<{ id: string; codigo_interno: string; descricao: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [janelaUsuario, setJanelaUsuario] = useState('8')

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    const { data } = await supabase
      .from('produtos')
      .select('id, codigo_interno, descricao, status')
      .or(`codigo_interno.ilike.%${query}%,descricao.ilike.%${query}%`)
      .limit(20)
    setResults(data ?? [])
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Análise de SKU</h2>
        <p className="text-sm text-muted-foreground">Pesquise um SKU por código interno ou descrição.</p>
      </div>

      {/* Barra de busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Código interno ou descrição do produto..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="w-40">
              <Select value={janelaUsuario} onValueChange={setJanelaUsuario}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 semanas</SelectItem>
                  <SelectItem value="8">8 semanas</SelectItem>
                  <SelectItem value="12">12 semanas</SelectItem>
                  <SelectItem value="26">26 semanas</SelectItem>
                  <SelectItem value="52">52 semanas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={loading} className="bg-colibri-600 hover:bg-colibri-700">
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {/* Resultados da busca */}
          {results.length > 0 && !selectedSku && (
            <div className="mt-4 border rounded-md divide-y">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedSku(r)
                    setResults([])
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                >
                  <div>
                    <span className="font-mono text-sm font-medium">{r.codigo_interno}</span>
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="text-sm">{r.descricao}</span>
                  </div>
                  <Badge variant={r.status === 'ativo' ? 'success' : r.status === 'bloqueado' ? 'danger' : 'secondary'}>
                    {r.status}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query && !loading && !selectedSku && (
            <p className="text-sm text-muted-foreground mt-3 text-center py-2">
              Nenhum produto encontrado para &quot;{query}&quot;.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Análise do SKU selecionado */}
      {selectedSku && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">{selectedSku.codigo_interno}</span>
              <span className="text-muted-foreground">—</span>
              <span className="font-medium">{selectedSku.descricao}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedSku(null); setQuery('') }}
            >
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          </div>
          <SkuAnalyseCard
            produtoId={selectedSku.id}
            operacoes={operacoes}
            janelaUsuario={parseInt(janelaUsuario)}
          />
        </div>
      )}
    </div>
  )
}
