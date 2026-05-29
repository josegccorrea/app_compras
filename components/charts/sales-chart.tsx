'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { agruparPorSemana } from '@/lib/business/demand'
import { formatNumber } from '@/lib/utils/format'

interface SalesChartProps {
  vendas: { data: string; quantidade: number }[]
}

export function SalesChart({ vendas }: SalesChartProps) {
  if (vendas.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
        Sem dados de venda para o período.
      </div>
    )
  }

  const weekly = agruparPorSemana(vendas)
    .sort((a, b) => a.semana.localeCompare(b.semana))
    .map((v) => ({
      semana: v.semana.replace(/^\d{4}-/, 'S'),
      quantidade: v.quantidade,
    }))

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={36} tickFormatter={(v) => formatNumber(v)} />
        <Tooltip
          formatter={(value: number) => [formatNumber(value), 'Quantidade']}
          labelFormatter={(label) => `Semana ${label}`}
        />
        <Bar dataKey="quantidade" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
