alter table if exists public.despesas_insumos_clinica
  add column if not exists appointment_id uuid references public.agendamentos_clinica(id) on delete set null,
  add column if not exists service_id uuid references public.servicos_clinica(id) on delete set null,
  add column if not exists patient_id uuid references public.pacientes_clinica(id) on delete set null,
  add column if not exists stock_quantity_delta numeric,
  add column if not exists movement_type text default 'consumo';

alter table if exists public.inventario_clinica
  add column if not exists total_measure numeric,
  add column if not exists consumption_unit text,
  add column if not exists supplier text,
  add column if not exists batch_number text,
  add column if not exists expiration_date date;

alter table if exists public.servicos_clinica
  add column if not exists target_margin_percent numeric;

create index if not exists despesas_insumos_clinica_appointment_idx
  on public.despesas_insumos_clinica(cliente_clinica_id, appointment_id);

create index if not exists inventario_clinica_expiration_idx
  on public.inventario_clinica(cliente_clinica_id, expiration_date);

create table if not exists public.compras_inventario_clinica (
  id uuid primary key,
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete cascade,
  item_id uuid not null references public.inventario_clinica(id) on delete cascade,
  item_name text not null,
  purchase_date date not null,
  supplier text,
  batch_number text,
  invoice_number text,
  expiration_date date,
  quantity numeric not null default 0,
  total_cost numeric not null default 0,
  unit_cost_at_purchase numeric not null default 0,
  stock_quantity_before numeric not null default 0,
  stock_quantity_after numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists compras_inventario_clinica_cliente_date_idx
  on public.compras_inventario_clinica(cliente_clinica_id, purchase_date desc);

create index if not exists compras_inventario_clinica_item_idx
  on public.compras_inventario_clinica(cliente_clinica_id, item_id);
