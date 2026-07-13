// Persistência da sala (seção 9.3: recuperação após restart; seção 10: log
// de auditoria das bolas). Toda escrita é best-effort — uma falha aqui nunca
// derruba o jogo, que continua rodando 100% em memória de qualquer forma.

import { randomInt } from 'node:crypto';
import { supabase } from './supabase.js';
import type { Ball, Card, Room } from '../types.js';

function logFailure(action: string, error: { message: string } | null): void {
  if (error) console.error(`[supabase] falha ao ${action}:`, error.message);
}

export async function saveRoomSnapshot(room: Room): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('rooms').upsert({
    room_id: room.roomId,
    join_code: room.joinCode,
    status: room.status,
    settings: room.settings,
    phases: room.phases,
    current_phase_id: room.currentPhaseId,
    updated_at: new Date().toISOString(),
  });
  logFailure('salvar sala', error);
}

export async function saveCard(card: Card): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('cards').upsert({
    card_id: card.cardId,
    room_id: card.roomId,
    player_id: card.playerId,
    player_name: card.playerName,
    display_number: card.displayNumber,
    grid: card.grid,
    hash: card.hash,
    created_at: new Date(card.createdAt).toISOString(),
  });
  logFailure('salvar cartela', error);
}

export async function saveBallDraw(roomId: string, ball: Ball): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('ball_draws').insert({
    room_id: roomId,
    number: ball.number,
    letter: ball.letter,
    sequence: ball.sequence,
    drawn_at: new Date(ball.drawnAt).toISOString(),
  });
  logFailure('salvar bola sorteada', error);
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export type RestoredRoom = { room: Room; cards: Card[] };

/**
 * Carrega salas não finalizadas para restaurar após um restart. As bolas já
 * sorteadas vêm do log de auditoria; as restantes são re-embaralhadas (a
 * ordem futura nunca é persistida — nem precisa, o que importa é o conjunto).
 */
export async function loadActiveRooms(): Promise<RestoredRoom[]> {
  if (!supabase) return [];

  const { data: roomRows, error: roomsError } = await supabase.from('rooms').select('*').neq('status', 'FINISHED');
  if (roomsError || !roomRows) {
    logFailure('carregar salas ativas', roomsError);
    return [];
  }

  const results: RestoredRoom[] = [];
  for (const row of roomRows) {
    const [{ data: ballRows }, { data: cardRows }] = await Promise.all([
      supabase.from('ball_draws').select('*').eq('room_id', row.room_id).order('sequence', { ascending: true }),
      supabase.from('cards').select('*').eq('room_id', row.room_id),
    ]);

    const drawnBalls: Ball[] = (ballRows ?? []).map((b) => ({
      number: b.number,
      letter: b.letter,
      sequence: b.sequence,
      drawnAt: new Date(b.drawn_at).getTime(),
    }));

    const drawnNumbers = new Set(drawnBalls.map((b) => b.number));
    const remainingBalls = shuffle(Array.from({ length: 75 }, (_, i) => i + 1).filter((n) => !drawnNumbers.has(n)));

    const room: Room = {
      roomId: row.room_id,
      joinCode: row.join_code,
      status: row.status,
      drawnBalls,
      remainingBalls,
      phases: row.phases,
      currentPhaseId: row.current_phase_id,
      settings: row.settings,
      createdAt: new Date(row.created_at).getTime(),
    };

    const cards: Card[] = (cardRows ?? []).map((c) => ({
      cardId: c.card_id,
      roomId: c.room_id,
      playerId: c.player_id,
      playerName: c.player_name,
      displayNumber: c.display_number,
      grid: c.grid,
      hash: c.hash,
      createdAt: new Date(c.created_at).getTime(),
    }));

    results.push({ room, cards });
  }
  return results;
}
