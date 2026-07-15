create table if not exists public.prontuarios_clinica (
  id uuid primary key,
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete cascade,
  patient_id uuid not null references public.pacientes_clinica(id) on delete cascade,
  professional_id uuid references public.profissionais_clinica(id) on delete set null,
  appointment_id uuid references public.agendamentos_clinica(id) on delete set null,
  date timestamptz not null,
  content text not null,
  type text not null check (type in ('evolução', 'avaliação', 'prescrição', 'exame')),
  converted_from_note_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rascunhos_medicos_clinica (
  id uuid primary key,
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete cascade,
  patient_id uuid references public.pacientes_clinica(id) on delete set null,
  professional_id uuid references public.profissionais_clinica(id) on delete set null,
  title text not null,
  content text not null,
  is_draft boolean not null default true,
  converted_to_record_id uuid references public.prontuarios_clinica(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fotos_antes_depois_clinica (
  id uuid primary key,
  cliente_clinica_id uuid not null references public.clientes_clinica(id) on delete cascade,
  patient_id uuid not null references public.pacientes_clinica(id) on delete cascade,
  professional_id uuid references public.profissionais_clinica(id) on delete set null,
  procedure_name text not null,
  date date not null,
  before_photo_path text not null,
  after_photo_path text not null,
  before_photo_url text,
  after_photo_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_prontuarios_cliente_patient_date
  on public.prontuarios_clinica(cliente_clinica_id, patient_id, date desc);

create index if not exists idx_rascunhos_cliente_patient_created
  on public.rascunhos_medicos_clinica(cliente_clinica_id, patient_id, created_at desc);

create index if not exists idx_fotos_cliente_patient_date
  on public.fotos_antes_depois_clinica(cliente_clinica_id, patient_id, date desc);

alter table public.prontuarios_clinica enable row level security;
alter table public.rascunhos_medicos_clinica enable row level security;
alter table public.fotos_antes_depois_clinica enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinical-photos',
  'clinical-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies are intentionally not opened here. The current app uses a custom
-- clientes_clinica login, while strict Supabase RLS needs an auth claim or
-- server-side mediation to scope rows by cliente_clinica_id. Apply production
-- policies only after choosing that access model.
