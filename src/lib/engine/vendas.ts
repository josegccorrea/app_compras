import * as XLSX from 'xlsx'
import { RegistroVenda } from '@/types'
import { normalizarCodigo, normalizarSemana, semAcento, parseBrNumber } from './utils'

function normalizarNomeColuna(col: string): string {
  return col
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
}

export function carregarVendas(buffer: Buffer): {
  registros: RegistroVenda[]
  lojas: string[]
  semanas: string[]
} {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: false,
  })

  if (raw.length === 0) throw new Error('Arquivo de vendas vazio')

  const amostra = raw[0]
  const colMap: Record<string, string> = {}
  for (const col of Object.keys(amostra)) {
    colMap[normalizarNomeColuna(col)] = col
  }

  // Detect columns
  const codCol =
    colMap['codigo'] || colMap['cod_interno'] || colMap['sku'] ||
    colMap['cod_produto'] || colMap['produto'] || Object.values(colMap)[0]

  const lojaCol =
    colMap['loja'] || colMap['filial'] || colMap['estabelecimento'] ||
    colMap['nome_loja'] || Object.values(colMap)[1]

  const semanaCol =
    colMap['no_semana'] || colMap['semana'] || colMap['semana_iso'] ||
    colMap['nr_semana'] || colMap['week'] || Object.values(colMap)[2]

  const qtdCol =
    colMap['quantidade'] || colMap['qtd'] || colMap['vendas'] ||
    colMap['total_vendido'] || Object.values(colMap)[3]

  const anoAtual = new Date().getFullYear()
  const registros: RegistroVenda[] = []
  const lojasSet = new Set<string>()
  const semanasSet = new Set<string>()

  for (const row of raw) {
    const codigo = normalizarCodigo(String(row[codCol] ?? ''))
    if (!codigo || codigo === '0') continue

    const loja = String(row[lojaCol] ?? '').trim()
    if (!loja) continue

    const semanaRaw = String(row[semanaCol] ?? '').trim()
    if (!semanaRaw) continue

    const semana_iso = normalizarSemana(semanaRaw, anoAtual)
    const quantidade = parseBrNumber(row[qtdCol] as string)
    if (quantidade <= 0) continue

    registros.push({ semana_iso, loja, codigo, quantidade })
    lojasSet.add(loja)
    semanasSet.add(semana_iso)
  }

  return {
    registros,
    lojas: Array.from(lojasSet).sort(),
    semanas: Array.from(semanasSet).sort(),
  }
}

export function agruparVendasPorLojaCodigo(
  registros: RegistroVenda[]
): Map<string, Map<string, Map<string, number>>> {
  // loja → codigo → semana → quantidade
  const mapa = new Map<string, Map<string, Map<string, number>>>()

  for (const r of registros) {
    if (!mapa.has(r.loja)) mapa.set(r.loja, new Map())
    const porCodigo = mapa.get(r.loja)!
    if (!porCodigo.has(r.codigo)) porCodigo.set(r.codigo, new Map())
    const porSemana = porCodigo.get(r.codigo)!
    porSemana.set(r.semana_iso, (porSemana.get(r.semana_iso) ?? 0) + r.quantidade)
  }

  return mapa
}

export function matchLoja(lojaTarget: string, lojasDisponiveis: string[]): string {
  const alvo = semAcento(lojaTarget)
  return lojasDisponiveis.find((l) => semAcento(l) === alvo) ?? lojaTarget
}
