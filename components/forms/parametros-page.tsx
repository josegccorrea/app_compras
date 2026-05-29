'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Save, Settings } from 'lucide-react'

interface ParametrosPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  familiasIniciais: any[]
}

export function ParametrosPage({ familiasIniciais }: ParametrosPageProps) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [familias, setFamilias] = useState<any[]>(familiasIniciais)
  const [saving, setSaving] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function salvarParametros(familia: any, parametros: any, params: any) {
    setSaving(familia.id)

    if (parametros) {
      const { error } = await supabase
        .from('parametros_operacionais')
        .update(params)
        .eq('id', parametros.id)
      if (error) { toast.error(error.message); setSaving(null); return }
    } else {
      const { error } = await supabase
        .from('parametros_operacionais')
        .insert({ familia_id: familia.id, ...params })
      if (error) { toast.error(error.message); setSaving(null); return }
    }

    // Também atualiza coberturas na família
    await supabase
      .from('familias')
      .update({
        cobertura_alvo_semanas: parseFloat(params.cobertura_alvo),
        cobertura_minima_semanas: parseFloat(params.cobertura_minima),
      })
      .eq('id', familia.id)

    toast.success(`Parâmetros de ${familia.nome} salvos!`)
    setSaving(null)

    const { data } = await supabase
      .from('familias')
      .select('id, nome, cobertura_alvo_semanas, cobertura_minima_semanas, parametros_operacionais(id, lead_time_fornecedor_cd, lead_time_fornecedor_loja, lead_time_cd_loja)')
      .order('nome')
    setFamilias(data ?? [])
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Parâmetros Operacionais</h2>
        <p className="text-sm text-muted-foreground">Configure cobertura alvo, mínima e lead times por família.</p>
      </div>

      {familias.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Cadastre famílias antes de configurar parâmetros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {familias.map((familia) => {
            const parametros = familia.parametros_operacionais?.[0] ?? null
            return (
              <FamiliaParametros
                key={familia.id}
                familia={familia}
                parametros={parametros}
                onSalvar={(params) => salvarParametros(familia, parametros, params)}
                saving={saving === familia.id}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

interface FamiliaParametrosProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  familia: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parametros: any
  onSalvar: (params: Record<string, number | string>) => void
  saving: boolean
}

function FamiliaParametros({ familia, parametros, onSalvar, saving }: FamiliaParametrosProps) {
  const [coberturaAlvo, setCoberturaAlvo] = useState(String(familia.cobertura_alvo_semanas ?? 4))
  const [coberturaMinima, setCoberturaMinima] = useState(String(familia.cobertura_minima_semanas ?? 2))
  const [ltFornecedorCD, setLtFornecedorCD] = useState(String(parametros?.lead_time_fornecedor_cd ?? 7))
  const [ltFornecedorLoja, setLtFornecedorLoja] = useState(String(parametros?.lead_time_fornecedor_loja ?? 7))
  const [ltCDLoja, setLtCDLoja] = useState(String(parametros?.lead_time_cd_loja ?? 3))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{familia.nome}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <Label className="text-xs">Cobertura alvo (sem.)</Label>
            <Input type="number" step="0.5" value={coberturaAlvo} onChange={(e) => setCoberturaAlvo(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Cobertura mínima (sem.)</Label>
            <Input type="number" step="0.5" value={coberturaMinima} onChange={(e) => setCoberturaMinima(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Lead time Forn→CD (dias)</Label>
            <Input type="number" value={ltFornecedorCD} onChange={(e) => setLtFornecedorCD(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Lead time Forn→Loja (dias)</Label>
            <Input type="number" value={ltFornecedorLoja} onChange={(e) => setLtFornecedorLoja(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Lead time CD→Loja (dias)</Label>
            <Input type="number" value={ltCDLoja} onChange={(e) => setLtCDLoja(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
        </div>
        <Button
          size="sm"
          className="mt-3 bg-colibri-600 hover:bg-colibri-700 gap-1"
          disabled={saving}
          onClick={() => onSalvar({
            cobertura_alvo: coberturaAlvo,
            cobertura_minima: coberturaMinima,
            lead_time_fornecedor_cd: parseInt(ltFornecedorCD),
            lead_time_fornecedor_loja: parseInt(ltFornecedorLoja),
            lead_time_cd_loja: parseInt(ltCDLoja),
          })}
        >
          <Save className="h-3 w-3" />
          {saving ? 'Salvando...' : 'Salvar parâmetros'}
        </Button>
      </CardContent>
    </Card>
  )
}
