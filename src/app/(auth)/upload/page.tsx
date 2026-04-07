'use client'

import { useState, useRef } from 'react'
import { Upload, FileSpreadsheet, FileArchive, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ArquivoInfo {
  file: File | null
  label: string
  accept: string
  icon: React.ElementType
  descricao: string
}

export default function UploadPage() {
  const router = useRouter()
  const [arquivos, setArquivos] = useState<Record<string, File | null>>({
    catalogo: null,
    vendas: null,
    estoques: null,
  })
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const [mensagem, setMensagem] = useState('')
  const [progresso, setProgresso] = useState(0)

  const slots: ArquivoInfo[] = [
    {
      file: arquivos.catalogo,
      label: 'Catálogo PicPic',
      accept: '.csv',
      icon: FileText,
      descricao: 'Arquivo CSV com os SKUs do catálogo',
    },
    {
      file: arquivos.vendas,
      label: 'Vendas Semanais',
      accept: '.xlsx,.xls',
      icon: FileSpreadsheet,
      descricao: 'Planilha Excel com resumo de vendas',
    },
    {
      file: arquivos.estoques,
      label: 'Estoques das Lojas',
      accept: '.zip',
      icon: FileArchive,
      descricao: 'ZIP com os arquivos de estoque de cada loja',
    },
  ]

  const keys = ['catalogo', 'vendas', 'estoques']

  function handleFile(key: string, file: File | null) {
    setArquivos((prev) => ({ ...prev, [key]: file }))
  }

  const tudoPronto = keys.every((k) => arquivos[k] !== null)

  async function handleProcessar() {
    if (!tudoPronto) return

    setStatus('uploading')
    setProgresso(10)
    setMensagem('Enviando arquivos...')

    const form = new FormData()
    form.append('catalogo', arquivos.catalogo!)
    form.append('vendas', arquivos.vendas!)
    form.append('estoques', arquivos.estoques!)

    try {
      setProgresso(30)
      const res = await fetch('/api/processar', { method: 'POST', body: form })

      setStatus('processing')
      setProgresso(60)
      setMensagem('Processando dados...')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao processar')
      }

      setProgresso(100)
      setStatus('done')
      setMensagem('Processamento concluído!')

      setTimeout(() => router.push('/reposicao'), 1500)
    } catch (e: unknown) {
      setStatus('error')
      setMensagem(e instanceof Error ? e.message : 'Erro inesperado')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--c-text)]">Upload de Dados</h1>
        <p className="text-sm text-[var(--c-muted)] mt-1">
          Selecione os 3 arquivos para gerar o relatório da semana
        </p>
      </div>

      <div className="space-y-3">
        {slots.map((slot, i) => (
          <FileSlot
            key={keys[i]}
            {...slot}
            onChange={(f) => handleFile(keys[i], f)}
          />
        ))}
      </div>

      {status !== 'idle' && (
        <div className="bg-[var(--c-surface)] rounded-xl p-5 border border-[var(--c-border)] space-y-3">
          <div className="flex items-center gap-2.5">
            {status === 'done' ? (
              <CheckCircle size={18} className="text-[var(--c-ok)]" />
            ) : status === 'error' ? (
              <AlertCircle size={18} className="text-[var(--c-critico)]" />
            ) : (
              <Loader2 size={18} className="text-[var(--c-primary)] animate-spin" />
            )}
            <span className="text-sm font-medium text-[var(--c-text)]">{mensagem}</span>
          </div>
          <div className="w-full bg-[var(--c-bg)] rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${progresso}%`,
                background: status === 'error' ? 'var(--c-critico)' : 'var(--c-primary)',
              }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleProcessar}
        disabled={!tudoPronto || status === 'uploading' || status === 'processing'}
        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'linear-gradient(135deg, #1E3A8A, #1E40AF)' }}
      >
        {status === 'uploading' || status === 'processing' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        Processar Dados
      </button>
    </div>
  )
}

interface FileSlotProps {
  file: File | null
  label: string
  accept: string
  icon: React.ElementType
  descricao: string
  onChange: (file: File | null) => void
}

function FileSlot({ file, label, accept, icon: Icon, descricao, onChange }: FileSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onChange(f)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
        ${file
          ? 'border-[var(--c-ok)] bg-[var(--c-ok-bg)]'
          : dragging
            ? 'border-[var(--c-primary)] bg-[#EFF6FF]'
            : 'border-[var(--c-border)] bg-[var(--c-surface)] hover:border-[var(--c-primary-light)]'
        }
      `}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: file ? 'var(--c-ok-bg)' : 'var(--c-bg)',
          color: file ? 'var(--c-ok)' : 'var(--c-muted)',
        }}
      >
        {file ? <CheckCircle size={20} /> : <Icon size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--c-text)]">{label}</p>
        <p className="text-xs text-[var(--c-muted)] truncate">
          {file ? file.name : descricao}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  )
}
