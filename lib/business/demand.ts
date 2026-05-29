/**
 * Lógica central de cálculo de demanda ponderada
 * Fórmula: 50% × janela escolhida + 30% × últimas 4 semanas + 20% × últimas 2 semanas
 */

export interface VendaSemanal {
  semana: string // formato YYYY-WW
  quantidade: number
}

export interface ResultadoDemanda {
  mediaJanelaUsuario: number
  mediaUltimas4Semanas: number
  mediaUltimas2Semanas: number
  demandaBase: number        // demanda semanal estimada
  desvioPadrao: number
  coeficienteVariacao: number
  janelaEscolhida: number    // número de semanas da janela do usuário
}

/**
 * Calcula a média das últimas N semanas de uma série de vendas semanais.
 * Considera apenas as N semanas mais recentes disponíveis.
 */
export function mediaUltimas(vendas: VendaSemanal[], n: number): number {
  const sorted = [...vendas].sort((a, b) => b.semana.localeCompare(a.semana))
  const subset = sorted.slice(0, n)
  if (subset.length === 0) return 0
  const total = subset.reduce((sum, v) => sum + v.quantidade, 0)
  return total / subset.length
}

/**
 * Calcula o desvio padrão de uma lista de quantidades.
 */
export function desvioPadrao(vendas: VendaSemanal[]): number {
  if (vendas.length < 2) return 0
  const qtds = vendas.map((v) => v.quantidade)
  const media = qtds.reduce((a, b) => a + b, 0) / qtds.length
  const variancia = qtds.reduce((sum, q) => sum + Math.pow(q - media, 2), 0) / (qtds.length - 1)
  return Math.sqrt(variancia)
}

/**
 * Calcula a demanda base ponderada para um SKU.
 *
 * @param vendas        Histórico de vendas semanais (todas disponíveis)
 * @param janelaUsuario Número de semanas escolhido pelo usuário para análise
 */
export function calcularDemanda(
  vendas: VendaSemanal[],
  janelaUsuario: number
): ResultadoDemanda {
  const mediaJanela = mediaUltimas(vendas, janelaUsuario)
  const media4 = mediaUltimas(vendas, 4)
  const media2 = mediaUltimas(vendas, 2)

  const demandaBase = 0.5 * mediaJanela + 0.3 * media4 + 0.2 * media2

  const dp = desvioPadrao(vendas)
  const coeficienteVariacao = demandaBase > 0 ? dp / demandaBase : 0

  return {
    mediaJanelaUsuario: mediaJanela,
    mediaUltimas4Semanas: media4,
    mediaUltimas2Semanas: media2,
    demandaBase,
    desvioPadrao: dp,
    coeficienteVariacao,
    janelaEscolhida: janelaUsuario,
  }
}

/**
 * Converte array de vendas diárias em vendas semanais (ISO week).
 */
export function agruparPorSemana(
  vendas: { data: string; quantidade: number }[]
): VendaSemanal[] {
  const map = new Map<string, number>()

  for (const v of vendas) {
    const semana = getSemanaISO(new Date(v.data))
    map.set(semana, (map.get(semana) ?? 0) + v.quantidade)
  }

  return Array.from(map.entries()).map(([semana, quantidade]) => ({ semana, quantidade }))
}

/**
 * Retorna a semana ISO no formato YYYY-WW.
 */
function getSemanaISO(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`
}
