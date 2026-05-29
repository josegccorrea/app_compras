import { parse } from 'csv-parse/sync'
import { ItemCatalogo } from '@/types'
import { normalizarCodigo, parseBrNumber } from './utils'

function detectarSeparador(conteudo: string): string {
  const amostra = conteudo.slice(0, 2000)
  const semis = (amostra.match(/;/g) || []).length
  const commas = (amostra.match(/,/g) || []).length
  const tabs = (amostra.match(/\t/g) || []).length
  if (tabs > semis && tabs > commas) return '\t'
  if (semis >= commas) return ';'
  return ','
}

function normalizarNomeColuna(col: string): string {
  return col
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

export function carregarCatalogo(buffer: Buffer): Map<string, ItemCatalogo> {
  const conteudo = buffer.toString('utf-8').replace(/^\uFEFF/, '')
  const sep = detectarSeparador(conteudo)

  const rows: Record<string, string>[] = parse(conteudo, {
    delimiter: sep,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  })

  if (rows.length === 0) throw new Error('Catálogo vazio')

  // Normalize column names
  const amostra = rows[0]
  const colMap: Record<string, string> = {}
  for (const col of Object.keys(amostra)) {
    colMap[normalizarNomeColuna(col)] = col
  }

  const getCodCol = () =>
    colMap['cod_interno'] ||
    colMap['codigo'] ||
    colMap['cod'] ||
    colMap['sku'] ||
    Object.values(colMap)[0]

  const getLinha = () =>
    colMap['linha'] || colMap['descricao'] || colMap['produto'] || ''
  const getTamanho = () =>
    colMap['tamanho'] || colMap['tam'] || colMap['size'] || ''
  const getCor = () =>
    colMap['cor'] || colMap['color'] || colMap['variacao'] || ''
  const getMarca = () =>
    colMap['marca'] || colMap['brand'] || ''
  const getLote = () =>
    colMap['lote_minimo'] || colMap['lote'] || colMap['qtd_minima'] || ''

  const codCol = getCodCol()
  const linhaCol = getLinha()
  const tamanhoCol = getTamanho()
  const corCol = getCor()
  const marcaCol = getMarca()
  const loteCol = getLote()

  const catalogo = new Map<string, ItemCatalogo>()

  for (const row of rows) {
    const codigo = normalizarCodigo(row[codCol])
    if (!codigo || codigo === '0') continue

    const linha = linhaCol ? String(row[linhaCol] || '').trim() : ''
    const tamanho = tamanhoCol ? String(row[tamanhoCol] || '').trim() : ''
    const cor = corCol ? String(row[corCol] || '').trim() : ''
    const marca = marcaCol ? String(row[marcaCol] || '').trim() : ''
    const lote = loteCol ? Math.max(1, Math.round(parseBrNumber(row[loteCol]))) : 1

    const partes = [linha, tamanho ? `N${tamanho}` : '', cor].filter(Boolean)
    const descricao = partes.join(' ') || codigo

    catalogo.set(codigo, { codigo, descricao, linha, tamanho, cor, marca, lote_minimo: lote })
  }

  return catalogo
}
