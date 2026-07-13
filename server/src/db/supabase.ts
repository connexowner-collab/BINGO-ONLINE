// Cliente Supabase (substitui o SQLite do spec original — ver decisão de
// arquitetura: client no Vercel, servidor Socket.IO fora da Vercel, Postgres
// gerenciado pela Supabase). Persistência é best-effort: se as variáveis de
// ambiente não estiverem configuradas, o servidor continua funcionando
// inteiramente em memória, só sem recuperação após restart.

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

export const persistenceEnabled = supabase !== null;

if (!persistenceEnabled) {
  console.warn(
    '[supabase] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados — rodando sem persistência (sem recuperação após restart).',
  );
}
