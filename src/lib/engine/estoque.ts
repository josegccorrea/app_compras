import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import { RegistroEstoque } from '@/types'
import { normalizarCodigo, parseBrNumber } from './utils'

function normalizarNomeColuna(col: string): string {
  return col
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

function parseEstoqueSheet(buffer: Buffer, nomeLoja: string): RegistroEstoque[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: false,
  })

  if (raw.length === 0) return []

  const amostra = raw[0]
  const colMap: Record<string, string> = {}
  for (const col of Object.keys(amostra)) {
    colMap[normalizarNomeColuna(col)] = col
  }

  const codCol =
    colMap['cod_'] || colMap['codigo'] || colMap['cod_interno'] ||
    colMap['sku'] || colMap['referencia'] || Object.values(colMap)[0]

  const qtdCol =
    colMap['estoque_atual'] || colMap['saldo'] || colMap['quantidade'] ||
    colMap['qtd'] || colMap['estoque'] || colMap['saldo_atual'] ||
    Object.values(colMap).find((c) => {
      const norm = normalizarNomeColuna(c)
      return norm.includes('saldo') || norm.includes('estoque') || norm.includes('qtd')
    }) || Object.values(colMap)[1]

  const barcodeCol =
    colMap['cod_barra'] || colMap['cod_barras'] || colMap['ean'] ||
    colMap['barcode'] || colMap['codigo_barras'] || ''

  const descCol =
    colMap['descricao'] || colMap['descricao_produto'] || colMap['nome'] ||
    colMap['produto'] || ''

  const result: RegistroEstoque[] = []

  for (const row of raw) {
    const codigo = normalizarCodigo(String(row[codCol] ?? ''))
    if (!codigo || codigo === '0') continue

    const quantidade = parseBrNumber(row[qtdCol] as string)
    const cod_barras = barcodeCol ? String(row[barcodeCol] ?? '').trim() : undefined
    const descricao_sistema = descCol ? String(row[descCol] ?? '').trim() : undefined

    result.push({
      loja: nomeLoja,
      codigo,
      quantidade,
      cod_barras: cod_barras || undefined,
      descricao_sistema: descricao_sistema || undefined,
    })
  }

  return result
}

export async function carregarEstoquesZip(
  zipBuffer: Buffer
): Promise<{ registros: RegistroEstoque[]; lojas: string[] }> {
  const zip = await JSZip.loadAsync(zipBuffer)
  const registros: RegistroEstoque[] = []
  const lojas: string[] = []

  for (const [filename, file] of Object.entries(zip.files)) {
    if (file.dir) continue
    if (!filename.match(/\.(xlsx|xls)$/i)) continue

    // Extract store name from filename (remove extension and path)
    const baseName = filename.split('/').pop() ?? filename
    const nomeLoja = baseName.replace(/\.(xlsx|xls)$/i, '').trim()

    const buffer = Buffer.from(await file.async('arraybuffer'))
    const items = parseEstoqueSheet(buffer, nomeLoja)

    registros.push(...items)
    if (!lojas.includes(nomeLoja)) lojas.push(nomeLoja)
  }

  return { registros, lojas }
}

export function carregarEstoqueCD(buffer: Buffer, nomeLoja = 'CD'): RegistroEstoque[] {
  return parseEstoqueSheet(buffer, nomeLoja)
}

export function criarMapaEstoque(
  registros: RegistroEstoque[]
): Map<string, Map<string, RegistroEstoque>> {
  // loja → codigo → registro
  const mapa = new Map<string, Map<string, RegistroEstoque>>()
  for (const r of registros) {
    if (!mapa.has(r.loja)) mapa.set(r.loja, new Map())
    mapa.get(r.loja)!.set(r.codigo, r)
  }
  return mapa
}
