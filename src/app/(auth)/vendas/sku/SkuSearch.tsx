'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CORES_LOJAS } from '@/lib/constants'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface CatalogoItem {
  codigo: string
  descricao: string
  linha: string
  tamanho: string
  cor: string
}

interface Props {
  catalogo: CatalogoItem[]
  uploadIds: { id: string; semana: string }[]
}

export default function SkuSearch({ catalogo, uploadIds }: Props) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CatalogoItem | null>(null)
  const [chartData, setChartData] = useState<{ semanas: string[]; porLoja: Record<string, number[]> } | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const filtered = query.length >= 2
    ? catalogo.filter(
        (c) =>
          c.codigo.includes(query) ||
          c.descricao.toLowerCase().includes(query.toLowerCase()) ||
          c.linha.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 15)
    : []

  async function handleSelect(item: CatalogoItem) {
    setSelected(item)
    setQuery(item.codigo + ' — ' + item.descricao)
    setLoading(true)

    // Fetch vendas for this SKU across all uploads
    const { data: vendas } = await supabase
      .from('vendas')
      .select('semana_iso, loja, quantidade, upload_id')
      .eq('codigo', item.codigo)
      .in('upload_id', uploadIds.map((u) => u.id))

    if (!vendas?.length) {
      setChartData({ semanas: [], porLoja: {} })
      setLoading(false)
      return
    }

    const semanas = Array.from(new Set(vendas.map((v) => v.semana_iso))).sort()
    const lojas = Array.from(new Set(vendas.map((v) => v.loja))).sort()

    const porLoja: Record<string, number[]> = {}
    for (const loja of lojas) {
      porLoja[loja] = semanas.map((sem) =>
        vendas.filter((v) => v.loja === loja && v.semana_iso === sem)
          .reduce((s, v) => s + Number(v.quantidade), 0)
      )
    }

    setChartData({ semanas, porLoja })
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); setChartData(null) }}
          placeholder="Buscar por código, descrição ou linha..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--c-border)] rounded-xl bg-[var(--c-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]"
        />
        {filtered.length > 0 && !selected && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--c-surface)] border border-[var(--c-border)] rounded-xl shadow-lg z-10 overflow-hidden">
            {filtered.map((item) => (
              <button
                key={item.codigo}
                onClick={() => handleSelect(item)}
                className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-[var(--c-bg)] transition-colors border-b border-[var(--c-border)] last:border-0"
              >
                <span className="font-mono text-xs text-[var(--c-primary)] mt-0.5">{item.codigo}</span>
                <div>
                  <p className="text-xs font-medium text-[var(--c-text)]">{item.descricao}</p>
                  <p className="text-xs text-[var(--c-muted)]">{item.linha} · Tam {item.tamanho} · {item.cor}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">SKU</p>
              <p className="font-mono font-semibold text-[var(--c-primary)]">{selected.codigo}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">Descrição</p>
              <p className="text-sm font-medium text-[var(--c-text)]">{selected.descricao}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-muted)]">Linha / Tam / Cor</p>
              <p className="text-sm text-[var(--c-text)]">{selected.linha} · {selected.tamanho} · {selected.cor}</p>
            </div>
          </div>

          {loading && <p className="text-sm text-[var(--c-muted)]">Carregando...</p>}

          {!loading && chartData && chartData.semanas.length > 0 && (
            <div style={{ height: 300 }}>
              <Line
                data={{
                  labels: chartData.semanas.map((s) => s.replace(/(\d{4})-W/, 'S').replace(/^S0/, 'S')),
                  datasets: Object.keys(chartData.porLoja).map((loja, i) => ({
                    label: loja,
                    data: chartData.porLoja[loja],
                    borderColor: CORES_LOJAS[i % CORES_LOJAS.length],
                    backgroundColor: CORES_LOJAS[i % CORES_LOJAS.length] + '18',
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    borderWidth: 2,
                  })),
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
                    tooltip: { backgroundColor: '#0F172A', padding: 10, cornerRadius: 8 },
                  },
                  scales: {
                    x: { grid: { color: '#E2E8F0' } },
                    y: { beginAtZero: true, grid: { color: '#E2E8F0' } },
                  },
                }}
              />
            </div>
          )}

          {!loading && chartData && chartData.semanas.length === 0 && (
            <p className="text-sm text-[var(--c-muted)]">Sem vendas registradas para este SKU.</p>
          )}
        </div>
      )}
    </div>
  )
}
