import { PRAZOS_PAGAMENTO_DIAS } from '@/lib/constants'

export function normalizarCodigo(s: string | number | null | undefined): string {
  if (s == null) return ''
  return String(s).trim().replace(/^0+/, '') || '0'
}

export function normalizarSemana(s: string | number, anoAtual: number): string {
  const str = String(s).trim()
  if (/^\d{4}-W\d{2}$/.test(str)) return str
  if (/^\d{1,2}$/.test(str)) return `${anoAtual}-W${str.padStart(2, '0')}`
  // Handle formats like "W14", "14/2026"
  const mW = str.match(/^W(\d{1,2})$/i)
  if (mW) return `${anoAtual}-W${mW[1].padStart(2, '0')}`
  return str
}

export function semAcento(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function arredondarLote(qtd: number, lote: number): number {
  if (lote <= 1) return Math.ceil(qtd)
  return Math.ceil(qtd / lote) * lote
}

export function calcularPrazosVencimento(diasList: number[]): string[] {
  const hoje = new Date()
  return diasList.map((dias) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + dias)
    return d.toLocaleDateString('pt-BR')
  })
}

export function getPrazosVencimento(): string[] {
  return calcularPrazosVencimento(PRAZOS_PAGAMENTO_DIAS)
}

export function parseBrNumber(s: string | number | null | undefined): number {
  if (s == null || s === '') return 0
  if (typeof s === 'number') return s
  const clean = String(s).trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

export function isoWeekNumber(semana: string): number {
  const m = semana.match(/(\d{4})-W(\d{2})/)
  if (!m) return 0
  return parseInt(m[2], 10)
}

export function isoWeekYear(semana: string): number {
  const m = semana.match(/(\d{4})-W(\d{2})/)
  if (!m) return 0
  return parseInt(m[1], 10)
}

export function sortSemanas(semanas: string[]): string[] {
  return [...semanas].sort((a, b) => {
    const ya = isoWeekYear(a), wa = isoWeekNumber(a)
    const yb = isoWeekYear(b), wb = isoWeekNumber(b)
    return ya !== yb ? ya - yb : wa - wb
  })
}
