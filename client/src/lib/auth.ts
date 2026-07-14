// Login por senha única do site — protege a tela inicial e o painel de
// sorteio; os jogadores continuam entrando direto por /play/<joinCode>.

import { SERVER_URL } from './socket';

const STORAGE_KEY = 'bingoAuthToken';

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function login(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { ok: boolean; token?: string };
    if (!data.ok || !data.token) return false;
    localStorage.setItem(STORAGE_KEY, data.token);
    return true;
  } catch {
    return false;
  }
}

export async function verifyStoredToken(): Promise<boolean> {
  const token = getStoredToken();
  if (!token) return false;
  try {
    const res = await fetch(`${SERVER_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = (await res.json()) as { ok: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}
