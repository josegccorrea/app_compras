import { createClient } from '@/lib/supabase/server'
import YoYChart from './YoYChart'

export default async function YoYPage() {
  const supabase = await createClient()

  // Get all uploads to have full historical data
  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, semana_iso')
    .eq('status', 'done')
    .order('semana_iso', { ascending: true })

  if (!uploads?.length) return <p className="text-sm text-[var(--c-muted)]">Nenhum dado disponível.</p>

  // Get all vendas across all uploads
  const { data: vendas } = await supabase
    .from('vendas')
    .select('semana_iso, quantidade')
    .in('upload_id', uploads.map((u) => u.id))

  // Group by year and week number
  const porAnoSemana: Record<string, Record<number, number>> = {}

  for (const v of vendas ?? []) {
    const m = v.semana_iso.match(/(\d{4})-W(\d{2})/)
    if (!m) continue
    const ano = m[1]
    const semNum = parseInt(m[2], 10)
    if (!porAnoSemana[ano]) porAnoSemana[ano] = {}
    porAnoSemana[ano][semNum] = (porAnoSemana[ano][semNum] ?? 0) + Number(v.quantidade)
  }

  const anos = Object.keys(porAnoSemana).sort()
  const todasSemanas = Array.from(
    new Set(
      Object.values(porAnoSemana).flatMap((s) => Object.keys(s).map(Number))
    )
  ).sort((a, b) => a - b)

  const porAno: Record<string, number[]> = {}
  for (const ano of anos) {
    porAno[ano] = todasSemanas.map((sem) => porAnoSemana[ano][sem] ?? 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--c-text)]">Comparação Ano a Ano</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">
          Mesma semana em anos diferentes — {anos.join(' vs ')}
        </p>
      </div>

      <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] shadow-sm">
        <YoYChart semanas={todasSemanas} porAno={porAno} />
      </div>

      {anos.length < 2 && (
        <div className="bg-[var(--c-alerta-bg)] border border-[var(--c-alerta)] rounded-xl p-4 text-sm text-[var(--c-alerta)]">
          Comparação ano a ano disponível após ao menos 2 anos de uploads. Continue fazendo uploads semanais para acumular histórico.
        </div>
      )}
    </div>
  )
}
