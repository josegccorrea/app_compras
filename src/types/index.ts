export type StatusItem = 'CRITICO' | 'ALERTA' | 'OK' | 'EXCESSO'
export type StatusCD = 'CRITICO' | 'ALERTA'
export type UploadStatus = 'processing' | 'done' | 'error'

export interface Upload {
  id: string
  user_id: string
  semana_iso: string
  status: UploadStatus
  created_at: string
  meta: UploadMeta
}

export interface UploadMeta {
  dias_cobertura: number
  dias_cobertura_cd: number
  n_semanas: number
  total_skus_catalogo: number
  total_lojas: number
  prazos_pagamento: string[]
}

export interface Catalogo {
  id: string
  upload_id: string
  codigo: string
  descricao: string
  linha: string
  tamanho: string
  cor: string
  marca: string
  lote_minimo: number
}

export interface Venda {
  id: string
  upload_id: string
  semana_iso: string
  loja: string
  codigo: string
  quantidade: number
}

export interface Estoque {
  id: string
  upload_id: string
  loja: string
  codigo: string
  quantidade: number
}

export interface Sugestao {
  id: string
  upload_id: string
  loja: string
  codigo: string
  cod_barras: string
  descricao: string
  linha: string
  tamanho: string
  cor: string
  estoque_atual: number
  demanda_semanal: number
  demanda_diaria: number
  cobertura_dias: number | null
  status: StatusItem
  qtd_sugerida: number
  qtd_disponivel_cd: number
  qtd_a_enviar: number
  lote_minimo: number
  por_minimo: boolean
}

export interface CompraCD {
  id: string
  upload_id: string
  codigo: string
  cod_barras: string
  descricao: string
  linha: string
  tamanho: string
  cor: string
  estoque_cd: number
  demanda_total_semanal: number
  cobertura_cd_dias: number | null
  qtd_comprar: number
  lote_minimo: number
  status_cd: StatusCD
  prazos_pagamento: string[]
}

export interface SemGiroCD {
  codigo: string
  cod_barras: string
  descricao: string
  linha: string
  tamanho: string
  cor: string
  estoque_cd: number
  ultima_venda_semana: string | null
}

// Engine types
export interface ItemCatalogo {
  codigo: string
  descricao: string
  linha: string
  tamanho: string
  cor: string
  marca: string
  lote_minimo: number
}

export interface RegistroVenda {
  semana_iso: string
  loja: string
  codigo: string
  quantidade: number
}

export interface RegistroEstoque {
  loja: string
  codigo: string
  quantidade: number
  cod_barras?: string
  descricao_sistema?: string
}

export interface ResultadoProcessamento {
  meta: UploadMeta & {
    gerado_em: string
    semana_mais_recente: string
  }
  lojas: Record<string, LojaResultado>
  compras_cd: CompraCD[]
  sem_giro_cd: SemGiroCD[]
  resumo_geral: ResumoGeral
  vendas_semanais: VendasSemanais
}

export interface LojaResultado {
  itens: Sugestao[]
  resumo: ResumoLoja
}

export interface ResumoLoja {
  total_skus: number
  criticos: number
  alertas: number
  oks: number
  excessos: number
  sem_giro: number
}

export interface ResumoGeral {
  total_criticos: number
  total_alertas: number
  total_compras_cd: number
  lojas: Record<string, ResumoLoja>
}

export interface VendasSemanais {
  semanas: string[]
  por_loja: Record<string, number[]>
}
