/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { carregarCatalogo } from '@/lib/engine/catalogo'
import { carregarVendas } from '@/lib/engine/vendas'
import { carregarEstoquesZip } from '@/lib/engine/estoque'
import { processar } from '@/lib/engine/reposicao'

export const maxDuration = 300


export async function POST(request: NextRequest) {
  try {
    // Auth check using anon client first
    const cookieStore = await cookies()
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await anonClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { paths } = await request.json() as { paths: Record<string, string> }
    if (!paths?.catalogo || !paths?.vendas || !paths?.estoques) {
      return NextResponse.json({ error: 'Paths incompletos' }, { status: 400 })
    }

    // Use service role to download files from storage
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    // Download files in parallel
    const [catalogoBuf, vendasBuf, estoquesBuf] = await Promise.all([
      (serviceClient as any).storage.from('uploads').download(paths.catalogo).then(async ({ data, error }: any) => {
        if (error || !data) throw new Error(`Falha ao baixar catálogo: ${error?.message}`)
        return Buffer.from(await data.arrayBuffer())
      }),
      (serviceClient as any).storage.from('uploads').download(paths.vendas).then(async ({ data, error }: any) => {
        if (error || !data) throw new Error(`Falha ao baixar vendas: ${error?.message}`)
        return Buffer.from(await data.arrayBuffer())
      }),
      (serviceClient as any).storage.from('uploads').download(paths.estoques).then(async ({ data, error }: any) => {
        if (error || !data) throw new Error(`Falha ao baixar estoques: ${error?.message}`)
        return Buffer.from(await data.arrayBuffer())
      }),
    ])

    // Parse inputs
    const catalogo = carregarCatalogo(catalogoBuf)
    const { registros: vendasRegs, semanas } = carregarVendas(vendasBuf)
    const { registros: estoquesRegs, lojas: nomesLojas } = await carregarEstoquesZip(estoquesBuf)

    // Separate CD from store stocks
    const estoqueCD = estoquesRegs.filter((r) =>
      r.loja.toLowerCase() === 'cd' ||
      r.loja.toLowerCase().startsWith('cd ') ||
      r.loja.toLowerCase().includes('distribui') ||
      r.loja.toLowerCase().includes('central')
    )
    const estoquesLojas = estoquesRegs.filter((r) => !estoqueCD.includes(r))
    const lojasNomes = nomesLojas.filter((l) =>
      l.toLowerCase() !== 'cd' &&
      !l.toLowerCase().startsWith('cd ') &&
      !l.toLowerCase().includes('distribui') &&
      !l.toLowerCase().includes('central')
    )

    // Most recent semana
    const semanaRecente = [...semanas].sort().at(-1) ?? (() => {
      const d = new Date()
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
      return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
    })()

    // Check for existing upload for same semana
    const { data: existing } = await (serviceClient as any)
      .from('uploads')
      .select('id')
      .eq('user_id', user.id)
      .eq('semana_iso', semanaRecente)
      .single()

    let uploadId: string

    if (existing) {
      uploadId = existing.id
      await (serviceClient as any).from('uploads').update({ status: 'processing' }).eq('id', uploadId)
      await Promise.all([
        (serviceClient as any).from('catalogo').delete().eq('upload_id', uploadId),
        (serviceClient as any).from('vendas').delete().eq('upload_id', uploadId),
        (serviceClient as any).from('estoques').delete().eq('upload_id', uploadId),
        (serviceClient as any).from('sugestoes').delete().eq('upload_id', uploadId),
        (serviceClient as any).from('compras_cd').delete().eq('upload_id', uploadId),
        (serviceClient as any).from('sem_giro_cd').delete().eq('upload_id', uploadId),
      ])
    } else {
      const { data: newUpload, error: uploadError } = await (serviceClient as any)
        .from('uploads')
        .insert({ user_id: user.id, semana_iso: semanaRecente, status: 'processing', meta: {} })
        .select('id')
        .single()
      if (uploadError || !newUpload) throw new Error('Erro ao criar upload')
      uploadId = newUpload.id
    }

    // Run processing engine
    const resultado = processar(catalogo, vendasRegs, estoquesLojas, estoqueCD, lojasNomes)

    const BATCH = 2000

    async function batchInsert(table: string, rows: object[]) {
      for (let i = 0; i < rows.length; i += BATCH) {
        const { error } = await (serviceClient as any).from(table).insert(rows.slice(i, i + BATCH))
        if (error) throw new Error(`Erro ao salvar ${table}: ${error.message}`)
      }
    }

    // Build all row arrays
    const catalogoRows = Array.from(catalogo.values()).map((c) => ({
      upload_id: uploadId, codigo: c.codigo, descricao: c.descricao,
      linha: c.linha, tamanho: c.tamanho, cor: c.cor, marca: c.marca, lote_minimo: c.lote_minimo,
    }))

    // Aggregate vendas by (semana, loja, codigo) before saving — avoids duplicates and reduces rows
    const vendasAgg = new Map<string, number>()
    for (const v of vendasRegs) {
      if (!catalogo.has(v.codigo)) continue
      const key = `${v.semana_iso}|${v.loja}|${v.codigo}`
      vendasAgg.set(key, (vendasAgg.get(key) ?? 0) + v.quantidade)
    }
    const vendasRows = Array.from(vendasAgg.entries()).map(([key, quantidade]) => {
      const [semana_iso, loja, codigo] = key.split('|')
      return { upload_id: uploadId, semana_iso, loja, codigo, quantidade }
    })

    const estoquesRows = estoquesRegs
      .filter((e) => catalogo.has(e.codigo))
      .map((e) => ({ upload_id: uploadId, loja: e.loja, codigo: e.codigo, quantidade: e.quantidade, cod_barras: e.cod_barras ?? null, descricao_sistema: e.descricao_sistema ?? null }))

    const sugestoesRows = Object.entries(resultado.lojas).flatMap(([, lojaData]) =>
      lojaData.itens.map((item) => ({
        upload_id: uploadId, loja: item.loja, codigo: item.codigo, cod_barras: item.cod_barras,
        descricao: item.descricao, linha: item.linha, tamanho: item.tamanho, cor: item.cor,
        estoque_atual: item.estoque_atual, demanda_semanal: item.demanda_semanal, demanda_diaria: item.demanda_diaria,
        cobertura_dias: item.cobertura_dias, status: item.status, qtd_sugerida: item.qtd_sugerida,
        qtd_disponivel_cd: item.qtd_disponivel_cd, qtd_a_enviar: item.qtd_a_enviar,
        lote_minimo: item.lote_minimo, por_minimo: item.por_minimo,
      }))
    )

    const comprasRows = resultado.compras_cd.map((c) => ({
      upload_id: uploadId, codigo: c.codigo, cod_barras: c.cod_barras, descricao: c.descricao,
      linha: c.linha, tamanho: c.tamanho, cor: c.cor, estoque_cd: c.estoque_cd,
      demanda_total_semanal: c.demanda_total_semanal, cobertura_cd_dias: c.cobertura_cd_dias,
      qtd_comprar: c.qtd_comprar, lote_minimo: c.lote_minimo, status_cd: c.status_cd,
      prazos_pagamento: c.prazos_pagamento,
    }))

    const semGiroRows = resultado.sem_giro_cd.map((s) => ({
      upload_id: uploadId, codigo: s.codigo, cod_barras: s.cod_barras, descricao: s.descricao,
      linha: s.linha, tamanho: s.tamanho, cor: s.cor, estoque_cd: s.estoque_cd,
      ultima_venda_semana: s.ultima_venda_semana,
    }))

    // Wave 1: independent tables in parallel
    await Promise.all([
      batchInsert('catalogo', catalogoRows),
      batchInsert('vendas', vendasRows),
      batchInsert('estoques', estoquesRows),
    ])

    // Wave 2: depends on wave 1 being committed (foreign keys OK)
    await Promise.all([
      batchInsert('sugestoes', sugestoesRows),
      comprasRows.length > 0 ? batchInsert('compras_cd', comprasRows) : Promise.resolve(),
      semGiroRows.length > 0 ? batchInsert('sem_giro_cd', semGiroRows) : Promise.resolve(),
    ])

    // Mark done
    await (serviceClient as any).from('uploads').update({ status: 'done', meta: resultado.meta }).eq('id', uploadId)

    return NextResponse.json({ success: true, upload_id: uploadId, semana_iso: semanaRecente, resumo: resultado.resumo_geral })
  } catch (e: unknown) {
    console.error('[processar]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro interno' }, { status: 500 })
  }
}
