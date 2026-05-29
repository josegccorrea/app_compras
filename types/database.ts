export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'comprador' | 'cadastro' | 'gerente'
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role: 'comprador' | 'cadastro' | 'gerente'
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      operacoes: {
        Row: {
          id: string
          codigo: string
          nome: string
          tipo: 'loja' | 'cd' | 'digital' | 'cacaumix' | 'balaomix'
          ativo: boolean
        }
        Insert: Omit<Database['public']['Tables']['operacoes']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['operacoes']['Insert']>
      }
      familias: {
        Row: {
          id: string
          nome: string
          cobertura_alvo_semanas: number
          cobertura_minima_semanas: number
        }
        Insert: Omit<Database['public']['Tables']['familias']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['familias']['Insert']>
      }
      departamentos: {
        Row: {
          id: string
          familia_id: string
          nome: string
        }
        Insert: Omit<Database['public']['Tables']['departamentos']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['departamentos']['Insert']>
      }
      secoes: {
        Row: {
          id: string
          departamento_id: string
          nome: string
        }
        Insert: Omit<Database['public']['Tables']['secoes']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['secoes']['Insert']>
      }
      fornecedores: {
        Row: {
          id: string
          razao_social: string
          nome_fantasia: string | null
          cnpj: string | null
          prazo_entrega_dias: number | null
          habilitado_cd: boolean
          habilitado_loja: boolean
          condicao_pagamento: string | null
          nome_vendedor: string | null
          comprador_id: string | null
          observacoes_comerciais: string | null
          politica_comercial: string | null
          status: 'ativo' | 'inativo'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['fornecedores']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['fornecedores']['Insert']>
      }
      fornecedor_contatos: {
        Row: {
          id: string
          fornecedor_id: string
          papel: string
          nome: string
          telefone: string | null
          email: string | null
        }
        Insert: Omit<Database['public']['Tables']['fornecedor_contatos']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['fornecedor_contatos']['Insert']>
      }
      produtos: {
        Row: {
          id: string
          codigo_interno: string
          descricao: string
          codigo_barras: string | null
          unidade_compra: string
          unidade_venda: string
          fator_conversao: number
          sku_pai_id: string | null
          fracionamento: number | null
          fornecedor_padrao_id: string | null
          familia_id: string | null
          departamento_id: string | null
          secao_id: string | null
          status: 'ativo' | 'inativo' | 'bloqueado'
          sazonal: boolean
          aposta: boolean
          substituido: boolean
          sku_substituto_id: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['produtos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['produtos']['Insert']>
      }
      produto_fornecedores: {
        Row: {
          id: string
          produto_id: string
          fornecedor_id: string
          tipo: 'padrao' | 'alternativo'
          custo: number | null
          prazo_entrega_dias: number | null
        }
        Insert: Omit<Database['public']['Tables']['produto_fornecedores']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['produto_fornecedores']['Insert']>
      }
      parametros_operacionais: {
        Row: {
          id: string
          familia_id: string
          lead_time_fornecedor_cd: number
          lead_time_fornecedor_loja: number
          lead_time_cd_loja: number
        }
        Insert: Omit<Database['public']['Tables']['parametros_operacionais']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['parametros_operacionais']['Insert']>
      }
      estoque_confiabilidade: {
        Row: {
          id: string
          produto_id: string
          operacao_id: string
          confiavel: boolean
          definido_por: string | null
          definido_em: string | null
        }
        Insert: Omit<Database['public']['Tables']['estoque_confiabilidade']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['estoque_confiabilidade']['Insert']>
      }
      importacoes: {
        Row: {
          id: string
          usuario_id: string
          nome_arquivo: string
          tema: 'vendas' | 'estoque' | 'nf_entrada' | 'produtos' | 'fornecedores' | 'classificacoes' | 'parametros'
          status: 'pendente' | 'processando' | 'sucesso' | 'falha'
          motivo_falha: string | null
          total_linhas: number | null
          linhas_validas: number | null
          linhas_invalidas: number | null
          arquivo_url: string | null
          mapeamento_colunas: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['importacoes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['importacoes']['Insert']>
      }
      vendas: {
        Row: {
          id: string
          produto_id: string
          operacao_id: string
          data: string
          quantidade: number
          valor: number | null
          custo: number | null
          importacao_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['vendas']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['vendas']['Insert']>
      }
      estoques: {
        Row: {
          id: string
          produto_id: string
          operacao_id: string
          data: string
          quantidade: number
          importacao_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['estoques']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['estoques']['Insert']>
      }
      nf_entradas: {
        Row: {
          id: string
          produto_id: string
          operacao_id: string
          fornecedor_id: string | null
          data_entrada: string
          quantidade: number
          custo: number | null
          numero_nf: string | null
          importacao_id: string | null
        }
        Insert: Omit<Database['public']['Tables']['nf_entradas']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['nf_entradas']['Insert']>
      }
      pedidos: {
        Row: {
          id: string
          fornecedor_id: string
          responsavel_id: string
          status: 'rascunho' | 'em_analise' | 'aprovado' | 'enviado_fornecedor' | 'faturado' | 'entregue' | 'encerrado'
          numero_pedido_externo: string | null
          observacoes: string | null
          aprovado_por: string | null
          aprovado_em: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['pedidos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['pedidos']['Insert']>
      }
      pedido_itens: {
        Row: {
          id: string
          pedido_id: string
          produto_id: string
          operacao_id: string
          quantidade_sugerida: number
          quantidade_confirmada: number | null
          justificativa: string | null
          custo: number | null
        }
        Insert: Omit<Database['public']['Tables']['pedido_itens']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['pedido_itens']['Insert']>
      }
      tarefas: {
        Row: {
          id: string
          titulo: string
          tipo: 'fornecedor' | 'loja' | 'cadastral'
          responsavel_id: string | null
          prazo: string | null
          prioridade: 'baixa' | 'media' | 'alta' | 'critica'
          observacao: string | null
          fornecedor_id: string | null
          produto_id: string | null
          operacao_id: string | null
          status: 'rascunho' | 'em_analise' | 'aprovado' | 'enviado_fornecedor' | 'faturado' | 'entregue' | 'encerrado'
          recorrente: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tarefas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tarefas']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          tabela: string
          registro_id: string
          campo: string
          valor_anterior: string | null
          valor_novo: string | null
          usuario_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
      visoes_salvas: {
        Row: {
          id: string
          usuario_id: string
          nome: string
          filtros: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['visoes_salvas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['visoes_salvas']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
