# Colibri Compras

Sistema de gestão de compras do Grupo Colibri. Controla sugestões de reposição, pedidos, transferências, análise de SKU e tarefas do time de compras.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (email + senha) |
| IA | Anthropic Claude (sugestões de compra) |
| UI | Tailwind CSS + Radix UI (shadcn/ui) |
| Drag & drop | @hello-pangea/dnd |
| Gráficos | Recharts |
| Tabelas | TanStack Table |

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- Chave de API da [Anthropic](https://console.anthropic.com)

---

## Configuração local

**1. Clone o repositório**
```bash
git clone <url-do-repositorio>
cd colibri-compras
```

**2. Instale as dependências**
```bash
npm install
```

**3. Configure as variáveis de ambiente**

Crie o arquivo `.env.local` na raiz com:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ANTHROPIC_API_KEY=<sua-chave-anthropic>
```

As chaves do Supabase estão em **Project Settings → API** no dashboard.

**4. Aplique o schema no banco**

No SQL Editor do Supabase, execute o conteúdo de:
```
supabase/migrations/001_initial_schema.sql
```

**5. Suba o servidor**
```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Módulos do sistema

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Dashboard | `/dashboard` | Visão geral por perfil de usuário |
| Análise de SKU | `/sku` | Análise individual de produto com sugestão de compra via IA |
| Análise em Lote | `/analise-lote` | Análise de múltiplos SKUs de uma vez |
| Sugestão de Compra | `/compras` | Lista de sugestões geradas pelo sistema |
| Transferências | `/transferencias` | Transferências entre CD e lojas |
| Pedidos | `/pedidos` | Criação e acompanhamento de pedidos |
| Tarefas | `/tarefas` | Kanban do time de compras |
| Produtos | `/cadastros/produtos` | Cadastro de produtos e SKUs |
| Fornecedores | `/cadastros/fornecedores` | Cadastro de fornecedores |
| Classificações | `/cadastros/classificacoes` | Famílias e departamentos |
| Parâmetros | `/cadastros/parametros` | Configurações de cobertura e estoque |
| Importação | `/importacao` | Upload de planilhas (vendas, estoque, NF, etc.) |
| Relatórios | `/relatorios` | Relatórios consolidados (acesso gerente) |

---

## Perfis de usuário

| Perfil | Acesso |
|--------|--------|
| `comprador` | Seus próprios pedidos e tarefas, análise de SKU |
| `cadastro` | Cadastros de produtos, fornecedores e classificações |
| `gerente` | Acesso completo + relatórios e aprovações |

O perfil padrão ao criar uma conta é `comprador`. Um gerente pode alterar o perfil de outros usuários diretamente no banco via Supabase Dashboard.

---

## Autenticação

- Login: `/login`
- Cadastro: `/cadastro`
- Recuperação de senha: `/esqueci-senha` → e-mail com link → `/reset-senha`

O sistema aceita acesso sem login — visitantes entram automaticamente como gerente (somente leitura do banco, sem sessão ativa).

---

## Estrutura de pastas

```
app/
  (app)/          # Páginas protegidas (dashboard, pedidos, etc.)
  (auth)/         # Páginas de autenticação (login, cadastro, etc.)
  auth/callback/  # Handler do fluxo PKCE do Supabase
  api/            # Routes de API (export, import, sugestão IA)

components/
  dashboard/      # Cards e painéis do dashboard
  forms/          # Formulários de cadastro e pedidos
  kanban/         # Board de tarefas
  layout/         # Sidebar, Header, AppShell
  sku/            # Análise de SKU e sugestão
  ui/             # Componentes base (shadcn/ui)

lib/
  supabase/       # Clientes server e client do Supabase
  business/       # Lógica de negócio (demanda, sugestão)
  claude/         # Integração com a API da Anthropic

supabase/
  migrations/     # SQL do schema completo do banco

types/
  app.ts          # Tipos da aplicação
  database.ts     # Tipos gerados do schema do Supabase
```

---

## Importação de dados

O módulo de importação aceita planilhas `.xlsx` ou `.csv` nos seguintes formatos:

| Tema | Dados esperados |
|------|----------------|
| `vendas` | Histórico de vendas por loja e SKU |
| `estoque` | Posição de estoque atual |
| `nf_entrada` | Notas fiscais de entrada |
| `produtos` | Cadastro de produtos |
| `fornecedores` | Cadastro de fornecedores |
| `classificacoes` | Famílias e departamentos |
| `parametros` | Parâmetros de cobertura |

---

## Scripts disponíveis

```bash
npm run dev      # Desenvolvimento (porta 3000)
npm run build    # Build de produção
npm run start    # Inicia build de produção
npm run lint     # Lint TypeScript/ESLint
```

---

## Deploy

O projeto está pronto para deploy na [Vercel](https://vercel.com). Basta conectar o repositório e configurar as mesmas variáveis de ambiente do `.env.local` nas configurações do projeto na Vercel.
