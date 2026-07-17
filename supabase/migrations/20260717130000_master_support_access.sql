-- Conta master: promova somente uma conta interna já existente.
alter table public.clientes_clinica
  add column if not exists account_role text not null default 'client'
  check (account_role in ('client', 'master'));

create table if not exists public.acessos_suporte_clinica (
  id bigint generated always as identity primary key,
  master_cliente_id uuid not null references public.clientes_clinica(id) on delete restrict,
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete restrict,
  action text not null check (action in ('enter_support_session', 'exit_support_session')),
  created_at timestamptz not null default now()
);

create index if not exists acessos_suporte_clinica_cliente_created_idx
  on public.acessos_suporte_clinica (cliente_clinica_id, created_at desc);

-- Execute uma única vez, substituindo pelo login interno da sua empresa:
-- update public.clientes_clinica set account_role = 'master' where username = 'seu.usuario.master';
