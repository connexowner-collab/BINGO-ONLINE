// Avaliação de vitória e distância ("quase lá"). Função pura, sem I/O, 100% testável.

import type { CellPos } from './patterns.js';
import { patternsForMode } from './patterns.js';
import type { Card, CardGrid, NearWinEntry, WinMode } from '../types.js';

function cellKey(c: CellPos): string {
  return `${c.row},${c.col}`;
}

/** Posições marcadas: espaço FREE ou número já sorteado. */
export function markedPositions(grid: CardGrid, drawnNumbers: ReadonlySet<number>): Set<string> {
  const marked = new Set<string>();
  for (let row = 0; row < grid.length; row++) {
    const gridRow = grid[row]!;
    for (let col = 0; col < gridRow.length; col++) {
      const value = gridRow[col]!;
      if (value === 'FREE' || drawnNumbers.has(value)) {
        marked.add(`${row},${col}`);
      }
    }
  }
  return marked;
}

function missingCellsForPattern(pattern: CellPos[], marked: ReadonlySet<string>): CellPos[] {
  return pattern.filter((c) => !marked.has(cellKey(c)));
}

type PatternDistance = { pattern: CellPos[]; missing: CellPos[] };

// distancia(cartela, modo) = min( números faltantes em cada padrão válido do modo )
function bestPatternDistance(patterns: CellPos[][], marked: ReadonlySet<string>): PatternDistance {
  let best: PatternDistance | null = null;
  for (const pattern of patterns) {
    const missing = missingCellsForPattern(pattern, marked);
    if (!best || missing.length < best.missing.length) {
      best = { pattern, missing };
      if (missing.length === 0) break; // já venceu, não há distância menor
    }
  }
  return best!; // patterns nunca é vazio para um WinMode válido
}

export function distanceForMode(grid: CardGrid, drawnNumbers: ReadonlySet<number>, mode: WinMode): number {
  const marked = markedPositions(grid, drawnNumbers);
  return bestPatternDistance(patternsForMode(mode), marked).missing.length;
}

/** Números (não FREE) que faltam sair para fechar o padrão mais próximo da vitória. */
export function missingNumbersForMode(
  grid: CardGrid,
  drawnNumbers: ReadonlySet<number>,
  mode: WinMode,
): number[] {
  const marked = markedPositions(grid, drawnNumbers);
  const { missing } = bestPatternDistance(patternsForMode(mode), marked);
  return missing
    .map((c) => grid[c.row]![c.col]!)
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b);
}

export function hasWon(grid: CardGrid, drawnNumbers: ReadonlySet<number>, mode: WinMode): boolean {
  return distanceForMode(grid, drawnNumbers, mode) === 0;
}

export type PhaseEvaluation = {
  winners: Card[];
  /** Cartelas a 1 número da vitória, ordenadas por displayNumber (sem limite de exibição). */
  oneAway: NearWinEntry[];
  /** Cartelas a 2 números da vitória, ordenadas por displayNumber (sem limite de exibição). */
  twoAway: NearWinEntry[];
};

function byDisplayNumber(a: NearWinEntry, b: NearWinEntry): number {
  return a.displayNumber.localeCompare(b.displayNumber);
}

/**
 * Avalia todas as cartelas elegíveis contra o modo da fase ativa.
 * Não decide desempate: se múltiplas cartelas fecham na mesma bola, todas
 * aparecem em `winners` (seção 3, "Empate").
 */
export function evaluateCardsForMode(
  cards: readonly Card[],
  drawnNumbers: ReadonlySet<number>,
  mode: WinMode,
): PhaseEvaluation {
  const winners: Card[] = [];
  const oneAway: NearWinEntry[] = [];
  const twoAway: NearWinEntry[] = [];

  for (const card of cards) {
    const distance = distanceForMode(card.grid, drawnNumbers, mode);
    if (distance === 0) {
      winners.push(card);
    } else if (distance === 1) {
      oneAway.push({
        displayNumber: card.displayNumber,
        playerName: card.playerName,
        missingNumbers: missingNumbersForMode(card.grid, drawnNumbers, mode),
      });
    } else if (distance === 2) {
      twoAway.push({
        displayNumber: card.displayNumber,
        playerName: card.playerName,
        missingNumbers: missingNumbersForMode(card.grid, drawnNumbers, mode),
      });
    }
  }

  oneAway.sort(byDisplayNumber);
  twoAway.sort(byDisplayNumber);

  return { winners, oneAway, twoAway };
}

/** Trunca um grupo de near-win para exibição (seção 6: máx. 12 itens + contador). */
export function limitNearWinGroup(
  group: readonly NearWinEntry[],
  limit = 12,
): { shown: NearWinEntry[]; extraCount: number } {
  return {
    shown: group.slice(0, limit),
    extraCount: Math.max(0, group.length - limit),
  };
}
