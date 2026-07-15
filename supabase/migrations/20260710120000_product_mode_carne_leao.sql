alter table if exists public.clientes_clinica
  add column if not exists product_mode text not null default 'full';

alter table if exists public.clientes_clinica
  add constraint clientes_clinica_product_mode_check
  check (product_mode in ('full', 'financeiro')) not valid;

alter table if exists public.clientes_clinica
  validate constraint clientes_clinica_product_mode_check;

alter table if exists public.financeiro_clinica
  add column if not exists fiscal_document_type text not null default 'nenhum',
  add column if not exists fiscal_document_number text,
  add column if not exists fiscal_document_date date,
  add column if not exists is_deductible boolean not null default false,
  add column if not exists deductible_category_id text,
  add column if not exists professional_id uuid references public.profissionais_clinica(id) on delete set null,
  add column if not exists supplier_name text,
  add column if not exists supplier_document text,
  add column if not exists tax_entity text not null default 'pessoa_fisica',
  add column if not exists fiscal_attachment_name text,
  add column if not exists fiscal_attachment_url text;

alter table if exists public.financeiro_clinica
  add constraint financeiro_clinica_fiscal_document_type_check
  check (fiscal_document_type in ('nota_fiscal', 'recibo', 'nenhum')) not valid;

alter table if exists public.financeiro_clinica
  validate constraint financeiro_clinica_fiscal_document_type_check;

alter table if exists public.financeiro_clinica
  add constraint financeiro_clinica_tax_entity_check
  check (tax_entity in ('pessoa_fisica', 'pessoa_juridica')) not valid;

alter table if exists public.financeiro_clinica
  validate constraint financeiro_clinica_tax_entity_check;

create table if not exists public.categorias_dedutiveis_clinica (
  id text primary key default gen_random_uuid()::text,
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categorias_dedutiveis_clinica enable row level security;

create policy "categorias_dedutiveis_clinica_public_access"
  on public.categorias_dedutiveis_clinica
  for all
  using (true)
  with check (true);

create index if not exists categorias_dedutiveis_cliente_idx
  on public.categorias_dedutiveis_clinica(cliente_clinica_id);

create table if not exists public.documentos_clinica (
  id uuid primary key default gen_random_uuid(),
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete cascade,
  patient_id text,
  name text not null,
  type text not null default 'outro',
  date date not null default current_date,
  url text,
  status text not null default 'gerado',
  financial_transaction_id text,
  fiscal_document_type text default 'nenhum',
  fiscal_document_number text,
  amount numeric,
  category text,
  created_at timestamptz not null default now()
);

alter table public.documentos_clinica enable row level security;

create policy "documentos_clinica_public_access"
  on public.documentos_clinica
  for all
  using (true)
  with check (true);

create index if not exists documentos_clinica_cliente_patient_idx
  on public.documentos_clinica(cliente_clinica_id, patient_id, date desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fiscal-documents',
  'fiscal-documents',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "fiscal_documents_public_access"
  on storage.objects
  for all
  using (bucket_id = 'fiscal-documents')
  with check (bucket_id = 'fiscal-documents');

alter table if exists public.financeiro_clinica
  add constraint financeiro_clinica_deductible_category_id_fkey
  foreign key (deductible_category_id)
  references public.categorias_dedutiveis_clinica(id)
  on delete set null
  not valid;

alter table if exists public.financeiro_clinica
  validate constraint financeiro_clinica_deductible_category_id_fkey;
