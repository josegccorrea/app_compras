'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { CORES_LOJAS } from '@/lib/constants'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface Props {
  semanas: number[]
  porAno: Record<string, number[]>
}

export default function YoYChart({ semanas, porAno }: Props) {
  const labels = semanas.map((s) => `Sem ${String(s).padStart(2, '0')}`)
  const anos = Object.keys(porAno).sort()

  const datasets = anos.map((ano, i) => ({
    label: ano,
    data: porAno[ano],
    borderColor: CORES_LOJAS[i % CORES_LOJAS.length],
    backgroundColor: CORES_LOJAS[i % CORES_LOJAS.length] + '18',
    tension: 0.3,
    pointRadius: 4,
    pointHoverRadius: 7,
    borderWidth: 2.5,
    borderDash: i > 0 ? [6, 3] : undefined,
  }))

  return (
    <div style={{ height: 380 }}>
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
            tooltip: { backgroundColor: '#0F172A', padding: 12, cornerRadius: 8 },
            title: {
              display: true,
              text: `Comparação ${anos.join(' vs ')} — por semana do ano`,
              font: { size: 13, weight: 'bold' },
              color: '#0F172A',
              padding: { bottom: 16 },
            },
          },
          scales: {
            x: { grid: { color: '#E2E8F0' }, ticks: { font: { size: 11 }, color: '#64748B' } },
            y: {
              beginAtZero: true,
              grid: { color: '#E2E8F0' },
              ticks: { font: { size: 11 }, color: '#64748B' },
              title: { display: true, text: 'Unidades vendidas', font: { size: 11 }, color: '#64748B' },
            },
          },
        }}
      />
    </div>
  )
}
