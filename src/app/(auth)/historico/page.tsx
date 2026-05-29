import { createClient } from '@/lib/supabase/server'
import { CheckCircle, Clock, AlertCircle, Upload } from 'lucide-react'
import Link from 'next/link'

const STATUS_ICON = {
  done: CheckCircle,
  processing: Clock,
  error: AlertCircle,
}

const STATUS_COLOR = {
  done: 'var(--c-ok)',
  processing: 'var(--c-alerta)',
  error: 'var(--c-critico)',
}

export default async function HistoricoPage() {
  const supabase = await createClient()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, semana_iso, status, created_at, meta')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Histórico de Uploads</h1>
          <p className="text-sm text-[var(--c-muted)] mt-1">{uploads?.length ?? 0} processamentos registrados</p>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #1E3A8A, #1E40AF)' }}
        >
          <Upload size={14} />
          Novo Upload
        </Link>
      </div>

      <div className="bg-[var(--c-surface)] rounded-xl border border-[var(--c-border)] shadow-sm overflow-hidden">
        {!uploads?.length ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-[var(--c-muted)]">
            <Upload size={32} className="opacity-30" />
            <p className="text-sm">Nenhum upload realizado ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--c-bg)] text-[var(--c-muted)] text-xs">
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wide">Semana</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right font-semibold uppercase tracking-wide">SKUs</th>
                <th className="px-5 py-3 text-right font-semibold uppercase tracking-wide">Lojas</th>
                <th className="px-5 py-3 text-left font-semibold uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => {
                const Icon = STATUS_ICON[upload.status as keyof typeof STATUS_ICON] ?? Clock
                const color = STATUS_COLOR[upload.status as keyof typeof STATUS_COLOR] ?? 'var(--c-muted)'
                const meta = upload.meta as { total_skus_catalogo?: number; total_lojas?: number } | null

                return (
                  <tr key={upload.id} className="border-t border-[var(--c-border)] hover:bg-[var(--c-bg)] transition-colors">
                    <td className="px-5 py-3 font-semibold text-[var(--c-primary)]">{upload.semana_iso}</td>
                    <td className="px-5 py-3 text-[var(--c-muted)]">
                      {new Date(upload.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5" style={{ color }}>
                        <Icon size={14} />
                        {upload.status === 'done' ? 'Concluído' : upload.status === 'processing' ? 'Processando' : 'Erro'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--c-muted)]">{meta?.total_skus_catalogo ?? '—'}</td>
                    <td className="px-5 py-3 text-right text-[var(--c-muted)]">{meta?.total_lojas ?? '—'}</td>
                    <td className="px-5 py-3">
                      {upload.status === 'done' && (
                        <Link
                          href={`/reposicao?semana=${upload.semana_iso}`}
                          className="text-xs font-medium text-[var(--c-primary)] hover:underline"
                        >
                          Ver relatório →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
