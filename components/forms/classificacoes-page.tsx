'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ChevronRight, Plus, Tag } from 'lucide-react'

interface ClassificacoesPageProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  familiasIniciais: any[]
}

export function ClassificacoesPage({ familiasIniciais }: ClassificacoesPageProps) {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [familias, setFamilias] = useState<any[]>(familiasIniciais)
  const [dialog, setDialog] = useState<'familia' | 'departamento' | 'secao' | null>(null)
  const [nome, setNome] = useState('')
  const [coberturaAlvo, setCoberturaAlvo] = useState('4')
  const [coberturaMinima, setCoberturaMinima] = useState('2')
  const [selectedFamilia, setSelectedFamilia] = useState('')
  const [selectedDepartamento, setSelectedDepartamento] = useState('')
  const [saving, setSaving] = useState(false)

  async function recarregar() {
    const { data } = await supabase
      .from('familias')
      .select('id, nome, cobertura_alvo_semanas, cobertura_minima_semanas, departamentos(id, nome, secoes(id, nome))')
      .order('nome')
    setFamilias(data ?? [])
  }

  async function criarFamilia() {
    setSaving(true)
    const { error } = await supabase.from('familias').insert({
      nome,
      cobertura_alvo_semanas: parseFloat(coberturaAlvo),
      cobertura_minima_semanas: parseFloat(coberturaMinima),
    })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Família criada!')
    setDialog(null); setNome(''); recarregar()
  }

  async function criarDepartamento() {
    if (!selectedFamilia) return
    setSaving(true)
    const { error } = await supabase.from('departamentos').insert({ familia_id: selectedFamilia, nome })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Departamento criado!')
    setDialog(null); setNome(''); recarregar()
  }

  async function criarSecao() {
    if (!selectedDepartamento) return
    setSaving(true)
    const { error } = await supabase.from('secoes').insert({ departamento_id: selectedDepartamento, nome })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Seção criada!')
    setDialog(null); setNome(''); recarregar()
  }

  const familiaAtual = familias.find((f: { id: string }) => f.id === selectedFamilia)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Classificações</h2>
          <p className="text-sm text-muted-foreground">Hierarquia: Família → Departamento → Seção</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialog('secao')} className="gap-1">
            <Plus className="h-3 w-3" /> Seção
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDialog('departamento')} className="gap-1">
            <Plus className="h-3 w-3" /> Departamento
          </Button>
          <Button size="sm" onClick={() => setDialog('familia')} className="bg-colibri-600 hover:bg-colibri-700 gap-1">
            <Plus className="h-3 w-3" /> Família
          </Button>
        </div>
      </div>

      {familias.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhuma classificação cadastrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {familias.map((familia: { id: string; nome: string; cobertura_alvo_semanas: number; cobertura_minima_semanas: number; departamentos: { id: string; nome: string; secoes: { id: string; nome: string }[] }[] }) => (
            <Card key={familia.id}>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4 text-colibri-600" />
                    {familia.nome}
                  </CardTitle>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Cobertura alvo: <strong>{familia.cobertura_alvo_semanas} sem.</strong></span>
                    <span>Mínima: <strong>{familia.cobertura_minima_semanas} sem.</strong></span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(familia.departamentos ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum departamento cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {familia.departamentos.map((dep: { id: string; nome: string; secoes: { id: string; nome: string }[] }) => (
                      <div key={dep.id}>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <ChevronRight className="h-3 w-3" />
                          {dep.nome}
                        </div>
                        {(dep.secoes ?? []).length > 0 && (
                          <div className="ml-5 flex flex-wrap gap-2 mt-1">
                            {dep.secoes.map((sec: { id: string; nome: string }) => (
                              <span key={sec.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {sec.nome}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Família */}
      <Dialog open={dialog === 'familia'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova família</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cobertura alvo (semanas)</Label><Input type="number" value={coberturaAlvo} onChange={(e) => setCoberturaAlvo(e.target.value)} className="mt-1" /></div>
              <div><Label>Cobertura mínima (semanas)</Label><Input type="number" value={coberturaMinima} onChange={(e) => setCoberturaMinima(e.target.value)} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={criarFamilia} disabled={!nome || saving} className="bg-colibri-600 hover:bg-colibri-700">Criar família</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Departamento */}
      <Dialog open={dialog === 'departamento'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo departamento</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Família *</Label>
              <Select onValueChange={setSelectedFamilia}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {familias.map((f: { id: string; nome: string }) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={criarDepartamento} disabled={!nome || !selectedFamilia || saving} className="bg-colibri-600 hover:bg-colibri-700">Criar departamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Seção */}
      <Dialog open={dialog === 'secao'} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova seção</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Família *</Label>
              <Select onValueChange={setSelectedFamilia}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {familias.map((f: { id: string; nome: string }) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Departamento *</Label>
              <Select onValueChange={setSelectedDepartamento} disabled={!selectedFamilia}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(familiaAtual?.departamentos ?? []).map((d: { id: string; nome: string }) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={criarSecao} disabled={!nome || !selectedDepartamento || saving} className="bg-colibri-600 hover:bg-colibri-700">Criar seção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
