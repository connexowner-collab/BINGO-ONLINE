// Confirmação de presença (RSVP) do chá de bebê do Anthony — feature separada
// do bingo, mas reaproveita o mesmo servidor/Supabase/deploy. Convidado
// acessa /convite (sem senha do site) e confirma se vai vir; o host acompanha
// os totais em /convite/painel (protegido, mesma senha do /host).

import { z } from 'zod';
import { supabase } from './db/supabase.js';

export const rsvpSubmitSchema = z.object({
  guestName: z.string().min(1).max(120),
  attending: z.boolean(),
  hasCompanions: z.boolean().optional().default(false),
  adultsCount: z.number().int().min(0).max(50).optional().default(0),
  childrenCount: z.number().int().min(0).max(50).optional().default(0),
  companionNames: z.string().max(2000).optional().default(''),
});

export type RsvpSubmitInput = z.infer<typeof rsvpSubmitSchema>;

export type RsvpResponseRow = {
  id: number;
  guestName: string;
  attending: boolean;
  hasCompanions: boolean;
  adultsCount: number;
  childrenCount: number;
  companionNames: string;
  createdAt: number;
};

export type RsvpSummary = {
  confirmedCount: number;
  declinedCount: number;
  totalAdults: number;
  totalChildren: number;
  totalPeopleAttending: number;
};

export async function saveRsvpResponse(input: RsvpSubmitInput): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'PERSISTENCIA_DESATIVADA' };
  const { error } = await supabase.from('rsvp_responses').insert({
    guest_name: input.guestName,
    attending: input.attending,
    has_companions: input.attending ? input.hasCompanions : false,
    adults_count: input.attending && input.hasCompanions ? input.adultsCount : 0,
    children_count: input.attending && input.hasCompanions ? input.childrenCount : 0,
    companion_names: input.attending && input.hasCompanions ? input.companionNames : '',
  });
  if (error) {
    console.error('[supabase] falha ao salvar confirmação de presença:', error.message);
    return { ok: false, error: 'ERRO_AO_SALVAR' };
  }
  return { ok: true };
}

function toRow(r: {
  id: number;
  guest_name: string;
  attending: boolean;
  has_companions: boolean;
  adults_count: number;
  children_count: number;
  companion_names: string | null;
  created_at: string;
}): RsvpResponseRow {
  return {
    id: r.id,
    guestName: r.guest_name,
    attending: r.attending,
    hasCompanions: r.has_companions,
    adultsCount: r.adults_count,
    childrenCount: r.children_count,
    companionNames: r.companion_names ?? '',
    createdAt: new Date(r.created_at).getTime(),
  };
}

export async function listRsvpResponses(): Promise<RsvpResponseRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('rsvp_responses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) {
    console.error('[supabase] falha ao listar confirmações:', error?.message);
    return [];
  }
  return data.map(toRow);
}

export async function getRsvpSummary(): Promise<RsvpSummary> {
  const rows = await listRsvpResponses();
  const confirmed = rows.filter((r) => r.attending);
  const declined = rows.filter((r) => !r.attending);
  const totalAdults = confirmed.reduce((sum, r) => sum + r.adultsCount, 0);
  const totalChildren = confirmed.reduce((sum, r) => sum + r.childrenCount, 0);
  return {
    confirmedCount: confirmed.length,
    declinedCount: declined.length,
    totalAdults,
    totalChildren,
    // Cada confirmado conta como 1 pessoa (ele mesmo) + os acompanhantes dele.
    totalPeopleAttending: confirmed.length + totalAdults + totalChildren,
  };
}
