create table if not exists public.solicitacoes_redefinicao_senha_clinica (
  id uuid primary key default gen_random_uuid(),
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete cascade,
  password_preference text,
  status text not null default 'pendente' check (status in ('pendente', 'atendido', 'cancelado')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists solicitacoes_redefinicao_senha_pendentes_idx
  on public.solicitacoes_redefinicao_senha_clinica (status, created_at desc);
