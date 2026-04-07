'use client'

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { CORES_LOJAS } from '@/lib/constants'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  porLinha: Record<string, number>
}

export default function MixChart({ porLinha }: Props) {
  const labels = Object.keys(porLinha)
  const data = Object.values(porLinha)

  const colors = labels.map((_, i) => CORES_LOJAS[i % CORES_LOJAS.length])

  return (
    <div style={{ height: 320, position: 'relative' }}>
      <Doughnut
        data={{
          labels,
          datasets: [{ data, backgroundColor: colors, borderColor: '#fff', borderWidth: 2 }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } },
            tooltip: {
              backgroundColor: '#0F172A',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx) => {
                  const total = (ctx.dataset.data as number[]).reduce((s, v) => s + v, 0)
                  const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0'
                  return ` ${ctx.parsed.toLocaleString('pt-BR')} un (${pct}%)`
                },
              },
            },
          },
        }}
      />
    </div>
  )
}
