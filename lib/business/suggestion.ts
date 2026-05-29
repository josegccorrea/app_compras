/**
 * Lógica de sugestão de compra e transferência CD→Lojas
 */

import { calcularDemanda, agruparPorSemana, type ResultadoDemanda } from './demand'
import type {
  SugestaoItemLoja,
  SugestaoCompra,
  SugestaoTransferencia,
  Alerta,
  TipoAlerta,
} from '@/types/app'

export interface EntradaCalculoLoja {
  operacaoId: string
  operacaoNome: string
  operacaoCodigo: string
  vendas: { data: string; quantidade: number }[]
  estoqueAtual: number
  estoqueConfiavel: boolean
  ultimasEntradas: { data: string; quantidade: number }[]
  coberturaAlvoSemanas: number
  coberturaMinimaSemanas: number
  leadTimeEntregaDias: number
}

export interface ResultadoSugestaoLoja {
  operacaoId: string
  estoqueAtual: number
  estoqueConfiavel: boolean
  estoqueTeoricoInferido?: number
  demanda: ResultadoDemanda
  coberturaAtual: number
  coberturaAlvo: number
  necessidadeBruta: number
  sugestaoQuantidade: number
  riscoRuptura: boolean
  coberturaExcessiva: boolean
  baseInferida: boolean
}

/**
 * Calcula estoque teórico inferido quando não há estoque confiável.
 * Fórmula: últimas entradas − vendas realizadas desde a entrada mais recente
 */
export function calcularEstoqueTeoricoInferido(
  ultimasEntradas: { data: string; quantidade: number }[],
  vendas: { data: string; quantidade: number }[]
): number {
  if (ultimasEntradas.length === 0) return 0

  const entradaOrdenada = [...ultimasEntradas].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  )

  // Usa a data da última entrada como ponto de corte
  const dataUltimaEntrada = entradaOrdenada[0].data
  const totalEntradas = entradaOrdenada
    .slice(0, 3) // últimas 3 entradas
    .reduce((sum, e) => sum + e.quantidade, 0)

  const vendasDesdeEntrada = vendas
    .filter((v) => v.data >= dataUltimaEntrada)
    .reduce((sum, v) => sum + v.quantidade, 0)

  return Math.max(0, totalEntradas - vendasDesdeEntrada)
}

/**
 * Calcula sugestão de compra para uma loja/operação.
 */
export function calcularSugestaoLoja(
  entrada: EntradaCalculoLoja,
  janelaUsuario: number
): ResultadoSugestaoLoja {
  const vendaSemanais = agruparPorSemana(entrada.vendas)
  const demanda = calcularDemanda(vendaSemanais, janelaUsuario)

  let estoqueBase: number
  let estoqueTeoricoInferido: number | undefined
  let baseInferida = false

  if (entrada.estoqueConfiavel) {
    estoqueBase = entrada.estoqueAtual
  } else {
    estoqueTeoricoInferido = calcularEstoqueTeoricoInferido(
      entrada.ultimasEntradas,
      entrada.vendas
    )
    estoqueBase = estoqueTeoricoInferido
    baseInferida = true
  }

  const coberturaAlvo = entrada.coberturaAlvoSemanas
  const coberturaMinima = entrada.coberturaMinimaSemanas
  const leadTimeEmSemanas = entrada.leadTimeEntregaDias / 7

  const necessidadeBruta = demanda.demandaBase * coberturaAlvo
  const sugestaoRaw = Math.max(0, necessidadeBruta - estoqueBase)
  const sugestaoQuantidade = Math.ceil(sugestaoRaw)

  // Cobertura atual em semanas
  const coberturaAtual =
    demanda.demandaBase > 0 ? estoqueBase / demanda.demandaBase : 0

  // Risco de ruptura: cobertura atual < lead time + cobertura mínima
  const riscoRuptura = coberturaAtual < leadTimeEmSemanas + coberturaMinima

  // Cobertura excessiva: cobertura atual > cobertura alvo
  const coberturaExcessiva = coberturaAtual > coberturaAlvo * 1.5

  return {
    operacaoId: entrada.operacaoId,
    estoqueAtual: entrada.estoqueAtual,
    estoqueConfiavel: entrada.estoqueConfiavel,
    estoqueTeoricoInferido,
    demanda,
    coberturaAtual,
    coberturaAlvo,
    necessidadeBruta,
    sugestaoQuantidade,
    riscoRuptura,
    coberturaExcessiva,
    baseInferida,
  }
}

/**
 * Gera alertas para um SKU/loja com base no resultado da análise.
 */
export function gerarAlertas(
  resultado: ResultadoSugestaoLoja,
  temFornecedorPadrao: boolean,
  temClassificacao: boolean
): Alerta[] {
  const alertas: Alerta[] = []

  if (resultado.riscoRuptura) {
    alertas.push({
      tipo: 'ruptura',
      severidade: 'critico',
      mensagem: `Risco de ruptura! Cobertura atual de ${resultado.coberturaAtual.toFixed(1)} semanas está abaixo do mínimo necessário.`,
      operacaoId: resultado.operacaoId,
    })
  }

  if (resultado.coberturaExcessiva) {
    alertas.push({
      tipo: 'cobertura_alta',
      severidade: 'atencao',
      mensagem: `Cobertura excessiva: ${resultado.coberturaAtual.toFixed(1)} semanas (alvo: ${resultado.coberturaAlvo} semanas).`,
      operacaoId: resultado.operacaoId,
    })
  }

  if (!resultado.estoqueConfiavel) {
    alertas.push({
      tipo: 'estoque_nao_confiavel',
      severidade: 'atencao',
      mensagem: 'Estoque não confiável. Sugestão baseada em inferência operacional por NF de entrada.',
      operacaoId: resultado.operacaoId,
    })
  }

  if (resultado.demanda.demandaBase === 0) {
    alertas.push({
      tipo: 'sem_giro',
      severidade: 'atencao',
      mensagem: 'SKU sem giro no período analisado.',
      operacaoId: resultado.operacaoId,
    })
  }

  if (!temFornecedorPadrao) {
    alertas.push({
      tipo: 'sem_fornecedor_padrao',
      severidade: 'atencao',
      mensagem: 'SKU sem fornecedor padrão definido.',
    })
  }

  if (!temClassificacao) {
    alertas.push({
      tipo: 'sem_classificacao',
      severidade: 'info',
      mensagem: 'SKU sem classificação completa.',
    })
  }

  return alertas
}

/**
 * Calcula sugestão de transferência do CD para as lojas.
 * Priorização: maior risco de ruptura > maior venda > menor cobertura
 */
export interface EntradaTransferencia {
  operacaoId: string
  necessidade: number
  vendaMedia: number
  coberturaAtual: number
  riscoRuptura: boolean
}

export function calcularTransferenciaCD(
  estoqueCD: number,
  lojas: EntradaTransferencia[]
): {
  alocacoes: { operacaoId: string; quantidade: number; ordemPrioridade: number }[]
  totalAlocado: number
  transferenciaParcial: boolean
  saldoCDRestante: number
} {
  // Ordena por prioridade: ruptura primeiro, depois maior venda, depois menor cobertura
  const sorted = [...lojas].sort((a, b) => {
    if (a.riscoRuptura !== b.riscoRuptura) return a.riscoRuptura ? -1 : 1
    if (b.vendaMedia !== a.vendaMedia) return b.vendaMedia - a.vendaMedia
    return a.coberturaAtual - b.coberturaAtual
  })

  let saldoCD = estoqueCD
  let totalNecessidade = sorted.reduce((sum, l) => sum + l.necessidade, 0)
  const alocacoes: { operacaoId: string; quantidade: number; ordemPrioridade: number }[] = []

  for (let i = 0; i < sorted.length; i++) {
    const loja = sorted[i]
    const quantidade = Math.min(loja.necessidade, saldoCD)
    alocacoes.push({ operacaoId: loja.operacaoId, quantidade, ordemPrioridade: i + 1 })
    saldoCD -= quantidade
    if (saldoCD <= 0) break
  }

  // Lojas que não receberam alocação
  for (const loja of sorted) {
    if (!alocacoes.find((a) => a.operacaoId === loja.operacaoId)) {
      alocacoes.push({ operacaoId: loja.operacaoId, quantidade: 0, ordemPrioridade: sorted.length })
    }
  }

  const totalAlocado = alocacoes.reduce((sum, a) => sum + a.quantidade, 0)
  const transferenciaParcial = totalAlocado < totalNecessidade

  return {
    alocacoes,
    totalAlocado,
    transferenciaParcial,
    saldoCDRestante: saldoCD,
  }
}
