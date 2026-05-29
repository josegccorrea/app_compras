'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatDatetime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import type { TemaImportacao } from '@/types/app'

const TEMAS: { value: TemaImportacao; label: string; descricao: string }[] = [
  { value: 'vendas', label: 'Vendas', descricao: 'Histórico de vendas por SKU, operação e data' },
  { value: 'estoque', label: 'Estoque', descricao: 'Saldo de estoque por SKU e operação' },
  { value: 'nf_entrada', label: 'NF de Entrada', descricao: 'Notas fiscais de entrada por SKU e operação' },
  { value: 'produtos', label: 'Cadastro de Produtos', descricao: 'Importação de novos produtos' },
  { value: 'fornecedores', label: 'Fornecedores', descricao: 'Importação de cadastro de fornecedores' },
  { value: 'classificacoes', label: 'Classificações', descricao: 'Família, departamento e seção dos SKUs' },
  { value: 'parametros', label: 'Parâmetros Operacionais', descricao: 'Cobertura alvo e lead times' },
]

const CAMPOS_POR_TEMA: Record<TemaImportacao, { campo: string; obrigatorio: boolean; descricao: string }[]> = {
  vendas: [
    { campo: 'codigo_interno', obrigatorio: true, descricao: 'Código interno do SKU' },
    { campo: 'operacao_codigo', obrigatorio: true, descricao: 'Código da operação/loja (ex: LAR, VIX)' },
    { campo: 'data', obrigatorio: true, descricao: 'Data da venda (YYYY-MM-DD)' },
    { campo: 'quantidade', obrigatorio: true, descricao: 'Quantidade vendida' },
    { campo: 'valor', obrigatorio: false, descricao: 'Valor de venda' },
    { campo: 'custo', obrigatorio: false, descricao: 'Custo de venda' },
  ],
  estoque: [
    { campo: 'codigo_interno', obrigatorio: true, descricao: 'Código interno do SKU' },
    { campo: 'operacao_codigo', obrigatorio: true, descricao: 'Código da operação/loja' },
    { campo: 'data', obrigatorio: true, descricao: 'Data de referência do estoque' },
    { campo: 'quantidade', obrigatorio: true, descricao: 'Saldo de estoque' },
  ],
  nf_entrada: [
    { campo: 'codigo_interno', obrigatorio: true, descricao: 'Código interno do SKU' },
    { campo: 'operacao_codigo', obrigatorio: true, descricao: 'Código da operação/loja' },
    { campo: 'data_entrada', obrigatorio: true, descricao: 'Data de entrada da NF' },
    { campo: 'quantidade', obrigatorio: true, descricao: 'Quantidade recebida' },
    { campo: 'custo', obrigatorio: false, descricao: 'Custo unitário' },
    { campo: 'numero_nf', obrigatorio: false, descricao: 'Número da NF' },
    { campo: 'cnpj_fornecedor', obrigatorio: false, descricao: 'CNPJ do fornecedor (para vínculo)' },
  ],
  produtos: [],
  fornecedores: [],
  classificacoes: [],
  parametros: [],
}

type Etapa = 'upload' | 'mapeamento' | 'prevalidacao' | 'importando' | 'resultado'

interface ImportacaoPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historico: any[]
}

export function ImportacaoPage({ historico }: ImportacaoPageProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [etapa, setEtapa] = useState<Etapa>('upload')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [tema, setTema] = useState<TemaImportacao | ''>('')
  const [colunasArquivo, setColunasArquivo] = useState<string[]>([])
  const [mapeamento, setMapeamento] = useState<Record<string, string>>({})
  const [resultado, setResultado] = useState<{ ok: boolean; totalLinhas: number; linhasValidas: number; linhasInvalidas: number; erros?: { linha: number; mensagem: string }[] } | null>(null)

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setArquivo(file)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
      if (rows.length > 0) {
        setColunasArquivo((rows[0] as string[]).map(String).filter(Boolean))
      }
    }
    reader.readAsBinaryString(file)
  }

  function avancarParaMapeamento() {
    if (!arquivo || !tema) { toast.error('Selecione um arquivo e o tema'); return }
    setEtapa('mapeamento')
    // Inicializa mapeamento vazio
    const campos = CAMPOS_POR_TEMA[tema] ?? []
    const map: Record<string, string> = {}
    colunasArquivo.forEach((col) => {
      // Tenta correspondência automática por nome
      const campo = campos.find((c) => c.campo.toLowerCase() === col.toLowerCase())
      if (campo) map[col] = campo.campo
      else map[col] = ''
    })
    setMapeamento(map)
  }

  async function iniciarImportacao() {
    if (!arquivo || !tema) return
    setEtapa('importando')

    // Cria registro de importação
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: importacao, error } = await supabase
      .from('importacoes')
      .insert({
        usuario_id: user.id,
        nome_arquivo: arquivo.name,
        tema: tema as TemaImportacao,
        status: 'pendente',
        mapeamento_colunas: mapeamento,
      })
      .select()
      .single()

    if (error || !importacao) { toast.error('Erro ao criar importação'); setEtapa('mapeamento'); return }

    const form = new FormData()
    form.append('file', arquivo)
    form.append('tema', tema)
    form.append('mapeamento', JSON.stringify(mapeamento))
    form.append('importacaoId', importacao.id)

    const res = await fetch('/api/import', { method: 'POST', body: form })
    const json = await res.json()

    setResultado(json)
    setEtapa('resultado')
  }

  function reiniciar() {
    setEtapa('upload')
    setArquivo(null)
    setTema('')
    setColunasArquivo([])
    setMapeamento({})
    setResultado(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const campos = tema ? (CAMPOS_POR_TEMA[tema as TemaImportacao] ?? []) : []

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold">Importação de Dados</h2>
        <p className="text-sm text-muted-foreground">Importe arquivos XLSX para vendas, estoque, NFs e cadastros.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        {(['upload', 'mapeamento', 'prevalidacao', 'importando', 'resultado'] as Etapa[]).map((e, i, arr) => (
          <div key={e} className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-0.5 rounded-full font-medium capitalize',
              etapa === e ? 'bg-colibri-600 text-white' :
              arr.indexOf(etapa) > i ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            )}>
              {e === 'upload' ? '1. Arquivo' : e === 'mapeamento' ? '2. Colunas' : e === 'prevalidacao' ? '3. Validar' : e === 'importando' ? '4. Importar' : '5. Resultado'}
            </span>
            {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Etapa 1: Upload */}
      {etapa === 'upload' && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Tema do arquivo *</Label>
              <Select value={tema} onValueChange={(v) => setTema(v as TemaImportacao)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o tipo de dado..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMAS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <p className="font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.descricao}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Arquivo XLSX *</Label>
              <div
                className="mt-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-colibri-400 hover:bg-colibri-50 transition-colors"
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleArquivoSelecionado} />
                {arquivo ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">{arquivo.name}</p>
                      <p className="text-xs text-muted-foreground">{colunasArquivo.length} colunas detectadas</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Clique para selecionar ou arraste o arquivo</p>
                    <p className="text-xs text-muted-foreground mt-1">Suporta .xlsx e .xls</p>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={avancarParaMapeamento}
              disabled={!arquivo || !tema}
              className="w-full bg-colibri-600 hover:bg-colibri-700"
            >
              Próximo: Mapear colunas
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Etapa 2: Mapeamento de colunas */}
      {etapa === 'mapeamento' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapeamento de colunas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Relacione cada coluna do arquivo com o campo correspondente no sistema.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground mb-2">
              <span>Coluna no arquivo</span>
              <span>Campo no sistema</span>
            </div>
            {colunasArquivo.map((col) => (
              <div key={col} className="grid grid-cols-2 gap-2 items-center">
                <div className="text-sm font-mono bg-muted px-2 py-1.5 rounded">{col}</div>
                <Select
                  value={mapeamento[col] ?? 'none'}
                  onValueChange={(v) => setMapeamento((prev) => ({ ...prev, [col]: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Ignorar coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ignorar esta coluna</SelectItem>
                    {campos.map((c) => (
                      <SelectItem key={c.campo} value={c.campo}>
                        {c.campo} {c.obrigatorio ? '*' : ''} — {c.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Campos obrigatórios não mapeados */}
            {(() => {
              const mapeados = Object.values(mapeamento).filter(Boolean)
              const faltando = campos.filter((c) => c.obrigatorio && !mapeados.includes(c.campo))
              return faltando.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Campos obrigatórios não mapeados: {faltando.map((c) => c.campo).join(', ')}
                  </AlertDescription>
                </Alert>
              ) : null
            })()}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEtapa('upload')}>Voltar</Button>
              <Button
                onClick={iniciarImportacao}
                className="flex-1 bg-colibri-600 hover:bg-colibri-700"
                disabled={campos.filter((c) => c.obrigatorio).some((c) => !Object.values(mapeamento).includes(c.campo))}
              >
                Importar dados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Etapa 3: Importando */}
      {etapa === 'importando' && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-colibri-600 border-t-transparent rounded-full mx-auto" />
            <p className="font-medium">Processando importação...</p>
            <p className="text-sm text-muted-foreground">Validando linhas e inserindo dados. Aguarde.</p>
          </CardContent>
        </Card>
      )}

      {/* Etapa 4: Resultado */}
      {etapa === 'resultado' && resultado && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className={cn('flex items-center gap-3 p-4 rounded-lg', resultado.ok ? 'bg-green-50' : 'bg-red-50')}>
              {resultado.ok
                ? <CheckCircle2 className="h-8 w-8 text-green-600" />
                : <XCircle className="h-8 w-8 text-red-600" />}
              <div>
                <p className="font-semibold">{resultado.ok ? 'Importação concluída!' : 'Importação falhou'}</p>
                <p className="text-sm text-muted-foreground">
                  {resultado.totalLinhas} linha(s) total · {resultado.linhasValidas} válidas · {resultado.linhasInvalidas} inválidas
                </p>
              </div>
            </div>

            {resultado.erros && resultado.erros.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {resultado.erros.map((e, i) => (
                  <div key={i} className="text-xs bg-red-50 border border-red-200 rounded px-3 py-1.5">
                    <span className="font-medium">Linha {e.linha}:</span> {e.mensagem}
                  </div>
                ))}
              </div>
            )}

            <Button onClick={reiniciar} className="w-full bg-colibri-600 hover:bg-colibri-700">
              Nova importação
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico de importações</CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma importação realizada.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{h.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.usuario?.full_name} · {formatDatetime(h.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{h.tema?.replace('_', ' ')}</Badge>
                    {h.status === 'sucesso' && <Badge variant="success">Sucesso</Badge>}
                    {h.status === 'falha' && <Badge variant="danger">Falha</Badge>}
                    {h.status === 'processando' && <Badge variant="info">Processando</Badge>}
                    {h.status === 'pendente' && <Badge variant="secondary">Pendente</Badge>}
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
