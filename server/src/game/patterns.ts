// Definição dos padrões de vitória sobre a grade 5x5. Função pura, sem I/O.

import type { WinMode } from '../types.js';

export type CellPos = { row: number; col: number };

const ALL_ROWS = [0, 1, 2, 3, 4] as const;
const ALL_COLS = [0, 1, 2, 3, 4] as const;

function rowPattern(row: number): CellPos[] {
  return ALL_COLS.map((col) => ({ row, col }));
}

function colPattern(col: number): CellPos[] {
  return ALL_ROWS.map((row) => ({ row, col }));
}

const MAIN_DIAGONAL: CellPos[] = ALL_ROWS.map((i) => ({ row: i, col: i }));
const ANTI_DIAGONAL: CellPos[] = ALL_ROWS.map((i) => ({ row: i, col: 4 - i }));

const FOUR_CORNERS: CellPos[] = [
  { row: 0, col: 0 },
  { row: 0, col: 4 },
  { row: 4, col: 0 },
  { row: 4, col: 4 },
];

const FRAME: CellPos[] = [];
for (const row of ALL_ROWS) {
  for (const col of ALL_COLS) {
    if (row === 0 || row === 4 || col === 0 || col === 4) FRAME.push({ row, col });
  }
}

const FULL_CARD: CellPos[] = [];
for (const row of ALL_ROWS) {
  for (const col of ALL_COLS) FULL_CARD.push({ row, col });
}

function dedupeCells(cells: CellPos[]): CellPos[] {
  const seen = new Set<string>();
  const result: CellPos[] = [];
  for (const c of cells) {
    const key = `${c.row},${c.col}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(c);
    }
  }
  return result;
}

/**
 * Retorna a lista de padrões válidos para um modo de vitória. Um modo pode ter
 * vários padrões alternativos (ex.: QUINA tem 5 linhas possíveis) — basta UM
 * deles fechar para vencer.
 */
export function patternsForMode(mode: WinMode): CellPos[][] {
  switch (mode) {
    case 'QUINA':
      return ALL_ROWS.map((row) => rowPattern(row));
    case 'COLUNA':
      return ALL_COLS.map((col) => colPattern(col));
    case 'DIAGONAL':
      return [MAIN_DIAGONAL, ANTI_DIAGONAL];
    case 'LINHA_QUALQUER':
      return [
        ...ALL_ROWS.map((row) => rowPattern(row)),
        ...ALL_COLS.map((col) => colPattern(col)),
        MAIN_DIAGONAL,
        ANTI_DIAGONAL,
      ];
    case 'QUATRO_CANTOS':
      return [FOUR_CORNERS];
    case 'X':
      return [dedupeCells([...MAIN_DIAGONAL, ...ANTI_DIAGONAL])];
    case 'MOLDURA':
      return [FRAME];
    case 'CARTELA_CHEIA':
      return [FULL_CARD];
  }
}
