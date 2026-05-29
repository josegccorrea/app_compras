import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ListChecks, ShoppingCart } from 'lucide-react'

export const metadata = { title: 'Sugestão de Compra — Colibri Compras' }

export default function Compras() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Sugestão de Compra</h2>
        <p className="text-sm text-muted-foreground">Gere pedidos de compra a partir da análise de SKUs.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6 text-center space-y-3">
            <ListChecks className="h-12 w-12 text-colibri-600 mx-auto" />
            <h3 className="font-semibold">Análise em Lote</h3>
            <p className="text-sm text-muted-foreground">Analise múltiplos SKUs e gere sugestões de compra em massa.</p>
            <Button asChild className="w-full bg-colibri-600 hover:bg-colibri-700">
              <Link href="/analise-lote">Iniciar análise em lote</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6 text-center space-y-3">
            <ShoppingCart className="h-12 w-12 text-colibri-600 mx-auto" />
            <h3 className="font-semibold">Análise Individual</h3>
            <p className="text-sm text-muted-foreground">Pesquise um SKU específico e veja a sugestão detalhada.</p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/sku">Pesquisar SKU</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
