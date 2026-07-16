-- Esquema Postgres para persistência do Bingo (seção 9.3 e 10 do spec).
-- Rode este script uma vez no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/_/sql/new).
--
-- Por que manual: a service role key só dá acesso à API REST (PostgREST),
-- não a execução de DDL bruto — criar tabelas exige rodar isto pelo painel
-- (ou fornecer a connection string direta do Postgres).

create table if not exists rooms (
  room_id text primary key,
  join_code text not null,
  status text not null,
  settings jsonb not null,
  phases jsonb not null,
  current_phase_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cards (
  card_id text primary key,
  room_id text not null references rooms(room_id) on delete cascade,
  player_id text not null,
  player_name text not null,
  display_number text not null,
  grid jsonb not null,
  hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists ball_draws (
  id bigint generated always as identity primary key,
  room_id text not null references rooms(room_id) on delete cascade,
  number int not null,
  letter text not null,
  sequence int not null,
  drawn_at timestamptz not null,
  unique (room_id, sequence)
);

create index if not exists ball_draws_room_id_idx on ball_draws(room_id);
create index if not exists cards_room_id_idx on cards(room_id);

-- RLS: a tabela só é acessada pelo servidor via service role key (que ignora
-- RLS por padrão), então mantemos RLS ligado e sem policies para bloquear
-- qualquer acesso via chave pública (anon/publishable) do client.
alter table rooms enable row level security;
alter table cards enable row level security;
alter table ball_draws enable row level security;

-- Confirmação de presença do chá de bebê (feature separada do bingo).
create table if not exists rsvp_responses (
  id bigint generated always as identity primary key,
  guest_name text not null,
  attending boolean not null,
  has_companions boolean not null default false,
  adults_count int not null default 0,
  children_count int not null default 0,
  companion_names text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists rsvp_responses_attending_idx on rsvp_responses(attending);

alter table rsvp_responses enable row level security;
