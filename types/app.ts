import type { Tables } from './database'

// ── Perfil ──────────────────────────────────────────────────────────────────
export type UserRole = 'comprador' | 'cadastro' | 'gerente'
export type Profile = Tables<'profiles'>

// ── Operações ────────────────────────────────────────────────────────────────
export type Operacao = Tables<'operacoes'>
export type TipoOperacao = Operacao['tipo']

export const OPERACOES_LOJAS = ['Cacho', 'LAR', 'MAR', 'VIX', 'GLO', 'GUA', 'CG'] as const
export const OPERACAO_CD = 'CD'

// ── Classificação hierárquica ─────────────────────────────────────────────
export type Familia = Tables<'familias'>
export type Departamento = Tables<'departamentos'>
export type Secao = Tables<'secoes'>

export interface ClassificacaoHierarquia {
  familia: Familia
  departamentos: (Departamento & { secoes: Secao[] })[]
}

// ── Fornecedor ────────────────────────────────────────────────────────────
export type Fornecedor = Tables<'fornecedores'>
export type FornecedorContato = Tables<'fornecedor_contatos'>

export interface FornecedorComContatos extends Fornecedor {
  contatos: FornecedorContato[]
  comprador?: Profile | null
}

// ── Produto ───────────────────────────────────────────────────────────────
export type Produto = Tables<'produtos'>
export type ProdutoFornecedor = Tables<'produto_fornecedores'>
export type StatusProduto = Produto['status']

export interface ProdutoCompleto extends Produto {
  familia?: Familia | null
  departamento?: Departamento | null
  secao?: Secao | null
  fornecedor_padrao?: Fornecedor | null
  fornecedores_alternativos?: (ProdutoFornecedor & { fornecedor: Fornecedor })[]
}

// ── Parâmetros ────────────────────────────────────────────────────────────
export type ParametroOperacional = Tables<'parametros_operacionais'>

// ── Importação ────────────────────────────────────────────────────────────
export type Importacao = Tables<'importacoes'>
export type TemaImportacao = Importacao['tema']
export type StatusImportacao = Importacao['status']

export interface MapeamentoColunas {
  [colunaOrigem: string]: string // campo destino no sistema
}

export interface ResultadoPreValidacao {
  totalLinhas: number
  linhasValidas: number
  linhasInvalidas: number
  skusNaoEncontrados: string[]
  fornecedoresAusentes: string[]
  errosConversao: string[]
  divergenciasClassificacao: string[]
  resumoImpacto: string
  erros: { linha: number; mensagem: string }[]
}

// ── Dados operacionais ────────────────────────────────────────────────────
export type Venda = Tables<'vendas'>
export type Estoque = Tables<'estoques'>
export type NfEntrada = Tables<'nf_entradas'>

// ── Análise de SKU ────────────────────────────────────────────────────────
export interface VendasPorOperacao {
  operacao: Operacao
  semanas: { semana: string; quantidade: number; valor: number }[]
  totalQuantidade: number
  totalValor: number
  mediasSemanal: number
}

export interface EstoquePorOperacao {
  operacao: Operacao
  quantidade: number
  confiavel: boolean
  dataReferencia: string
}

export interface NfRecente {
  data: string
  quantidade: number
  fornecedor: string
  custo: number | null
  operacao: string
}

export interface AnalyseSku {
  produto: ProdutoCompleto
  vendas: VendasPorOperacao[]
  estoques: EstoquePorOperacao[]
  ultimasNfs: NfRecente[]
  alertas: Alerta[]
  sugestao?: SugestaoCompra
  explicacaoIA?: string
}

// ── Sugestão de compra ────────────────────────────────────────────────────
export interface DemandaCalculada {
  mediaJanelaUsuario: number
  mediaUltimas4Semanas: number
  mediaUltimas2Semanas: number
  demandaBase: number
  desvioPadrao: number
  janelaEscolhida: number
}

export interface SugestaoItemLoja {
  operacao: Operacao
  estoqueAtual: number
  estoqueConfiavel: boolean
  estoqueTeoricoInferido?: number
  cobertura: number
  coberturaAlvo: number
  necessidadeBruta: number
  sugestaoQuantidade: number
  riscoRuptura: boolean
  coberturaExcessiva: boolean
  capitalEmpatado?: number
}

export interface SugestaoCompra {
  produto: ProdutoCompleto
  fornecedor?: Fornecedor
  demanda: DemandaCalculada
  itensPorLoja: SugestaoItemLoja[]
  totalSugerido: number
  totalConfirmado?: number
  justificativa?: string
  baseInferida: boolean
}

export interface SugestaoTransferencia {
  produto: ProdutoCompleto
  estoqueCD: number
  itensPorLoja: {
    operacao: Operacao
    necessidade: number
    sugestaoTransferencia: number
    ordemPrioridade: number
  }[]
  totalTransferencia: number
  transferenciaParcial: boolean
  saldoCDRestante: number
}

// ── Pedido ─────────────────────────────────────────────────────────────────
export type Pedido = Tables<'pedidos'>
export type PedidoItem = Tables<'pedido_itens'>
export type StatusPedido = Pedido['status']

export interface PedidoCompleto extends Pedido {
  fornecedor: Fornecedor
  responsavel: Profile
  aprovador?: Profile | null
  itens: (PedidoItem & { produto: Produto; operacao: Operacao })[]
}

export const STATUS_PEDIDO_LABELS: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  enviado_fornecedor: 'Enviado ao fornecedor',
  faturado: 'Faturado',
  entregue: 'Entregue',
  encerrado: 'Encerrado',
}

// ── Tarefa / Kanban ────────────────────────────────────────────────────────
export type Tarefa = Tables<'tarefas'>
export type PrioridadeTarefa = Tarefa['prioridade']
export type StatusTarefa = Tarefa['status']

export interface TarefaCompleta extends Tarefa {
  responsavel?: Profile | null
  fornecedor?: Fornecedor | null
  produto?: Produto | null
  operacao?: Operacao | null
}

// ── Alertas ────────────────────────────────────────────────────────────────
export type TipoAlerta =
  | 'ruptura'
  | 'cobertura_baixa'
  | 'cobertura_alta'
  | 'estoque_nao_confiavel'
  | 'sem_giro'
  | 'sem_fornecedor_padrao'
  | 'sem_classificacao'
  | 'cadastro_incompleto'
  | 'divergencia_estoque_venda'
  | 'transferencia_parcial'
  | 'item_aposta'
  | 'fornecedor_incompleto'

export type SeveridadeAlerta = 'critico' | 'atencao' | 'info'

export interface Alerta {
  tipo: TipoAlerta
  severidade: SeveridadeAlerta
  mensagem: string
  produtoId?: string
  operacaoId?: string
  fornecedorId?: string
}

// ── Audit log ──────────────────────────────────────────────────────────────
export type AuditLog = Tables<'audit_logs'>

// ── Visão salva ────────────────────────────────────────────────────────────
export type VisaoSalva = Tables<'visoes_salvas'>

export interface FiltroAnalise {
  fornecedor_id?: string
  departamento_id?: string
  familia_id?: string
  operacao_id?: string
  periodo_inicio?: string
  periodo_fim?: string
  status_estoque_confiavel?: boolean
  classificado?: boolean
  sazonal?: boolean
  aposta?: boolean
}
