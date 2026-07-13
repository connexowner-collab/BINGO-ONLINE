// Cópia mínima dos tipos públicos do servidor (seção 4). Monorepo simples,
// sem pacote compartilhado — mantemos só o que o client realmente consome.

export type ColumnLetter = 'B' | 'I' | 'N' | 'G' | 'O';

// QUINA = 5 em qualquer direção (linha, coluna ou diagonal). COLUNA e
// DIAGONAL existem à parte para quem quiser restringir uma fase a só um
// desses formatos especificamente.
export type WinMode = 'QUINA' | 'COLUNA' | 'DIAGONAL' | 'QUATRO_CANTOS' | 'X' | 'MOLDURA' | 'CARTELA_CHEIA';

export type CardGrid = (number | 'FREE')[][];

export type Ball = {
  number: number;
  letter: ColumnLetter;
  drawnAt: number;
  sequence: number;
};

export type Card = {
  cardId: string;
  displayNumber: string;
  roomId: string;
  playerId: string;
  playerName: string;
  grid: CardGrid;
  hash: string;
  createdAt: number;
};

export type PhaseWinner = {
  cardId: string;
  displayNumber: string;
  playerName: string;
  ballSequence: number;
};

export type Phase = {
  id: string;
  order: number;
  mode: WinMode;
  prizeLabel: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  winners: PhaseWinner[];
};

export type RoomSettings = {
  drawMode: 'AUTO' | 'MANUAL';
  intervalSeconds: number;
  maxCardsPerPlayer: number;
  autoMark: boolean;
  celebrationSeconds: number;
  anunciarVencedorAutomatico: boolean;
  permitirVitoriaRepetida: boolean;
  allowLateJoin: boolean;
  voiceEnabled: boolean;
  voiceRepeat: boolean;
};

export type RoomPublicState = {
  roomId: string;
  joinCode: string;
  status: 'LOBBY' | 'RUNNING' | 'PAUSED' | 'CELEBRATING' | 'FINISHED';
  drawnBalls: Ball[];
  remainingCount: number;
  phases: Phase[];
  currentPhaseId: string | null;
  settings: RoomSettings;
  createdAt: number;
};

export type NearWinEntry = {
  displayNumber: string;
  playerName: string;
  missingNumbers: number[];
};
