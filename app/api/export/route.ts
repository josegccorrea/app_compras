import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { formato, dados, nomeArquivo } = body

  if (!formato || !dados) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios ausentes' }, { status: 400 })
  }

  try {
    if (formato === 'xlsx') {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(dados)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados')

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${nomeArquivo ?? 'exportacao'}.xlsx"`,
        },
      })
    }

    if (formato === 'csv') {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(dados)
      const csv = XLSX.utils.sheet_to_csv(worksheet)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${nomeArquivo ?? 'exportacao'}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: 'Formato não suportado' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar exportação' }, { status: 500 })
  }
}
