import {
  ItemCatalogo,
  RegistroEstoque,
  RegistroVenda,
  Sugestao,
  CompraCD,
  SemGiroCD,
  LojaResultado,
  ResumoLoja,
  ResumoGeral,
  VendasSemanais,
  ResultadoProcessamento,
  UploadMeta,
} from '@/types'
import {
  LEAD_TIME_CD_LOJA,
  LEAD_TIME_INDUSTRIA_CD,
  FATOR_SEGURANCA,
  ESTOQUE_MINIMO_LOJA,
  DIAS_COBERTURA_LOJA,
  DIAS_COBERTURA_CD,
  N_SEMANAS_BASE,
  PESOS_DEMANDA,
} from '@/lib/constants'
import {
  arredondarLote,
  getPrazosVencimento,
  sortSemanas,
} from './utils'
import { agruparVendasPorLojaCodigo, matchLoja } from './vendas'

interface ProcessarOptions {
  diasCoberturaLoja?: number
  diasCoberturaCD?: number
  nSemanas?: number
}

function calcularDemandaPonderada(
  vendas: Map<string, number>,
  semanas: string[],
  nBase: number
): number {
  if (semanas.length === 0) return 0

  const ultimas = semanas.slice(-nBase)
  const ult4 = semanas.slice(-4)
  const ult2 = semanas.slice(-2)

  const media = (sems: string[]) => {
    if (sems.length === 0) return 0
    const total = sems.reduce((s, sem) => s + (vendas.get(sem) ?? 0), 0)
    return total / sems.length
  }

  return (
    PESOS_DEMANDA.base * media(ultimas) +
    PESOS_DEMANDA.ultimas4 * media(ult4) +
    PESOS_DEMANDA.ultimas2 * media(ult2)
  )
}

function classificarStatus(
  coberturaDias: number | null,
  diasAlvo: number
): 'CRITICO' | 'ALERTA' | 'OK' | 'EXCESSO' {
  if (coberturaDias === null) return 'EXCESSO'
  if (coberturaDias < LEAD_TIME_CD_LOJA) return 'CRITICO'
  if (coberturaDias < diasAlvo) return 'ALERTA'
  if (coberturaDias <= diasAlvo * 1.5) return 'OK'
  return 'EXCESSO'
}

export function processar(
  catalogo: Map<string, ItemCatalogo>,
  vendasRegistros: RegistroVenda[],
  estoquesLojas: RegistroEstoque[],
  estoqueCD: RegistroEstoque[],
  lojasNomes: string[],
  options: ProcessarOptions = {}
): ResultadoProcessamento {
  const diasAlvo = options.diasCoberturaLoja ?? DIAS_COBERTURA_LOJA
  const diasAlvoCD = options.diasCoberturaCD ?? DIAS_COBERTURA_CD
  const nSemanas = options.nSemanas ?? N_SEMANAS_BASE

  const prazos = getPrazosVencimento()

  // Build sorted semanas list
  const todasSemanas = sortSemanas(
    Array.from(new Set(vendasRegistros.map((v) => v.semana_iso)))
  )
  const semanaRecente = todasSemanas[todasSemanas.length - 1] ?? ''

  // Aggregate vendas: loja → codigo → semana → qty
  const vendasAgrupadas = agruparVendasPorLojaCodigo(vendasRegistros)

  // CD stock map: codigo → registro
  const mapaCD = new Map<string, RegistroEstoque>()
  for (const r of estoqueCD) {
    mapaCD.set(r.codigo, r)
  }
  const estoqueCDDisp = new Map<string, number>()
  for (const [cod, r] of Array.from(mapaCD.entries())) {
    estoqueCDDisp.set(cod, r.quantidade)
  }

  // Lojas stock map: loja → codigo → registro
  const mapaLojas = new Map<string, Map<string, RegistroEstoque>>()
  for (const r of estoquesLojas) {
    if (!mapaLojas.has(r.loja)) mapaLojas.set(r.loja, new Map())
    mapaLojas.get(r.loja)!.set(r.codigo, r)
  }

  // Get all lojas from vendas
  const lojasVendas = Array.from(vendasAgrupadas.keys())

  // Map loja names (accent-insensitive)
  const lojasParaProcessar = lojasNomes.length > 0
    ? lojasNomes
    : lojasVendas

  const lojas: Record<string, LojaResultado> = {}
  const resumoGeral: ResumoGeral = {
    total_criticos: 0,
    total_alertas: 0,
    total_compras_cd: 0,
    lojas: {},
  }

  for (const loja of lojasParaProcessar) {
    const lojaVendasKey = matchLoja(loja, lojasVendas)
    const vendas_loja = vendasAgrupadas.get(lojaVendasKey) ?? new Map()
    const estoque_loja = mapaLojas.get(loja) ?? new Map()

    // Union: all codigo in catalogo that have sales OR stock in this loja
    const codigosLoja = new Set<string>([
      ...Array.from(vendas_loja.keys()).filter((c) => catalogo.has(c)),
      ...Array.from(estoque_loja.keys()).filter((c) => catalogo.has(c)),
    ])

    const itens: Sugestao[] = []

    for (const cod of Array.from(codigosLoja)) {
      const cat = catalogo.get(cod)!
      const estoqueReg = estoque_loja.get(cod)
      const est_atual = estoqueReg?.quantidade ?? 0
      const cod_barras = estoqueReg?.cod_barras ?? ''

      const vendasCod = vendas_loja.get(cod) ?? new Map<string, number>()
      const dem_semanal = calcularDemandaPonderada(vendasCod, todasSemanas, nSemanas)
      const dem_diaria = dem_semanal / 7

      const cobertura_dias: number | null =
        dem_diaria > 0 ? est_atual / dem_diaria : null

      const status = classificarStatus(cobertura_dias, diasAlvo)

      let qtd_sugerida = 0
      if (status === 'CRITICO' || status === 'ALERTA') {
        const necessidade =
          (diasAlvo + LEAD_TIME_CD_LOJA) * dem_diaria - est_atual
        qtd_sugerida = arredondarLote(Math.max(0, necessidade), cat.lote_minimo)
      }

      // Minimum stock rule
      let por_minimo = false
      if (est_atual < ESTOQUE_MINIMO_LOJA) {
        const qtd_minima = ESTOQUE_MINIMO_LOJA - est_atual
        if (qtd_sugerida < qtd_minima) {
          qtd_sugerida = Math.ceil(qtd_minima)
          por_minimo = true
        }
      }

      const est_cd = estoqueCDDisp.get(cod) ?? 0
      const qtd_a_enviar = Math.min(qtd_sugerida, est_cd)
      if (qtd_a_enviar > 0) {
        estoqueCDDisp.set(cod, est_cd - qtd_a_enviar)
      }

      itens.push({
        id: '',
        upload_id: '',
        loja,
        codigo: cod,
        cod_barras,
        descricao: cat.descricao,
        linha: cat.linha,
        tamanho: cat.tamanho,
        cor: cat.cor,
        estoque_atual: est_atual,
        demanda_semanal: Math.round(dem_semanal * 100) / 100,
        demanda_diaria: Math.round(dem_diaria * 100) / 100,
        cobertura_dias: cobertura_dias !== null
          ? Math.round(cobertura_dias * 10) / 10
          : null,
        status,
        qtd_sugerida,
        qtd_disponivel_cd: est_cd,
        qtd_a_enviar,
        lote_minimo: cat.lote_minimo,
        por_minimo,
      })
    }

    const resumo: ResumoLoja = {
      total_skus: itens.length,
      criticos: itens.filter((i) => i.status === 'CRITICO').length,
      alertas: itens.filter((i) => i.status === 'ALERTA').length,
      oks: itens.filter((i) => i.status === 'OK').length,
      excessos: itens.filter((i) => i.status === 'EXCESSO').length,
      sem_giro: itens.filter((i) => i.demanda_semanal === 0).length,
    }

    lojas[loja] = { itens, resumo }
    resumoGeral.total_criticos += resumo.criticos
    resumoGeral.total_alertas += resumo.alertas
    resumoGeral.lojas[loja] = resumo
  }

  // CD purchase orders
  const compras_cd: CompraCD[] = []
  const semanas_cd = todasSemanas.slice(-nSemanas)

  for (const [cod, cat] of Array.from(catalogo.entries())) {
    const est_cd = mapaCD.get(cod)?.quantidade ?? 0
    const cod_barras = mapaCD.get(cod)?.cod_barras ?? ''

    // Sum demand across all lojas for CD planning
    let dem_total_semanal = 0
    for (const loja of lojasParaProcessar) {
      const lojaVendasKey = matchLoja(loja, lojasVendas)
      const vendas_loja = vendasAgrupadas.get(lojaVendasKey)
      if (!vendas_loja) continue
      const vendasCod = vendas_loja.get(cod)
      if (!vendasCod) continue
      dem_total_semanal += calcularDemandaPonderada(vendasCod, semanas_cd, nSemanas)
    }

    if (dem_total_semanal === 0) continue

    const dem_diaria = dem_total_semanal / 7
    const cobertura_cd = dem_diaria > 0 ? est_cd / dem_diaria : null

    const trigger = diasAlvoCD + LEAD_TIME_INDUSTRIA_CD
    if (cobertura_cd !== null && cobertura_cd >= trigger) continue

    const necessidade =
      (diasAlvoCD + LEAD_TIME_INDUSTRIA_CD + FATOR_SEGURANCA * 7) * dem_diaria - est_cd
    const qtd_comprar = arredondarLote(Math.max(0, necessidade), cat.lote_minimo)
    if (qtd_comprar <= 0) continue

    const status_cd: 'CRITICO' | 'ALERTA' =
      cobertura_cd !== null && cobertura_cd < LEAD_TIME_INDUSTRIA_CD
        ? 'CRITICO'
        : 'ALERTA'

    compras_cd.push({
      id: '',
      upload_id: '',
      codigo: cod,
      cod_barras,
      descricao: cat.descricao,
      linha: cat.linha,
      tamanho: cat.tamanho,
      cor: cat.cor,
      estoque_cd: est_cd,
      demanda_total_semanal: Math.round(dem_total_semanal * 100) / 100,
      cobertura_cd_dias: cobertura_cd !== null
        ? Math.round(cobertura_cd * 10) / 10
        : null,
      qtd_comprar,
      lote_minimo: cat.lote_minimo,
      status_cd,
      prazos_pagamento: prazos,
    })

    resumoGeral.total_compras_cd++
  }

  // Sem giro no CD (sem vendas nas últimas 4 semanas, mas com estoque)
  const semanas_ult4 = todasSemanas.slice(-4)
  const sem_giro_cd: SemGiroCD[] = []

  for (const [cod, estoqueReg] of Array.from(mapaCD.entries())) {
    if (!catalogo.has(cod)) continue
    if (estoqueReg.quantidade <= 0) continue

    const temVenda = lojasParaProcessar.some((loja) => {
      const lojaVendasKey = matchLoja(loja, lojasVendas)
      const vendas_loja = vendasAgrupadas.get(lojaVendasKey)
      if (!vendas_loja) return false
      const vendasCod = vendas_loja.get(cod)
      if (!vendasCod) return false
      return semanas_ult4.some((s) => (vendasCod.get(s) ?? 0) > 0)
    })

    if (temVenda) continue

    const cat = catalogo.get(cod)!
    const ultimaVenda = (() => {
      let ultima: string | null = null
      for (const sem of [...todasSemanas].reverse()) {
        const temV = lojasParaProcessar.some((loja) => {
          const lojaVendasKey = matchLoja(loja, lojasVendas)
          const vendas_loja = vendasAgrupadas.get(lojaVendasKey)
          return (vendas_loja?.get(cod)?.get(sem) ?? 0) > 0
        })
        if (temV) { ultima = sem; break }
      }
      return ultima
    })()

    sem_giro_cd.push({
      codigo: cod,
      cod_barras: estoqueReg.cod_barras ?? '',
      descricao: cat.descricao,
      linha: cat.linha,
      tamanho: cat.tamanho,
      cor: cat.cor,
      estoque_cd: estoqueReg.quantidade,
      ultima_venda_semana: ultimaVenda,
    })
  }

  sem_giro_cd.sort((a, b) => b.estoque_cd - a.estoque_cd)
  const sem_giro_top50 = sem_giro_cd.slice(0, 50)

  // Vendas semanais por loja (para gráfico)
  const vendas_semanais: VendasSemanais = {
    semanas: todasSemanas,
    por_loja: {},
  }

  for (const loja of lojasParaProcessar) {
    const lojaVendasKey = matchLoja(loja, lojasVendas)
    const vendas_loja = vendasAgrupadas.get(lojaVendasKey)

    vendas_semanais.por_loja[loja] = todasSemanas.map((sem) => {
      if (!vendas_loja) return 0
      let total = 0
      for (const [cod, porSemana] of Array.from(vendas_loja.entries())) {
        if (catalogo.has(cod)) total += porSemana.get(sem) ?? 0
      }
      return total
    })
  }

  const meta: UploadMeta & { gerado_em: string; semana_mais_recente: string } = {
    dias_cobertura: diasAlvo,
    dias_cobertura_cd: diasAlvoCD,
    n_semanas: nSemanas,
    total_skus_catalogo: catalogo.size,
    total_lojas: lojasParaProcessar.length,
    prazos_pagamento: prazos,
    gerado_em: new Date().toISOString(),
    semana_mais_recente: semanaRecente,
  }

  return {
    meta,
    lojas,
    compras_cd,
    sem_giro_cd: sem_giro_top50,
    resumo_geral: resumoGeral,
    vendas_semanais,
  }
}
