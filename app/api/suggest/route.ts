import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gerarExplicacaoSugestao, gerarResumoBatch } from '@/lib/claude/suggest'
import type { DadosSugestaoIA } from '@/lib/claude/suggest'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { tipo, dados } = body

  try {
    if (tipo === 'individual') {
      const explicacao = await gerarExplicacaoSugestao(dados as DadosSugestaoIA)
      return NextResponse.json({ explicacao })
    }

    if (tipo === 'lote') {
      const resumo = await gerarResumoBatch(dados)
      return NextResponse.json({ resumo })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    console.error('Erro na API de sugestão:', error)
    return NextResponse.json({ error: 'Erro ao gerar análise' }, { status: 500 })
  }
}
