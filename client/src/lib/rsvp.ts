// Chamadas REST da confirmação de presença (RSVP) do chá de bebê — feature
// separada do bingo, mesmo servidor.

import { SERVER_URL } from './socket';
import { getStoredToken } from './auth';

export type RsvpSubmitInput = {
  guestName: string;
  attending: boolean;
  hasCompanions?: boolean;
  adultsCount?: number;
  childrenCount?: number;
  companionNames?: string;
};

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

export async function submitRsvp(input: RsvpSubmitInput): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as { ok: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchRsvpSummary(): Promise<RsvpSummary | null> {
  try {
    const res = await fetch(`${SERVER_URL}/rsvp/summary`, { headers: authHeaders() });
    const data = (await res.json()) as { ok: boolean; summary?: RsvpSummary };
    return data.ok && data.summary ? data.summary : null;
  } catch {
    return null;
  }
}

export async function fetchRsvpList(): Promise<RsvpResponseRow[]> {
  try {
    const res = await fetch(`${SERVER_URL}/rsvp/list`, { headers: authHeaders() });
    const data = (await res.json()) as { ok: boolean; responses?: RsvpResponseRow[] };
    return data.ok && data.responses ? data.responses : [];
  } catch {
    return [];
  }
}
