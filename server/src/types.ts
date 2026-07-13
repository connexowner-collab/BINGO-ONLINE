// Tipos compartilhados pelo domínio do jogo (seção 4 do spec).

export type ColumnLetter = 'B' | 'I' | 'N' | 'G' | 'O';

// QUINA = 5 em qualquer direção (linha, coluna ou diagonal). COLUNA e
// DIAGONAL existem à parte para quem quiser restringir uma fase a só um
// desses formatos especificamente.
export type WinMode = 'QUINA' | 'COLUNA' | 'DIAGONAL' | 'QUATRO_CANTOS' | 'X' | 'MOLDURA' | 'CARTELA_CHEIA';

export type CardGrid = (number | 'FREE')[][]; // 5x5, grid[row][col]

export type Ball = {
  number: number;
  letter: ColumnLetter;
  drawnAt: number;
  sequence: number;
};

export type Card = {
  cardId: string;
  displayNumber: string; // "#014"
  roomId: string;
  playerId: string;
  playerName: string;
  grid: CardGrid;
  hash: string;
  createdAt: number;
};

export type PhaseStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

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
  status: PhaseStatus;
  winners: PhaseWinner[];
};

export type RoomStatus = 'LOBBY' | 'RUNNING' | 'PAUSED' | 'CELEBRATING' | 'FINISHED';

export type RoomSettings = {
  drawMode: 'AUTO' | 'MANUAL';
  intervalSeconds: number; // default 6, range 3-20
  maxCardsPerPlayer: number; // default 1, range 1-4
  autoMark: boolean; // default false — jogador marca manualmente, servidor valida de qualquer forma
  celebrationSeconds: number; // default 12
  // Quando false, o servidor continua calculando vitória e near-win
  // normalmente, mas não entra em CELEBRATING sozinho — o jogador se
  // anuncia (bingo físico) e o host confirma via host:declareWinner.
  anunciarVencedorAutomatico: boolean; // default true
  permitirVitoriaRepetida: boolean; // default true
  allowLateJoin: boolean; // default true
  voiceEnabled: boolean; // default true
  voiceRepeat: boolean; // default true
};

export type Room = {
  roomId: string;
  joinCode: string;
  status: RoomStatus;
  drawnBalls: Ball[];
  remainingBalls: number[];
  phases: Phase[];
  currentPhaseId: string | null;
  settings: RoomSettings;
  createdAt: number;
};

export type Player = {
  playerId: string;
  name: string;
  roomId: string;
  connected: boolean;
  cardIds: string[];
};

export type NearWinEntry = {
  displayNumber: string;
  playerName: string;
  missingNumbers: number[];
};
