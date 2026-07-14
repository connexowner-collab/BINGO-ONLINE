// Registro de salas em memória: mapeia joinCode -> RoomEngine e mantém o
// estado de conexão dos jogadores (não faz parte do RoomEngine porque é
// orquestração de rede, não regra de jogo).

import { timingSafeEqual } from 'node:crypto';
import { nanoid } from 'nanoid';
import { RoomEngine, type PhaseInput } from './game/engine.js';
import type { Player, RoomSettings } from './types.js';

export type PlayerRuntime = {
  player: Player;
  lastHeartbeatAt: number;
};

export type RoomRuntime = {
  engine: RoomEngine;
  players: Map<string, PlayerRuntime>; // playerId -> runtime
  autoDrawTimer: ReturnType<typeof setInterval> | null;
  celebrationTimer: ReturnType<typeof setTimeout> | null;
  // Prova de que um socket é o host desta sala — só existe em memória, nunca
  // faz parte de `Room`/`RoomPublicState`, então nunca é enviado aos jogadores
  // (diferente do roomId, que é publico via state:sync). Ver host:rejoinRoom.
  hostSecret: string;
};

const HEARTBEAT_TIMEOUT_MS = 45_000;

class RoomManager {
  private roomsById = new Map<string, RoomRuntime>();
  private roomIdByJoinCode = new Map<string, string>();

  createRoom(phases: PhaseInput[], settings: Partial<RoomSettings>): RoomRuntime {
    const engine = new RoomEngine(phases, settings);
    return this.register(engine);
  }

  /** Registra um motor já pronto (usado tanto por createRoom quanto pela recuperação após restart). */
  register(engine: RoomEngine): RoomRuntime {
    const runtime: RoomRuntime = {
      engine,
      players: new Map(),
      autoDrawTimer: null,
      celebrationTimer: null,
      hostSecret: nanoid(),
    };
    const room = engine.getRoom();
    this.roomsById.set(room.roomId, runtime);
    this.roomIdByJoinCode.set(room.joinCode, room.roomId);
    return runtime;
  }

  verifyHostSecret(runtime: RoomRuntime, candidate: string): boolean {
    const expected = Buffer.from(runtime.hostSecret);
    const actual = Buffer.from(candidate);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  getById(roomId: string): RoomRuntime | undefined {
    return this.roomsById.get(roomId);
  }

  getByJoinCode(joinCode: string): RoomRuntime | undefined {
    const roomId = this.roomIdByJoinCode.get(joinCode.toUpperCase());
    if (!roomId) return undefined;
    return this.roomsById.get(roomId);
  }

  registerPlayer(runtime: RoomRuntime, existingPlayerId: string | undefined, name: string, roomId: string): PlayerRuntime {
    if (existingPlayerId) {
      const existing = runtime.players.get(existingPlayerId);
      if (existing) {
        existing.player.connected = true;
        existing.lastHeartbeatAt = Date.now();
        return existing;
      }
    }

    const playerId = existingPlayerId ?? nanoid();
    const playerRuntime: PlayerRuntime = {
      player: { playerId, name, roomId, connected: true, cardIds: [] },
      lastHeartbeatAt: Date.now(),
    };
    runtime.players.set(playerId, playerRuntime);
    return playerRuntime;
  }

  heartbeat(runtime: RoomRuntime, playerId: string): void {
    const playerRuntime = runtime.players.get(playerId);
    if (!playerRuntime) return;
    playerRuntime.lastHeartbeatAt = Date.now();
    playerRuntime.player.connected = true;
  }

  /** Marca como desconectados jogadores sem heartbeat há mais de 45s (seção 9.5). Nunca remove a cartela. */
  sweepStaleHeartbeats(onDisconnected: (roomId: string, playerId: string) => void): void {
    const now = Date.now();
    for (const runtime of this.roomsById.values()) {
      for (const playerRuntime of runtime.players.values()) {
        if (playerRuntime.player.connected && now - playerRuntime.lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS) {
          playerRuntime.player.connected = false;
          onDisconnected(runtime.engine.getRoom().roomId, playerRuntime.player.playerId);
        }
      }
    }
  }

  clearTimers(runtime: RoomRuntime): void {
    if (runtime.autoDrawTimer) clearInterval(runtime.autoDrawTimer);
    if (runtime.celebrationTimer) clearTimeout(runtime.celebrationTimer);
    runtime.autoDrawTimer = null;
    runtime.celebrationTimer = null;
  }
}

export const roomManager = new RoomManager();
