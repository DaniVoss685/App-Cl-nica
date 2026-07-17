alter table public.acessos_suporte_clinica
  drop constraint if exists acessos_suporte_clinica_action_check;

alter table public.acessos_suporte_clinica
  add constraint acessos_suporte_clinica_action_check
  check (action in ('enter_support_session', 'exit_support_session', 'reset_password'));
