// Roteamento de todos os eventos Socket.IO (seção 5 do spec).
// Princípio inegociável: o servidor decide tudo. Os handlers só validam
// (zod), delegam a lógica ao RoomEngine e retransmitem o resultado.

import type { Server, Socket } from 'socket.io';
import type { ZodType } from 'zod';
import {
  hostCreateRoomSchema,
  hostRejoinRoomSchema,
  playerJoinSchema,
  roomSettingsPartialSchema,
} from '../schemas.js';
import { roomManager, type RoomRuntime } from '../roomManager.js';
import { limitNearWinGroup, distanceForMode, markedPositions } from '../game/evaluate.js';
import type { Ball, Card, NearWinEntry, Phase, PhaseWinner } from '../types.js';
import { hostChannel, playerChannel, roomChannel, toPublicState, type RoomPublicState } from './rooms.js';
import { isRateLimited } from '../rateLimit.js';
import { saveBallDraw, saveCard, saveRoomSnapshot } from '../db/repository.js';

export type ErrorCode =
  | 'INVALID_PAYLOAD'
  | 'ROOM_NOT_FOUND'
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'INVALID_STATE'
  | 'CARD_LIMIT_REACHED'
  | 'LATE_JOIN_DISABLED'
  | 'RATE_LIMITED';

export type ClientToServerEvents = {
  'host:createRoom': (
    payload: unknown,
    ack?: (res: { ok: true; roomId: string; joinCode: string } | { ok: false; error: string }) => void,
  ) => void;
  'host:startGame': (payload: unknown) => void;
  'host:drawNext': (payload: unknown) => void;
  'host:pause': (payload: unknown) => void;
  'host:resume': (payload: unknown) => void;
  'host:updateSettings': (payload: unknown) => void;
  'host:repeatLastBall': (payload: unknown) => void;
  'host:endGame': (payload: unknown) => void;
  /** Extensão além da seção 5: permite ao painel recuperar sua sala após reconectar (seção 9). */
  'host:rejoinRoom': (payload: unknown) => void;
  'player:join': (
    payload: unknown,
    ack?: (res: { ok: true; playerId: string } | { ok: false; error: string }) => void,
  ) => void;
  'player:requestExtraCard': (payload: unknown) => void;
  'player:heartbeat': (payload: unknown) => void;
};

export type ServerToClientEvents = {
  'state:sync': (state: RoomPublicState) => void;
  'ball:drawn': (payload: { ball: Ball; totalDrawn: number; remaining: number }) => void;
  'phase:won': (payload: { phase: Phase; winners: PhaseWinner[]; ball: Ball }) => void;
  'phase:started': (payload: { phase: Phase }) => void;
  'nearWin:update': (payload: {
    oneAway: NearWinEntry[];
    twoAway: NearWinEntry[];
    oneAwayExtraCount: number;
    twoAwayExtraCount: number;
  }) => void;
  'player:cardAssigned': (payload: { cards: Card[] }) => void;
  'player:progress': (payload: { cardId: string; marked: number[]; missingForCurrentPhase: number }) => void;
  'room:playerJoined': (payload: { playerName: string; totalPlayers: number }) => void;
  'room:playerLeft': (payload: { playerName: string; totalPlayers: number }) => void;
  'game:finished': (payload: { report: unknown }) => void;
  error: (payload: { code: ErrorCode; message: string }) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  roomId?: string;
  playerId?: string;
  isHost?: boolean;
};

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

function sendError(socket: AppSocket, code: ErrorCode, message: string): void {
  socket.emit('error', { code, message });
}

function parseOrError<T>(schema: ZodType<T>, payload: unknown, socket: AppSocket): T | undefined {
  const result = schema.safeParse(payload);
  if (!result.success) {
    sendError(socket, 'INVALID_PAYLOAD', result.error.issues.map((i) => i.message).join('; '));
    return undefined;
  }
  return result.data;
}

function currentPhase(runtime: RoomRuntime): Phase {
  const room = runtime.engine.getRoom();
  const phase = room.phases.find((p) => p.id === room.currentPhaseId);
  if (!phase) throw new Error('Sala sem fase ativa');
  return phase;
}

/** Emite o progresso de todas as cartelas de um jogador para o quarto dele. */
function emitPlayerProgress(io: AppServer, runtime: RoomRuntime, playerId: string): void {
  const room = runtime.engine.getRoom();
  const phase = room.phases.find((p) => p.id === room.currentPhaseId);
  if (!phase) return;
  const drawnNumbers = new Set(room.drawnBalls.map((b) => b.number));

  for (const card of runtime.engine.getCardsForPlayer(playerId)) {
    const marked = [...markedPositions(card.grid, drawnNumbers)]
      .map((key) => {
        const [row, col] = key.split(',').map(Number) as [number, number];
        return card.grid[row]![col]!;
      })
      .filter((v): v is number => typeof v === 'number');

    io.to(playerChannel(playerId)).emit('player:progress', {
      cardId: card.cardId,
      marked,
      missingForCurrentPhase: distanceForMode(card.grid, drawnNumbers, phase.mode),
    });
  }
}

function emitProgressForAllPlayers(io: AppServer, runtime: RoomRuntime): void {
  for (const playerId of runtime.players.keys()) {
    emitPlayerProgress(io, runtime, playerId);
  }
}

function buildReport(runtime: RoomRuntime): unknown {
  const room = runtime.engine.getRoom();
  return {
    roomId: room.roomId,
    joinCode: room.joinCode,
    drawnBalls: room.drawnBalls,
    phases: room.phases,
    totalPlayers: runtime.players.size,
    finishedAt: Date.now(),
  };
}

export function startAutoTimer(io: AppServer, runtime: RoomRuntime, roomId: string): void {
  if (runtime.autoDrawTimer) clearInterval(runtime.autoDrawTimer);
  const intervalMs = runtime.engine.getRoom().settings.intervalSeconds * 1000;
  runtime.autoDrawTimer = setInterval(() => performDraw(io, runtime, roomId), intervalMs);
}

function stopAutoTimer(runtime: RoomRuntime): void {
  if (runtime.autoDrawTimer) {
    clearInterval(runtime.autoDrawTimer);
    runtime.autoDrawTimer = null;
  }
}

/** Seção 6: sorteia, avalia e retransmite — usado tanto pelo timer AUTO quanto por host:drawNext. */
function performDraw(io: AppServer, runtime: RoomRuntime, roomId: string): void {
  const completedPhaseId = runtime.engine.getRoom().currentPhaseId;
  const result = runtime.engine.drawNext();
  if (!result) return;

  const room = runtime.engine.getRoom();
  io.to(roomChannel(roomId)).emit('ball:drawn', {
    ball: result.ball,
    totalDrawn: room.drawnBalls.length,
    remaining: room.remainingBalls.length,
  });
  void saveBallDraw(roomId, result.ball);
  void saveRoomSnapshot(room);

  if (result.phaseWon) {
    stopAutoTimer(runtime);
    const completedPhase = room.phases.find((p) => p.id === completedPhaseId)!;
    io.to(roomChannel(roomId)).emit('phase:won', {
      phase: completedPhase,
      winners: completedPhase.winners,
      ball: result.ball,
    });

    runtime.celebrationTimer = setTimeout(() => {
      const { nextPhase, finished } = runtime.engine.advancePhase();
      const updatedRoom = runtime.engine.getRoom();

      if (finished) {
        io.to(roomChannel(roomId)).emit('game:finished', { report: buildReport(runtime) });
      } else if (nextPhase) {
        io.to(roomChannel(roomId)).emit('phase:started', { phase: nextPhase });
        if (updatedRoom.settings.drawMode === 'AUTO') startAutoTimer(io, runtime, roomId);
      }

      io.to(roomChannel(roomId)).emit('state:sync', toPublicState(updatedRoom));
      emitProgressForAllPlayers(io, runtime);
      void saveRoomSnapshot(updatedRoom);
    }, room.settings.celebrationSeconds * 1000);
  } else {
    const oneAway = limitNearWinGroup(result.evaluation.oneAway);
    const twoAway = limitNearWinGroup(result.evaluation.twoAway);
    io.to(hostChannel(roomId)).emit('nearWin:update', {
      oneAway: oneAway.shown,
      twoAway: twoAway.shown,
      oneAwayExtraCount: oneAway.extraCount,
      twoAwayExtraCount: twoAway.extraCount,
    });
  }

  emitProgressForAllPlayers(io, runtime);
}

export function registerSocketHandlers(io: AppServer): void {
  setInterval(() => {
    roomManager.sweepStaleHeartbeats((roomId, playerId) => {
      const runtime = roomManager.getById(roomId);
      if (!runtime) return;
      const playerRuntime = runtime.players.get(playerId);
      io.to(hostChannel(roomId)).emit('room:playerLeft', {
        playerName: playerRuntime?.player.name ?? '???',
        totalPlayers: runtime.players.size,
      });
    });
  }, 5000);

  io.on('connection', (socket: AppSocket) => {
    socket.on('host:createRoom', (payload, ack) => {
      const parsed = parseOrError(hostCreateRoomSchema, payload, socket);
      if (!parsed) {
        ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }

      const runtime = roomManager.createRoom(parsed.phases, parsed.settings ?? {});
      const room = runtime.engine.getRoom();
      socket.data.isHost = true;
      socket.data.roomId = room.roomId;
      void socket.join([roomChannel(room.roomId), hostChannel(room.roomId)]);

      socket.emit('state:sync', toPublicState(room));
      void saveRoomSnapshot(room);
      ack?.({ ok: true, roomId: room.roomId, joinCode: room.joinCode });
    });

    socket.on('host:rejoinRoom', (payload) => {
      const parsed = parseOrError(hostRejoinRoomSchema, payload, socket);
      if (!parsed) return;
      const runtime = roomManager.getById(parsed.roomId);
      if (!runtime) return sendError(socket, 'ROOM_NOT_FOUND', 'Sala não encontrada');

      socket.data.isHost = true;
      socket.data.roomId = parsed.roomId;
      void socket.join([roomChannel(parsed.roomId), hostChannel(parsed.roomId)]);
      socket.emit('state:sync', toPublicState(runtime.engine.getRoom()));
    });

    function requireHostRuntime(): RoomRuntime | undefined {
      if (!socket.data.isHost || !socket.data.roomId) {
        sendError(socket, 'NOT_HOST', 'Apenas o painel pode executar esta ação');
        return undefined;
      }
      const runtime = roomManager.getById(socket.data.roomId);
      if (!runtime) {
        sendError(socket, 'ROOM_NOT_FOUND', 'Sala não encontrada');
        return undefined;
      }
      return runtime;
    }

    socket.on('host:startGame', () => {
      const runtime = requireHostRuntime();
      if (!runtime) return;
      const roomId = socket.data.roomId!;

      try {
        runtime.engine.start();
      } catch (err) {
        return sendError(socket, 'INVALID_STATE', (err as Error).message);
      }

      const room = runtime.engine.getRoom();
      io.to(roomChannel(roomId)).emit('phase:started', { phase: currentPhase(runtime) });
      io.to(roomChannel(roomId)).emit('state:sync', toPublicState(room));
      if (room.settings.drawMode === 'AUTO') startAutoTimer(io, runtime, roomId);
    });

    socket.on('host:drawNext', () => {
      const runtime = requireHostRuntime();
      if (!runtime) return;
      if (runtime.engine.getRoom().settings.drawMode !== 'MANUAL') {
        return sendError(socket, 'INVALID_STATE', 'Sorteio manual só funciona no modo MANUAL');
      }
      performDraw(io, runtime, socket.data.roomId!);
    });

    socket.on('host:pause', () => {
      const runtime = requireHostRuntime();
      if (!runtime) return;
      runtime.engine.pause();
      stopAutoTimer(runtime);
      io.to(roomChannel(socket.data.roomId!)).emit('state:sync', toPublicState(runtime.engine.getRoom()));
    });

    socket.on('host:resume', () => {
      const runtime = requireHostRuntime();
      if (!runtime) return;
      runtime.engine.resume();
      const room = runtime.engine.getRoom();
      if (room.status === 'RUNNING' && room.settings.drawMode === 'AUTO') {
        startAutoTimer(io, runtime, socket.data.roomId!);
      }
      io.to(roomChannel(socket.data.roomId!)).emit('state:sync', toPublicState(room));
    });

    socket.on('host:updateSettings', (payload) => {
      const runtime = requireHostRuntime();
      if (!runtime) return;
      const parsed = parseOrError(roomSettingsPartialSchema, payload, socket);
      if (!parsed) return;

      runtime.engine.updateSettings(parsed);
      const room = runtime.engine.getRoom();
      const roomId = socket.data.roomId!;

      if (room.status === 'RUNNING') {
        if (room.settings.drawMode === 'AUTO') startAutoTimer(io, runtime, roomId);
        else stopAutoTimer(runtime);
      }

      io.to(roomChannel(roomId)).emit('state:sync', toPublicState(room));
    });

    socket.on('host:repeatLastBall', () => {
      const runtime = requireHostRuntime();
      if (!runtime) return;
      const lastBall = runtime.engine.getLastBall();
      if (!lastBall) return;
      const room = runtime.engine.getRoom();
      io.to(roomChannel(socket.data.roomId!)).emit('ball:drawn', {
        ball: lastBall,
        totalDrawn: room.drawnBalls.length,
        remaining: room.remainingBalls.length,
      });
    });

    socket.on('host:endGame', () => {
      const runtime = requireHostRuntime();
      if (!runtime) return;
      stopAutoTimer(runtime);
      if (runtime.celebrationTimer) clearTimeout(runtime.celebrationTimer);
      runtime.engine.endGame();
      const roomId = socket.data.roomId!;
      io.to(roomChannel(roomId)).emit('game:finished', { report: buildReport(runtime) });
      io.to(roomChannel(roomId)).emit('state:sync', toPublicState(runtime.engine.getRoom()));
      void saveRoomSnapshot(runtime.engine.getRoom());
    });

    socket.on('player:join', (payload, ack) => {
      const parsed = parseOrError(playerJoinSchema, payload, socket);
      if (!parsed) {
        ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }

      if (isRateLimited(`join:${socket.id}`, 5, 10_000)) {
        sendError(socket, 'RATE_LIMITED', 'Muitas tentativas de entrada, aguarde um instante');
        ack?.({ ok: false, error: 'RATE_LIMITED' });
        return;
      }

      const runtime = roomManager.getByJoinCode(parsed.joinCode);
      if (!runtime) {
        sendError(socket, 'ROOM_NOT_FOUND', 'Código de sala inválido');
        ack?.({ ok: false, error: 'ROOM_NOT_FOUND' });
        return;
      }

      const room = runtime.engine.getRoom();
      const isReconnect = !!parsed.playerId && runtime.players.has(parsed.playerId);
      if (!isReconnect && room.status !== 'LOBBY' && !room.settings.allowLateJoin) {
        sendError(socket, 'LATE_JOIN_DISABLED', 'Entrada tardia desativada para esta sala');
        ack?.({ ok: false, error: 'LATE_JOIN_DISABLED' });
        return;
      }

      const playerRuntime = roomManager.registerPlayer(runtime, parsed.playerId, parsed.name, room.roomId);
      const playerId = playerRuntime.player.playerId;

      socket.data.playerId = playerId;
      socket.data.roomId = room.roomId;
      void socket.join([roomChannel(room.roomId), playerChannel(playerId)]);

      if (playerRuntime.player.cardIds.length === 0) {
        try {
          const card = runtime.engine.issueCard(playerId, parsed.name);
          playerRuntime.player.cardIds.push(card.cardId);
          void saveCard(card);
        } catch (err) {
          sendError(socket, 'CARD_LIMIT_REACHED', (err as Error).message);
        }
      }

      socket.emit('player:cardAssigned', { cards: runtime.engine.getCardsForPlayer(playerId) });
      socket.emit('state:sync', toPublicState(runtime.engine.getRoom()));
      emitPlayerProgress(io, runtime, playerId);

      if (!isReconnect) {
        io.to(hostChannel(room.roomId)).emit('room:playerJoined', {
          playerName: parsed.name,
          totalPlayers: runtime.players.size,
        });
      }

      ack?.({ ok: true, playerId });
    });

    socket.on('player:requestExtraCard', () => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) return sendError(socket, 'NOT_IN_ROOM', 'Você ainda não entrou em uma sala');
      const runtime = roomManager.getById(roomId);
      if (!runtime) return sendError(socket, 'ROOM_NOT_FOUND', 'Sala não encontrada');

      if (isRateLimited(`extraCard:${socket.id}`, 5, 10_000)) {
        return sendError(socket, 'RATE_LIMITED', 'Muitas tentativas, aguarde um instante');
      }

      const playerRuntime = runtime.players.get(playerId);
      if (!playerRuntime) return sendError(socket, 'NOT_IN_ROOM', 'Jogador não encontrado na sala');

      try {
        const card = runtime.engine.issueCard(playerId, playerRuntime.player.name);
        playerRuntime.player.cardIds.push(card.cardId);
        void saveCard(card);
      } catch (err) {
        return sendError(socket, 'CARD_LIMIT_REACHED', (err as Error).message);
      }

      socket.emit('player:cardAssigned', { cards: runtime.engine.getCardsForPlayer(playerId) });
      emitPlayerProgress(io, runtime, playerId);
    });

    socket.on('player:heartbeat', () => {
      const { playerId, roomId } = socket.data;
      if (!playerId || !roomId) return;
      const runtime = roomManager.getById(roomId);
      if (!runtime) return;
      roomManager.heartbeat(runtime, playerId);
    });
  });
}
