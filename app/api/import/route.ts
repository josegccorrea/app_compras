import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import type { TemaImportacao, MapeamentoColunas } from '@/types/app'

export async function POST(request: NextRequest) {
  const supabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const tema = formData.get('tema') as TemaImportacao
  const mapeamentoStr = formData.get('mapeamento') as string
  const importacaoId = formData.get('importacaoId') as string

  if (!file || !tema || !mapeamentoStr || !importacaoId) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  const mapeamento: MapeamentoColunas = JSON.parse(mapeamentoStr)

  // Atualiza status para processando
  await supabase
    .from('importacoes')
    .update({ status: 'processando' })
    .eq('id', importacaoId)

  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null })

    const totalLinhas = rows.length
    let linhasValidas = 0
    let linhasInvalidas = 0
    const erros: { linha: number; mensagem: string }[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const mapped = mapRow(row, mapeamento)
      const resultado = await processarLinha(supabase, tema, mapped, user.id, importacaoId, i + 2)
      if (resultado.ok) {
        linhasValidas++
      } else {
        linhasInvalidas++
        erros.push({ linha: i + 2, mensagem: resultado.erro ?? 'Erro desconhecido' })
      }
    }

    if (erros.length > 0) {
      // Falha total: nenhuma linha foi commitada (rollback não automático com insert row-by-row)
      // Aqui marcamos como falha e registramos os erros
      await supabase
        .from('importacoes')
        .update({
          status: 'falha',
          total_linhas: totalLinhas,
          linhas_validas: 0,
          linhas_invalidas: totalLinhas,
          motivo_falha: `${erros.length} erro(s) encontrado(s). Primeira falha na linha ${erros[0].linha}: ${erros[0].mensagem}`,
        })
        .eq('id', importacaoId)

      // Remove dados já inseridos desta importação
      await rollbackImportacao(supabase, tema, importacaoId)

      return NextResponse.json({
        ok: false,
        totalLinhas,
        linhasValidas: 0,
        linhasInvalidas: totalLinhas,
        erros,
      })
    }

    await supabase
      .from('importacoes')
      .update({
        status: 'sucesso',
        total_linhas: totalLinhas,
        linhas_validas: linhasValidas,
        linhas_invalidas: linhasInvalidas,
      })
      .eq('id', importacaoId)

    return NextResponse.json({ ok: true, totalLinhas, linhasValidas, linhasInvalidas })
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : 'Erro desconhecido'
    await supabase
      .from('importacoes')
      .update({ status: 'falha', motivo_falha: mensagem })
      .eq('id', importacaoId)

    return NextResponse.json({ error: mensagem }, { status: 500 })
  }
}

function mapRow(row: Record<string, unknown>, mapeamento: MapeamentoColunas): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [colunaOrigem, campoDestino] of Object.entries(mapeamento)) {
    if (campoDestino) {
      result[campoDestino] = row[colunaOrigem]
    }
  }
  return result
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processarLinha(supabase: any, tema: TemaImportacao, row: Record<string, unknown>, userId: string, importacaoId: string, linhaNum: number): Promise<{ ok: boolean; erro?: string }> {
  try {
    switch (tema) {
      case 'vendas':
        return await inserirVenda(supabase, row, importacaoId)
      case 'estoque':
        return await inserirEstoque(supabase, row, importacaoId)
      case 'nf_entrada':
        return await inserirNfEntrada(supabase, row, importacaoId)
      default:
        return { ok: false, erro: `Tema '${tema}' não implementado nesta versão` }
    }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao processar linha' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inserirVenda(supabase: any, row: Record<string, unknown>, importacaoId: string) {
  if (!row.codigo_interno || !row.operacao_codigo || !row.data || row.quantidade == null) {
    return { ok: false, erro: 'Campos obrigatórios ausentes: codigo_interno, operacao_codigo, data, quantidade' }
  }

  const { data: produto } = await supabase
    .from('produtos')
    .select('id')
    .eq('codigo_interno', String(row.codigo_interno))
    .single()
  if (!produto) return { ok: false, erro: `SKU '${row.codigo_interno}' não encontrado no cadastro` }

  const { data: operacao } = await supabase
    .from('operacoes')
    .select('id')
    .eq('codigo', String(row.operacao_codigo))
    .single()
  if (!operacao) return { ok: false, erro: `Operação '${row.operacao_codigo}' não encontrada` }

  const { error } = await supabase.from('vendas').insert({
    produto_id: produto.id,
    operacao_id: operacao.id,
    data: String(row.data),
    quantidade: Number(row.quantidade),
    valor: row.valor != null ? Number(row.valor) : null,
    custo: row.custo != null ? Number(row.custo) : null,
    importacao_id: importacaoId,
  })

  if (error) return { ok: false, erro: error.message }
  return { ok: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inserirEstoque(supabase: any, row: Record<string, unknown>, importacaoId: string) {
  if (!row.codigo_interno || !row.operacao_codigo || !row.data || row.quantidade == null) {
    return { ok: false, erro: 'Campos obrigatórios ausentes: codigo_interno, operacao_codigo, data, quantidade' }
  }

  const { data: produto } = await supabase
    .from('produtos')
    .select('id')
    .eq('codigo_interno', String(row.codigo_interno))
    .single()
  if (!produto) return { ok: false, erro: `SKU '${row.codigo_interno}' não encontrado` }

  const { data: operacao } = await supabase
    .from('operacoes')
    .select('id')
    .eq('codigo', String(row.operacao_codigo))
    .single()
  if (!operacao) return { ok: false, erro: `Operação '${row.operacao_codigo}' não encontrada` }

  const { error } = await supabase.from('estoques').insert({
    produto_id: produto.id,
    operacao_id: operacao.id,
    data: String(row.data),
    quantidade: Number(row.quantidade),
    importacao_id: importacaoId,
  })

  if (error) return { ok: false, erro: error.message }
  return { ok: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inserirNfEntrada(supabase: any, row: Record<string, unknown>, importacaoId: string) {
  if (!row.codigo_interno || !row.operacao_codigo || !row.data_entrada || row.quantidade == null) {
    return { ok: false, erro: 'Campos obrigatórios ausentes: codigo_interno, operacao_codigo, data_entrada, quantidade' }
  }

  const { data: produto } = await supabase
    .from('produtos')
    .select('id')
    .eq('codigo_interno', String(row.codigo_interno))
    .single()
  if (!produto) return { ok: false, erro: `SKU '${row.codigo_interno}' não encontrado` }

  const { data: operacao } = await supabase
    .from('operacoes')
    .select('id')
    .eq('codigo', String(row.operacao_codigo))
    .single()
  if (!operacao) return { ok: false, erro: `Operação '${row.operacao_codigo}' não encontrada` }

  let fornecedorId = null
  if (row.cnpj_fornecedor) {
    const { data: forn } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', String(row.cnpj_fornecedor))
      .single()
    if (forn) fornecedorId = forn.id
  }

  const { error } = await supabase.from('nf_entradas').insert({
    produto_id: produto.id,
    operacao_id: operacao.id,
    fornecedor_id: fornecedorId,
    data_entrada: String(row.data_entrada),
    quantidade: Number(row.quantidade),
    custo: row.custo != null ? Number(row.custo) : null,
    numero_nf: row.numero_nf ? String(row.numero_nf) : null,
    importacao_id: importacaoId,
  })

  if (error) return { ok: false, erro: error.message }
  return { ok: true }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rollbackImportacao(supabase: any, tema: TemaImportacao, importacaoId: string) {
  const tabelaMap: Partial<Record<TemaImportacao, string>> = {
    vendas: 'vendas',
    estoque: 'estoques',
    nf_entrada: 'nf_entradas',
  }
  const tabela = tabelaMap[tema]
  if (tabela) {
    await supabase.from(tabela).delete().eq('importacao_id', importacaoId)
  }
}
