-- Controle de Entregas — esquema do banco
--
-- COMO USAR: Supabase > SQL Editor > New query > cole este arquivo inteiro > Run.
-- Pode rodar mais de uma vez sem quebrar nada (é idempotente).
--
-- ANTES DISSO, ligue o login anônimo:
--   Authentication > Sign In / Providers > Anonymous sign-ins > Enable
-- Sem isso o app não consegue criar a conta automática do aparelho e a
-- sincronização simplesmente não liga (o app continua funcionando offline).


-- ---------------------------------------------------------------------------
-- Lançamentos
-- ---------------------------------------------------------------------------
-- A chave primária é (user_id, id): o id vem do aparelho (timestamp + aleatório)
-- e é único dentro da conta. É isso que permite o upsert idempotente — mandar o
-- mesmo lançamento duas vezes não duplica.
create table if not exists public.lancamentos (
  user_id       uuid          not null references auth.users(id) on delete cascade,
  id            text          not null,
  tipo          text          not null check (tipo in ('entrada','saida')),
  valor         numeric(12,2) not null check (valor > 0),
  descricao     text          not null default '',
  data          date          not null,
  hora          text          not null default '00:00',
  -- Exclusão "macia": a linha nunca some, só é marcada. Sem isso, apagar um
  -- lançamento num aparelho não teria como se propagar pros outros.
  excluido      boolean       not null default false,
  -- Carimbo de quem escreveu por último. É o critério de desempate do sync.
  atualizado_em timestamptz   not null default now(),
  criado_em     timestamptz   not null default now(),
  primary key (user_id, id)
);

-- O sync sempre pergunta "o que mudou depois de X?" — este índice serve exatamente
-- essa consulta.
create index if not exists lancamentos_user_atualizado_idx
  on public.lancamentos (user_id, atualizado_em);


-- ---------------------------------------------------------------------------
-- Dispositivos
-- ---------------------------------------------------------------------------
-- Como cada aparelho vira uma conta anônima, esta tabela é o que permite
-- descobrir, no painel, qual user_id é o celular de quem.
create table if not exists public.dispositivos (
  user_id   uuid        primary key references auth.users(id) on delete cascade,
  agente    text        not null default '',
  apelido   text        not null default '',
  criado_em timestamptz not null default now(),
  visto_em  timestamptz not null default now()
);


-- ---------------------------------------------------------------------------
-- RLS — sem isto, a chave pública do app daria acesso a TUDO
-- ---------------------------------------------------------------------------
-- A anon/publishable key fica visível no código do site (é assim em qualquer app
-- Supabase). Quem realmente protege os dados são estas políticas: elas exigem
-- estar autenticado e só liberam as linhas do próprio usuário.
alter table public.lancamentos  enable row level security;
alter table public.dispositivos enable row level security;

drop policy if exists "lancamentos: ler os proprios"     on public.lancamentos;
drop policy if exists "lancamentos: inserir os proprios" on public.lancamentos;
drop policy if exists "lancamentos: alterar os proprios" on public.lancamentos;

create policy "lancamentos: ler os proprios"
  on public.lancamentos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "lancamentos: inserir os proprios"
  on public.lancamentos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "lancamentos: alterar os proprios"
  on public.lancamentos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Repare: NÃO existe política de DELETE, de propósito. Ninguém apaga linha de
-- verdade — nem o app, nem um cliente adulterado. O histórico é imortal, e é
-- isso que garante que nada se perca.

drop policy if exists "dispositivos: ler o proprio"     on public.dispositivos;
drop policy if exists "dispositivos: inserir o proprio" on public.dispositivos;
drop policy if exists "dispositivos: alterar o proprio" on public.dispositivos;

create policy "dispositivos: ler o proprio"
  on public.dispositivos for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dispositivos: inserir o proprio"
  on public.dispositivos for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "dispositivos: alterar o proprio"
  on public.dispositivos for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- Consultas úteis pro painel (SQL Editor)
-- ---------------------------------------------------------------------------

-- 1) Quais aparelhos existem e quando cada um apareceu por último:
--
-- select d.user_id, d.agente, d.criado_em, d.visto_em,
--        (select count(*) from public.lancamentos l
--          where l.user_id = d.user_id and not l.excluido) as lancamentos
--   from public.dispositivos d
--  order by d.visto_em desc;

-- 2) Resumo por mês do aparelho (troque o user_id pelo que achou acima):
--
-- select to_char(data, 'YYYY-MM') as mes,
--        sum(valor) filter (where tipo = 'entrada') as entrou,
--        sum(valor) filter (where tipo = 'saida')   as saiu,
--        sum(valor) filter (where tipo = 'entrada')
--          - coalesce(sum(valor) filter (where tipo = 'saida'), 0) as saldo,
--        count(distinct data) filter (where tipo = 'entrada') as dias_trabalhados
--   from public.lancamentos
--  where user_id = 'COLE-O-USER-ID-AQUI' and not excluido
--  group by 1
--  order by 1 desc;

-- 3) De onde veio o dinheiro no mês:
--
-- select descricao, sum(valor) as total
--   from public.lancamentos
--  where user_id = 'COLE-O-USER-ID-AQUI'
--    and not excluido and tipo = 'entrada'
--    and data >= date_trunc('month', current_date)
--  group by 1
--  order by 2 desc;
