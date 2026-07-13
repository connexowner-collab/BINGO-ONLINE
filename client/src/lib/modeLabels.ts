import type { WinMode } from './types';

// Rótulos em português amigável para cada modo de vitória — usados no painel,
// na tela de vitória e na cartela mobile para deixar claro qual prêmio está valendo.
export const MODE_LABELS: Record<WinMode, string> = {
  QUINA: 'quina',
  COLUNA: 'coluna',
  DIAGONAL: 'diagonal',
  QUATRO_CANTOS: 'quatro cantos',
  X: 'x',
  MOLDURA: 'moldura',
  CARTELA_CHEIA: 'cartela cheia',
};

export const WIN_MODE_OPTIONS: { mode: WinMode; label: string }[] = [
  { mode: 'QUINA', label: 'Quina' },
  { mode: 'COLUNA', label: 'Coluna' },
  { mode: 'DIAGONAL', label: 'Diagonal' },
  { mode: 'QUATRO_CANTOS', label: 'Quatro cantos' },
  { mode: 'X', label: 'X' },
  { mode: 'MOLDURA', label: 'Moldura' },
  { mode: 'CARTELA_CHEIA', label: 'Cartela cheia' },
];
