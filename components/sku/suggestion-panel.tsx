import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/utils/format'

interface SuggestionPanelProps {
  sugestaoQuantidade: number
  coberturaAlvo: number
  coberturaAtual: number
  baseInferida: boolean
  demandaBase: number
  estoqueBase: number
}

export function SuggestionPanel({
  sugestaoQuantidade,
  coberturaAlvo,
  coberturaAtual,
  baseInferida,
  demandaBase,
  estoqueBase,
}: SuggestionPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Quantidade sugerida</span>
        <span className="text-2xl font-bold text-colibri-700">{formatNumber(sugestaoQuantidade)}</span>
      </div>
      {baseInferida && (
        <Badge variant="warning" className="w-full justify-center">
          Base inferida por NF — não é saldo real
        </Badge>
      )}
      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Demanda base/semana</span>
          <span>{formatNumber(demandaBase, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Estoque considerado</span>
          <span>{formatNumber(estoqueBase)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cobertura atual</span>
          <span>{formatNumber(coberturaAtual, 1)} sem</span>
        </div>
        <div className="flex justify-between">
          <span>Cobertura alvo</span>
          <span>{coberturaAlvo} sem</span>
        </div>
      </div>
    </div>
  )
}
