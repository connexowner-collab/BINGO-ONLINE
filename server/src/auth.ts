// Login por senha única do site (seção "particular"): protege a tela inicial
// e o painel de sorteio (/host) atrás de uma senha compartilhada — os
// jogadores continuam entrando direto pelo QR code em /play/<joinCode>, sem
// precisar da senha. Isso é uma barreira de privacidade (impedir que quem
// não foi convidado encontre o site), não a mesma coisa que a credencial de
// host por sala (ver roomManager.hostSecret), que continua protegendo o
// controle do jogo em si mesmo se essa senha vazar.

import { createHmac, timingSafeEqual } from 'node:crypto';

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? 'bingo-dev';
const SESSION_SECRET = process.env.SESSION_SECRET ?? SITE_PASSWORD;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function sign(expiresAt: number): string {
  return createHmac('sha256', SESSION_SECRET).update(String(expiresAt)).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, SITE_PASSWORD);
}

export function issueToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return { token: `${expiresAt}.${sign(expiresAt)}`, expiresAt };
}

export function verifyToken(token: string): boolean {
  const [expiresAtRaw, signature] = token.split('.');
  if (!expiresAtRaw || !signature) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  return safeEqual(signature, sign(expiresAt));
}
