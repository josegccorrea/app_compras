'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)]">
      <div className="w-full max-w-sm">
        <div
          className="rounded-xl p-8 shadow-sm border border-[var(--c-border)] bg-[var(--c-surface)]"
        >
          <div className="mb-8">
            <div
              className="w-full h-16 rounded-lg flex items-center justify-center mb-6"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #1E40AF)' }}
            >
              <span className="text-white font-semibold text-lg tracking-wide">Colibri</span>
            </div>
            <h1 className="text-xl font-semibold text-[var(--c-text)]">Bem-vindo</h1>
            <p className="text-sm text-[var(--c-muted)] mt-1">Sistema de Reposição PicPic</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--c-text)] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--c-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--c-text)] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--c-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-[var(--c-critico)] bg-[var(--c-critico-bg)] px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1E3A8A, #1E40AF)' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
