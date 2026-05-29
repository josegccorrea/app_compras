import { Card, CardContent } from '@/components/ui/card'
import { ArrowRightLeft } from 'lucide-react'

export const metadata = { title: 'Transferências — Colibri Compras' }

export default function Transferencias() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Transferências CD → Lojas</h2>
        <p className="text-sm text-muted-foreground">Sugestões de transferência do CD para abastecimento das lojas.</p>
      </div>
      <Card>
        <CardContent className="p-8 text-center">
          <ArrowRightLeft className="h-12 w-12 text-colibri-600 mx-auto mb-3" />
          <p className="font-medium">Funcionalidade disponível</p>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse a análise de SKU individual ou em lote, selecione um produto e clique em &quot;Sugestão de Transferência&quot; para ver as recomendações de distribuição do CD para as lojas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
