-- ============================================================
-- Colibri Compras — Schema inicial
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ── Tipos enumerados ─────────────────────────────────────────────────────────
create type user_role as enum ('comprador', 'cadastro', 'gerente');
create type tipo_operacao as enum ('loja', 'cd', 'digital', 'cacaumix', 'balaomix');
create type status_produto as enum ('ativo', 'inativo', 'bloqueado');
create type status_fornecedor as enum ('ativo', 'inativo');
create type tipo_produto_fornecedor as enum ('padrao', 'alternativo');
create type tema_importacao as enum ('vendas', 'estoque', 'nf_entrada', 'produtos', 'fornecedores', 'classificacoes', 'parametros');
create type status_importacao as enum ('pendente', 'processando', 'sucesso', 'falha');
create type status_pedido as enum ('rascunho', 'em_analise', 'aprovado', 'enviado_fornecedor', 'faturado', 'entregue', 'encerrado');
create type tipo_tarefa as enum ('fornecedor', 'loja', 'cadastral');
create type prioridade_tarefa as enum ('baixa', 'media', 'alta', 'critica');

-- ── Perfis de usuário ────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text not null,
  role user_role not null default 'comprador',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para criar profile automaticamente ao registrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Operações (lojas, CD, canais) ────────────────────────────────────────────
create table operacoes (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique,
  nome text not null,
  tipo tipo_operacao not null,
  ativo boolean not null default true
);

-- Seed de operações do Grupo Colibri
insert into operacoes (codigo, nome, tipo) values
  ('CD',    'Centro de Distribuição', 'cd'),
  ('Cacho', 'Cachoeiro',              'loja'),
  ('LAR',   'Laranjeiras',            'loja'),
  ('MAR',   'Marataízes',             'loja'),
  ('VIX',   'Reta da Penha',          'loja'),
  ('GLO',   'Glória',                 'loja'),
  ('GUA',   'Guarapari',              'loja'),
  ('CG',    'Campo Grande',           'loja'),
  ('DIG',   'Digital',                'digital'),
  ('CMX',   'CacauMix',               'cacaumix'),
  ('BMX',   'BalãoMix',               'balaomix');

-- ── Hierarquia de classificação ──────────────────────────────────────────────
create table familias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  cobertura_alvo_semanas numeric(5,2) not null default 4,
  cobertura_minima_semanas numeric(5,2) not null default 2
);

create table departamentos (
  id uuid primary key default uuid_generate_v4(),
  familia_id uuid not null references familias on delete cascade,
  nome text not null,
  unique(familia_id, nome)
);

create table secoes (
  id uuid primary key default uuid_generate_v4(),
  departamento_id uuid not null references departamentos on delete cascade,
  nome text not null,
  unique(departamento_id, nome)
);

-- ── Fornecedores ─────────────────────────────────────────────────────────────
create table fornecedores (
  id uuid primary key default uuid_generate_v4(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  prazo_entrega_dias integer,
  habilitado_cd boolean not null default false,
  habilitado_loja boolean not null default true,
  condicao_pagamento text,
  nome_vendedor text,
  comprador_id uuid references profiles,
  observacoes_comerciais text,
  politica_comercial text,
  status status_fornecedor not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fornecedor_contatos (
  id uuid primary key default uuid_generate_v4(),
  fornecedor_id uuid not null references fornecedores on delete cascade,
  papel text not null,
  nome text not null,
  telefone text,
  email text
);

-- ── Produtos ─────────────────────────────────────────────────────────────────
create table produtos (
  id uuid primary key default uuid_generate_v4(),
  codigo_interno text not null unique,
  descricao text not null,
  codigo_barras text,
  unidade_compra text not null default 'UN',
  unidade_venda text not null default 'UN',
  fator_conversao numeric(10,4) not null default 1,
  sku_pai_id uuid references produtos,
  fracionamento numeric(10,4),
  fornecedor_padrao_id uuid references fornecedores,
  familia_id uuid references familias,
  departamento_id uuid references departamentos,
  secao_id uuid references secoes,
  status status_produto not null default 'ativo',
  sazonal boolean not null default false,
  aposta boolean not null default false,
  substituido boolean not null default false,
  sku_substituto_id uuid references produtos,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on produtos (codigo_interno);
create index on produtos (descricao);
create index on produtos (fornecedor_padrao_id);
create index on produtos (familia_id);

create table produto_fornecedores (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos on delete cascade,
  fornecedor_id uuid not null references fornecedores on delete cascade,
  tipo tipo_produto_fornecedor not null default 'alternativo',
  custo numeric(12,4),
  prazo_entrega_dias integer,
  unique(produto_id, fornecedor_id)
);

-- ── Parâmetros operacionais ──────────────────────────────────────────────────
create table parametros_operacionais (
  id uuid primary key default uuid_generate_v4(),
  familia_id uuid not null unique references familias on delete cascade,
  lead_time_fornecedor_cd integer not null default 7,
  lead_time_fornecedor_loja integer not null default 7,
  lead_time_cd_loja integer not null default 3
);

-- ── Confiabilidade de estoque ────────────────────────────────────────────────
create table estoque_confiabilidade (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos on delete cascade,
  operacao_id uuid not null references operacoes on delete cascade,
  confiavel boolean not null default false,
  definido_por uuid references profiles,
  definido_em timestamptz default now(),
  unique(produto_id, operacao_id)
);

-- ── Importações ──────────────────────────────────────────────────────────────
create table importacoes (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references profiles,
  nome_arquivo text not null,
  tema tema_importacao not null,
  status status_importacao not null default 'pendente',
  motivo_falha text,
  total_linhas integer,
  linhas_validas integer,
  linhas_invalidas integer,
  arquivo_url text,
  mapeamento_colunas jsonb,
  created_at timestamptz not null default now()
);

-- ── Vendas ───────────────────────────────────────────────────────────────────
create table vendas (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos on delete cascade,
  operacao_id uuid not null references operacoes on delete cascade,
  data date not null,
  quantidade numeric(12,4) not null,
  valor numeric(12,2),
  custo numeric(12,4),
  importacao_id uuid references importacoes
);

create index on vendas (produto_id, data);
create index on vendas (operacao_id, data);

-- ── Estoques ─────────────────────────────────────────────────────────────────
create table estoques (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos on delete cascade,
  operacao_id uuid not null references operacoes on delete cascade,
  data date not null,
  quantidade numeric(12,4) not null,
  importacao_id uuid references importacoes
);

create index on estoques (produto_id, operacao_id, data desc);

-- ── NFs de entrada ───────────────────────────────────────────────────────────
create table nf_entradas (
  id uuid primary key default uuid_generate_v4(),
  produto_id uuid not null references produtos on delete cascade,
  operacao_id uuid not null references operacoes on delete cascade,
  fornecedor_id uuid references fornecedores,
  data_entrada date not null,
  quantidade numeric(12,4) not null,
  custo numeric(12,4),
  numero_nf text,
  importacao_id uuid references importacoes
);

create index on nf_entradas (produto_id, operacao_id, data_entrada desc);

-- ── Pedidos ──────────────────────────────────────────────────────────────────
create table pedidos (
  id uuid primary key default uuid_generate_v4(),
  fornecedor_id uuid not null references fornecedores,
  responsavel_id uuid not null references profiles,
  status status_pedido not null default 'rascunho',
  numero_pedido_externo text,
  observacoes text,
  aprovado_por uuid references profiles,
  aprovado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table pedido_itens (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos on delete cascade,
  produto_id uuid not null references produtos,
  operacao_id uuid not null references operacoes,
  quantidade_sugerida numeric(12,4) not null,
  quantidade_confirmada numeric(12,4),
  justificativa text,
  custo numeric(12,4)
);

-- ── Tarefas / Kanban ─────────────────────────────────────────────────────────
create table tarefas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  tipo tipo_tarefa not null default 'cadastral',
  responsavel_id uuid references profiles,
  prazo date,
  prioridade prioridade_tarefa not null default 'media',
  observacao text,
  fornecedor_id uuid references fornecedores,
  produto_id uuid references produtos,
  operacao_id uuid references operacoes,
  status status_pedido not null default 'rascunho',
  recorrente boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Audit logs ───────────────────────────────────────────────────────────────
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  tabela text not null,
  registro_id text not null,
  campo text not null,
  valor_anterior text,
  valor_novo text,
  usuario_id uuid not null references profiles,
  created_at timestamptz not null default now()
);

create index on audit_logs (tabela, registro_id);
create index on audit_logs (usuario_id);

-- ── Visões salvas ────────────────────────────────────────────────────────────
create table visoes_salvas (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references profiles on delete cascade,
  nome text not null,
  filtros jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ── Triggers de updated_at ───────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on profiles
  for each row execute procedure update_updated_at();
create trigger set_updated_at before update on fornecedores
  for each row execute procedure update_updated_at();
create trigger set_updated_at before update on produtos
  for each row execute procedure update_updated_at();
create trigger set_updated_at before update on pedidos
  for each row execute procedure update_updated_at();
create trigger set_updated_at before update on tarefas
  for each row execute procedure update_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table fornecedores enable row level security;
alter table fornecedor_contatos enable row level security;
alter table produtos enable row level security;
alter table produto_fornecedores enable row level security;
alter table familias enable row level security;
alter table departamentos enable row level security;
alter table secoes enable row level security;
alter table parametros_operacionais enable row level security;
alter table estoque_confiabilidade enable row level security;
alter table importacoes enable row level security;
alter table vendas enable row level security;
alter table estoques enable row level security;
alter table nf_entradas enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;
alter table tarefas enable row level security;
alter table audit_logs enable row level security;
alter table visoes_salvas enable row level security;
alter table operacoes enable row level security;

-- Helper function para obter o perfil do usuário autenticado
create or replace function get_my_role()
returns text language sql security definer as $$
  select role::text from public.profiles where id = auth.uid()
$$;

-- Políticas: todos os usuários autenticados leem dados operacionais
create policy "Authenticated users read operacoes" on operacoes for select
  to authenticated using (true);

create policy "Authenticated users read familias" on familias for select
  to authenticated using (true);

create policy "Authenticated users read departamentos" on departamentos for select
  to authenticated using (true);

create policy "Authenticated users read secoes" on secoes for select
  to authenticated using (true);

create policy "Authenticated users read fornecedores" on fornecedores for select
  to authenticated using (true);

create policy "Authenticated users read fornecedor_contatos" on fornecedor_contatos for select
  to authenticated using (true);

create policy "Authenticated users read produtos" on produtos for select
  to authenticated using (true);

create policy "Authenticated users read produto_fornecedores" on produto_fornecedores for select
  to authenticated using (true);

create policy "Authenticated users read parametros" on parametros_operacionais for select
  to authenticated using (true);

create policy "Authenticated users read estoque_confiabilidade" on estoque_confiabilidade for select
  to authenticated using (true);

create policy "Authenticated users read vendas" on vendas for select
  to authenticated using (true);

create policy "Authenticated users read estoques" on estoques for select
  to authenticated using (true);

create policy "Authenticated users read nf_entradas" on nf_entradas for select
  to authenticated using (true);

create policy "Users read own profile" on profiles for select
  to authenticated using (id = auth.uid() or get_my_role() in ('gerente'));

create policy "Users update own profile" on profiles for update
  to authenticated using (id = auth.uid());

-- Cadastro e gerente podem editar cadastros mestres
create policy "Cadastro/Gerente insert fornecedores" on fornecedores for insert
  to authenticated with check (get_my_role() in ('cadastro', 'gerente'));

create policy "Cadastro/Gerente update fornecedores" on fornecedores for update
  to authenticated using (get_my_role() in ('cadastro', 'gerente'));

create policy "Cadastro/Gerente insert produtos" on produtos for insert
  to authenticated with check (get_my_role() in ('cadastro', 'gerente'));

create policy "Cadastro/Gerente update produtos" on produtos for update
  to authenticated using (get_my_role() in ('cadastro', 'gerente'));

-- Gerente define confiabilidade de estoque
create policy "Gerente manage estoque_confiabilidade" on estoque_confiabilidade for all
  to authenticated using (get_my_role() = 'gerente');

-- Pedidos: comprador vê os seus, gerente vê todos
create policy "Users read pedidos" on pedidos for select
  to authenticated using (
    responsavel_id = auth.uid() or get_my_role() = 'gerente'
  );

create policy "Comprador insert pedidos" on pedidos for insert
  to authenticated with check (responsavel_id = auth.uid());

create policy "Comprador update own pedidos" on pedidos for update
  to authenticated using (
    responsavel_id = auth.uid() or get_my_role() = 'gerente'
  );

create policy "Users read pedido_itens" on pedido_itens for select
  to authenticated using (true);

create policy "Users insert pedido_itens" on pedido_itens for insert
  to authenticated with check (true);

create policy "Users update pedido_itens" on pedido_itens for update
  to authenticated using (true);

-- Tarefas: comprador vê as suas, gerente vê todas
create policy "Users read tarefas" on tarefas for select
  to authenticated using (
    responsavel_id = auth.uid() or get_my_role() = 'gerente'
  );

create policy "Users insert tarefas" on tarefas for insert
  to authenticated with check (true);

create policy "Users update tarefas" on tarefas for update
  to authenticated using (
    responsavel_id = auth.uid() or get_my_role() = 'gerente'
  );

-- Importações: usuário vê as suas
create policy "Users read importacoes" on importacoes for select
  to authenticated using (usuario_id = auth.uid() or get_my_role() = 'gerente');

create policy "Users insert importacoes" on importacoes for insert
  to authenticated with check (usuario_id = auth.uid());

create policy "Users update importacoes" on importacoes for update
  to authenticated using (usuario_id = auth.uid());

-- Audit logs: somente leitura para gerente
create policy "Gerente read audit_logs" on audit_logs for select
  to authenticated using (get_my_role() = 'gerente');

create policy "System insert audit_logs" on audit_logs for insert
  to authenticated with check (true);

-- Visões salvas: cada usuário vê as suas
create policy "Users manage visoes_salvas" on visoes_salvas for all
  to authenticated using (usuario_id = auth.uid());

-- Hierarquia: gerente/cadastro podem gerenciar
create policy "Cadastro/Gerente manage familias" on familias for all
  to authenticated using (get_my_role() in ('cadastro', 'gerente'));

create policy "Cadastro/Gerente manage departamentos" on departamentos for all
  to authenticated using (get_my_role() in ('cadastro', 'gerente'));

create policy "Cadastro/Gerente manage secoes" on secoes for all
  to authenticated using (get_my_role() in ('cadastro', 'gerente'));

create policy "Gerente manage parametros" on parametros_operacionais for all
  to authenticated using (get_my_role() = 'gerente');

create policy "Authenticated users read parametros" on parametros_operacionais for select
  to authenticated using (true);
