// Nomes dos "rooms" internos do Socket.IO e sanitização do estado público.
// IMPORTANTE: `Room.remainingBalls` é a ordem exata das próximas bolas — nunca
// pode vazar para o cliente, senão qualquer um descobre o futuro do sorteio.

import type { Room } from '../types.js';

export function roomChannel(roomId: string): string {
  return `room:${roomId}`;
}

export function hostChannel(roomId: string): string {
  return `room:${roomId}:host`;
}

export function playerChannel(playerId: string): string {
  return `player:${playerId}`;
}

export type RoomPublicState = Omit<Room, 'remainingBalls'> & { remainingCount: number };

export function toPublicState(room: Room): RoomPublicState {
  const { remainingBalls, ...rest } = room;
  return { ...rest, remainingCount: remainingBalls.length };
}
