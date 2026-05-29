import Anthropic from '@anthropic-ai/sdk'
import type { ResultadoDemanda } from '@/lib/business/demand'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface DadosSugestaoIA {
  skuCodigo: string
  skuDescricao: string
  janelaEscolhida: number
  demanda: ResultadoDemanda
  estoqueAtual: number
  estoqueConfiavel: boolean
  estoqueTeoricoInferido?: number
  coberturaAlvo: number
  coberturaAtual: number
  sugestaoQuantidade: number
  operacaoNome: string
  fornecedorNome?: string
  leadTimeDias: number
  riscoRuptura: boolean
  coberturaExcessiva: boolean
}

/**
 * Gera uma explicação didática da sugestão de compra usando Claude.
 */
export async function gerarExplicacaoSugestao(dados: DadosSugestaoIA): Promise<string> {
  const prompt = buildPrompt(dados)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  return textContent?.text ?? 'Não foi possível gerar a explicação.'
}

function buildPrompt(d: DadosSugestaoIA): string {
  const baseEstoque = d.estoqueConfiavel
    ? `Estoque atual (confiável): ${d.estoqueAtual} unidades`
    : `Estoque não confiável. Estoque teórico inferido por NF: ${d.estoqueTeoricoInferido ?? '—'} unidades`

  const risco = [
    d.riscoRuptura ? '⚠️ RISCO DE RUPTURA detectado' : null,
    d.coberturaExcessiva ? '⚠️ Cobertura EXCESSIVA detectada' : null,
  ]
    .filter(Boolean)
    .join(' | ')

  return `Você é um assistente especializado em gestão de compras e reposição de estoque.

Gere uma explicação didática e direta (máximo 5 parágrafos curtos, em português) para o comprador entender como a sugestão de compra foi calculada.

Use linguagem simples, sem jargões técnicos excessivos. Explique o raciocínio de forma que qualquer comprador possa entender.

--- DADOS DA SUGESTÃO ---
SKU: ${d.skuCodigo} — ${d.skuDescricao}
Operação/Loja: ${d.operacaoNome}
Fornecedor padrão: ${d.fornecedorNome ?? 'não definido'}
Lead time do fornecedor: ${d.leadTimeDias} dias

VENDAS ANALISADAS:
- Janela escolhida pelo comprador: ${d.janelaEscolhida} semanas → média ${d.demanda.mediaJanelaUsuario.toFixed(2)} un/semana
- Últimas 4 semanas: média ${d.demanda.mediaUltimas4Semanas.toFixed(2)} un/semana
- Últimas 2 semanas: média ${d.demanda.mediaUltimas2Semanas.toFixed(2)} un/semana
- Demanda base calculada (50%/30%/20%): ${d.demanda.demandaBase.toFixed(2)} un/semana
- Desvio padrão: ${d.demanda.desvioPadrao.toFixed(2)} (variabilidade ${d.demanda.coeficienteVariacao > 0.3 ? 'ALTA' : d.demanda.coeficienteVariacao > 0.15 ? 'MÉDIA' : 'BAIXA'})

ESTOQUE E COBERTURA:
${baseEstoque}
Cobertura atual: ${d.coberturaAtual.toFixed(1)} semanas
Cobertura alvo: ${d.coberturaAlvo} semanas

RESULTADO:
Sugestão de compra: ${d.sugestaoQuantidade} unidades
${risco ? `\nALERTAS: ${risco}` : ''}

Explique:
1. Por que essa quantidade foi sugerida
2. O que o desvio padrão indica sobre a confiabilidade da sugestão
3. Se há algum alerta importante que o comprador deve considerar
4. Uma dica prática baseada nos dados apresentados`
}

/**
 * Gera análise em lote para múltiplos SKUs.
 * Retorna um resumo executivo dos itens mais críticos.
 */
export async function gerarResumoBatch(
  itens: { sku: string; descricao: string; sugestao: number; riscoRuptura: boolean; coberturaAtual: number }[]
): Promise<string> {
  const itensCriticos = itens.filter((i) => i.riscoRuptura)
  const totalSugestao = itens.reduce((sum, i) => sum + i.sugestao, 0)

  const prompt = `Você é um assistente de gestão de compras. Gere um resumo executivo CURTO (máximo 3 parágrafos) em português para o comprador sobre este lote de análise.

LOTE ANALISADO:
- Total de SKUs: ${itens.length}
- SKUs com risco de ruptura: ${itensCriticos.length}
- Total sugerido (todas as lojas): ${totalSugestao} unidades
- SKUs mais críticos: ${itensCriticos
    .slice(0, 5)
    .map((i) => `${i.sku} (${i.descricao}) — cobertura ${i.coberturaAtual.toFixed(1)} sem.`)
    .join(', ')}

Destaque os itens prioritários, o que o comprador deve focar primeiro e se há algo incomum no padrão deste lote.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  return textContent?.text ?? 'Não foi possível gerar o resumo.'
}
