export const LEAD_TIME_CD_LOJA = 3
export const LEAD_TIME_INDUSTRIA_CD = 10
export const FATOR_SEGURANCA = 0.5
export const ESTOQUE_MINIMO_LOJA = 10
export const DIAS_COBERTURA_LOJA = 45
export const DIAS_COBERTURA_CD = 60
export const N_SEMANAS_BASE = 8
export const PRAZOS_PAGAMENTO_DIAS = [67, 74, 81, 88, 95, 102, 109]

export const PESOS_DEMANDA = {
  base: 0.5,
  ultimas4: 0.3,
  ultimas2: 0.2,
}

export const CORES_LOJAS = [
  '#1E40AF',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#DC2626',
  '#0891B2',
  '#BE185D',
]

export const STATUS_COLORS: Record<string, string> = {
  CRITICO: '#DC2626',
  ALERTA: '#D97706',
  OK: '#059669',
  EXCESSO: '#2563EB',
}

export const STATUS_BG: Record<string, string> = {
  CRITICO: '#FEF2F2',
  ALERTA: '#FFFBEB',
  OK: '#F0FDF4',
  EXCESSO: '#EFF6FF',
}
