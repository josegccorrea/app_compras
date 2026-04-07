-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Upload sessions
create table uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  semana_iso text not null,
  status text not null default 'processing' check (status in ('processing', 'done', 'error')),
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'
);

-- Product catalog (versioned per upload)
create table catalogo (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid references uploads on delete cascade not null,
  codigo text not null,
  descricao text not null default '',
  linha text not null default '',
  tamanho text not null default '',
  cor text not null default '',
  marca text not null default '',
  lote_minimo int not null default 1,
  unique (upload_id, codigo)
);

-- Weekly sales (accumulated across uploads)
create table vendas (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid references uploads on delete cascade not null,
  semana_iso text not null,
  loja text not null,
  codigo text not null,
  quantidade numeric not null default 0,
  unique (upload_id, semana_iso, loja, codigo)
);

-- Stock snapshots per upload
create table estoques (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid references uploads on delete cascade not null,
  loja text not null,
  codigo text not null,
  quantidade numeric not null default 0,
  cod_barras text,
  descricao_sistema text,
  unique (upload_id, loja, codigo)
);

-- Transfer suggestions CD → Loja
create table sugestoes (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid references uploads on delete cascade not null,
  loja text not null,
  codigo text not null,
  cod_barras text,
  descricao text not null default '',
  linha text not null default '',
  tamanho text not null default '',
  cor text not null default '',
  estoque_atual numeric not null default 0,
  demanda_semanal numeric not null default 0,
  demanda_diaria numeric not null default 0,
  cobertura_dias numeric,
  status text not null check (status in ('CRITICO', 'ALERTA', 'OK', 'EXCESSO')),
  qtd_sugerida int not null default 0,
  qtd_disponivel_cd int not null default 0,
  qtd_a_enviar int not null default 0,
  lote_minimo int not null default 1,
  por_minimo boolean not null default false,
  unique (upload_id, loja, codigo)
);

-- CD purchase orders (Industry → CD)
create table compras_cd (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid references uploads on delete cascade not null,
  codigo text not null,
  cod_barras text,
  descricao text not null default '',
  linha text not null default '',
  tamanho text not null default '',
  cor text not null default '',
  estoque_cd numeric not null default 0,
  demanda_total_semanal numeric not null default 0,
  cobertura_cd_dias numeric,
  qtd_comprar int not null default 0,
  lote_minimo int not null default 1,
  status_cd text not null check (status_cd in ('CRITICO', 'ALERTA')),
  prazos_pagamento jsonb not null default '[]',
  unique (upload_id, codigo)
);

-- Non-moving items in CD
create table sem_giro_cd (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid references uploads on delete cascade not null,
  codigo text not null,
  cod_barras text,
  descricao text not null default '',
  linha text not null default '',
  tamanho text not null default '',
  cor text not null default '',
  estoque_cd numeric not null default 0,
  ultima_venda_semana text,
  unique (upload_id, codigo)
);

-- Indexes for common queries
create index idx_vendas_semana on vendas (semana_iso);
create index idx_vendas_loja on vendas (loja);
create index idx_vendas_codigo on vendas (codigo);
create index idx_vendas_upload on vendas (upload_id);
create index idx_sugestoes_upload on sugestoes (upload_id);
create index idx_sugestoes_status on sugestoes (status);
create index idx_sugestoes_loja on sugestoes (loja);
create index idx_estoques_upload on estoques (upload_id);
create index idx_compras_cd_upload on compras_cd (upload_id);
create index idx_uploads_status on uploads (status);
create index idx_uploads_semana on uploads (semana_iso);

-- Row Level Security
alter table uploads enable row level security;
alter table catalogo enable row level security;
alter table vendas enable row level security;
alter table estoques enable row level security;
alter table sugestoes enable row level security;
alter table compras_cd enable row level security;
alter table sem_giro_cd enable row level security;

-- Policies: authenticated users can read all, write only their own uploads
create policy "Authenticated users can read uploads" on uploads
  for select to authenticated using (true);

create policy "Users can insert own uploads" on uploads
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users can update own uploads" on uploads
  for update to authenticated using (auth.uid() = user_id);

-- Child tables: accessible if parent upload is accessible
create policy "Authenticated read catalogo" on catalogo
  for select to authenticated using (true);
create policy "Authenticated insert catalogo" on catalogo
  for insert to authenticated with check (true);

create policy "Authenticated read vendas" on vendas
  for select to authenticated using (true);
create policy "Authenticated insert vendas" on vendas
  for insert to authenticated with check (true);

create policy "Authenticated read estoques" on estoques
  for select to authenticated using (true);
create policy "Authenticated insert estoques" on estoques
  for insert to authenticated with check (true);

create policy "Authenticated read sugestoes" on sugestoes
  for select to authenticated using (true);
create policy "Authenticated insert sugestoes" on sugestoes
  for insert to authenticated with check (true);

create policy "Authenticated read compras_cd" on compras_cd
  for select to authenticated using (true);
create policy "Authenticated insert compras_cd" on compras_cd
  for insert to authenticated with check (true);

create policy "Authenticated read sem_giro_cd" on sem_giro_cd
  for select to authenticated using (true);
create policy "Authenticated insert sem_giro_cd" on sem_giro_cd
  for insert to authenticated with check (true);
