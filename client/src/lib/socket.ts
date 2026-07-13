import { io, type Socket } from 'socket.io-client';
import type { Ball, Card, NearWinEntry, Phase, PhaseWinner, RoomPublicState } from './types';

export type ClientToServerEvents = {
  'host:createRoom': (
    payload: unknown,
    ack?: (res: { ok: true; roomId: string; joinCode: string } | { ok: false; error: string }) => void,
  ) => void;
  'host:startGame': (payload: Record<string, never>) => void;
  'host:drawNext': (payload: Record<string, never>) => void;
  'host:pause': (payload: Record<string, never>) => void;
  'host:resume': (payload: Record<string, never>) => void;
  'host:updateSettings': (payload: unknown) => void;
  'host:repeatLastBall': (payload: Record<string, never>) => void;
  'host:endGame': (payload: Record<string, never>) => void;
  'host:rejoinRoom': (payload: { roomId: string }) => void;
  'player:join': (
    payload: { joinCode: string; name: string; playerId?: string },
    ack?: (res: { ok: true; playerId: string } | { ok: false; error: string }) => void,
  ) => void;
  'player:requestExtraCard': (payload: Record<string, never>) => void;
  'player:heartbeat': (payload: Record<string, never>) => void;
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
  error: (payload: { code: string; message: string }) => void;
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: true,
  reconnection: true,
});
