'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, FileArchive, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ArquivoSlot {
  key: string
  label: string
  accept: string
  icon: React.ElementType
  descricao: string
}

const SLOTS: ArquivoSlot[] = [
  { key: 'catalogo', label: 'Catálogo PicPic', accept: '.csv', icon: FileText, descricao: 'Arquivo CSV com os SKUs do catálogo' },
  { key: 'vendas', label: 'Vendas Semanais', accept: '.xlsx,.xls', icon: FileSpreadsheet, descricao: 'Planilha Excel com resumo de vendas' },
  { key: 'estoques', label: 'Estoques das Lojas', accept: '.zip', icon: FileArchive, descricao: 'ZIP com os arquivos de estoque de cada loja' },
]

type Stage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const supabase = createClient()

  const [arquivos, setArquivos] = useState<Record<string, File | null>>({ catalogo: null, vendas: null, estoques: null })
  const [stage, setStage] = useState<Stage>('idle')
  const [mensagem, setMensagem] = useState('')
  const [progresso, setProgresso] = useState(0)

  const tudoPronto = SLOTS.every((s) => arquivos[s.key] !== null)

  async function handleProcessar() {
    if (!tudoPronto) return
    setStage('uploading')
    setProgresso(5)
    setMensagem('Enviando arquivos para o servidor...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão expirada')

      const ts = Date.now()
      const paths: Record<string, string> = {}

      // Upload each file directly to Supabase Storage
      for (let i = 0; i < SLOTS.length; i++) {
        const slot = SLOTS[i]
        const file = arquivos[slot.key]!
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${ts}/${slot.key}.${ext}`

        setMensagem(`Enviando ${slot.label}... (${i + 1}/3)`)
        setProgresso(10 + i * 20)

        const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
        if (error) throw new Error(`Erro ao enviar ${slot.label}: ${error.message}`)

        paths[slot.key] = path
      }

      setStage('processing')
      setProgresso(70)
      setMensagem('Processando dados...')

      const res = await fetch('/api/processar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar')

      // Clean up storage files after processing
      await supabase.storage.from('uploads').remove(Object.values(paths))

      setProgresso(100)
      setStage('done')
      setMensagem('Processamento concluído! Redirecionando...')

      setTimeout(() => router.push('/reposicao'), 1500)
    } catch (e: unknown) {
      setStage('error')
      setMensagem(e instanceof Error ? e.message : 'Erro inesperado')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--c-text)]">Upload de Dados</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">Selecione os 3 arquivos para gerar o relatório da semana</p>
      </div>

      <div className="space-y-3">
        {SLOTS.map((slot) => (
          <FileSlot
            key={slot.key}
            slot={slot}
            file={arquivos[slot.key]}
            onChange={(f) => setArquivos((prev) => ({ ...prev, [slot.key]: f }))}
          />
        ))}
      </div>

      {stage !== 'idle' && (
        <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] space-y-3">
          <div className="flex items-center gap-2.5">
            {stage === 'done' ? (
              <CheckCircle size={18} className="text-[var(--c-ok)]" />
            ) : stage === 'error' ? (
              <AlertCircle size={18} className="text-[var(--c-critico)]" />
            ) : (
              <Loader2 size={18} className="text-[var(--c-primary)] animate-spin" />
            )}
            <span className="text-sm font-medium text-[var(--c-text)]">{mensagem}</span>
          </div>
          <div className="w-full bg-[var(--c-bg)] rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progresso}%`, background: stage === 'error' ? 'var(--c-critico)' : 'var(--c-primary)' }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleProcessar}
        disabled={!tudoPronto || stage === 'uploading' || stage === 'processing'}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #1E3A8A, #1E40AF)' }}
      >
        {stage === 'uploading' || stage === 'processing' ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        Processar Dados
      </button>
    </div>
  )
}

function FileSlot({ slot, file, onChange }: { slot: ArquivoSlot; file: File | null; onChange: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onChange(f) }}
      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
        file ? 'border-[var(--c-ok)] bg-[var(--c-ok-bg)]'
          : dragging ? 'border-[var(--c-primary)] bg-[#EFF6FF]'
          : 'border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-primary-light)]'
      }`}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: file ? 'var(--c-ok-bg)' : 'var(--c-bg)', color: file ? 'var(--c-ok)' : 'var(--c-muted)' }}>
        {file ? <CheckCircle size={20} /> : <slot.icon size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--c-text)]">{slot.label}</p>
        <p className="text-xs text-[var(--c-muted)] truncate">{file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)` : slot.descricao}</p>
      </div>
      <input ref={inputRef} type="file" accept={slot.accept} className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </div>
  )
}
