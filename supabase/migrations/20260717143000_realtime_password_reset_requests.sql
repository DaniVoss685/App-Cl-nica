do $$
begin
  alter publication supabase_realtime add table public.solicitacoes_redefinicao_senha_clinica;
exception
  when duplicate_object then null;
end $$;
