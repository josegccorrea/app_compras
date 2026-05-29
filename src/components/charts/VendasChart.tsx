'use client'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { CORES_LOJAS } from '@/lib/constants'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface Props {
  semanas: string[]
  porLoja: Record<string, number[]>
  titulo?: string
  tipo?: 'line' | 'bar'
}

export default function VendasChart({ semanas, porLoja, titulo, tipo = 'line' }: Props) {
  const labels = semanas.map((s) => {
    const m = s.match(/(\d{4})-W(\d{2})/)
    return m ? `Sem ${m[2]}/${m[1].slice(2)}` : s
  })

  const lojas = Object.keys(porLoja)

  const datasets = lojas.map((loja, i) => ({
    label: loja,
    data: porLoja[loja],
    borderColor: CORES_LOJAS[i % CORES_LOJAS.length],
    backgroundColor: tipo === 'bar'
      ? CORES_LOJAS[i % CORES_LOJAS.length] + 'CC'
      : CORES_LOJAS[i % CORES_LOJAS.length] + '18',
    fill: tipo === 'line' ? false : undefined,
    tension: 0.3,
    pointRadius: tipo === 'line' ? 4 : undefined,
    pointHoverRadius: tipo === 'line' ? 7 : undefined,
    borderWidth: 2,
  }))

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#94A3B8',
        bodyColor: '#F1F5F9',
        padding: 12,
        cornerRadius: 8,
      },
      title: titulo
        ? { display: true, text: titulo, font: { size: 13, weight: 'bold' as const }, color: '#0F172A', padding: { bottom: 16 } }
        : undefined,
    },
    scales: {
      x: {
        grid: { color: '#E2E8F0' },
        ticks: { font: { size: 11 }, color: '#64748B' },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#E2E8F0' },
        ticks: { font: { size: 11 }, color: '#64748B' },
        title: { display: true, text: 'Unidades', font: { size: 11 }, color: '#64748B' },
      },
    },
  }

  return (
    <div style={{ height: 360 }}>
      {tipo === 'bar'
        ? <Bar data={{ labels, datasets }} options={options} />
        : <Line data={{ labels, datasets }} options={options} />
      }
    </div>
  )
}
