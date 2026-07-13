// Geração e validação de cartelas. Função pura (sem I/O), 100% testável.

import { randomInt, createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import type { Card, CardGrid, ColumnLetter } from '../types.js';

const COLUMN_RANGES: Record<ColumnLetter, [number, number]> = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

const COLUMNS: ColumnLetter[] = ['B', 'I', 'N', 'G', 'O'];

export function letterForNumber(n: number): ColumnLetter {
  for (const letter of COLUMNS) {
    const [min, max] = COLUMN_RANGES[letter];
    if (n >= min && n <= max) return letter;
  }
  throw new Error(`Número fora do intervalo 1-75: ${n}`);
}

// Sorteia `count` números distintos dentro de [min, max] usando crypto.randomInt.
function drawDistinct(min: number, max: number, count: number): number[] {
  const pool: number[] = [];
  for (let n = min; n <= max; n++) pool.push(n);
  // Fisher-Yates: só precisamos embaralhar o suficiente para tirar `count` itens.
  for (let i = pool.length - 1; i > pool.length - 1 - count && i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(pool.length - count);
}

/** Gera uma grade 5x5 aleatória (coluna N tem espaço livre no centro). */
export function generateCardGrid(): CardGrid {
  const columnValues = {} as Record<ColumnLetter, (number | 'FREE')[]>;

  for (const letter of COLUMNS) {
    const [min, max] = COLUMN_RANGES[letter];
    const needed = letter === 'N' ? 4 : 5;
    const nums: (number | 'FREE')[] = drawDistinct(min, max, needed).sort((a, b) => a - b);
    if (letter === 'N') {
      nums.splice(2, 0, 'FREE');
    }
    columnValues[letter] = nums;
  }

  const grid: CardGrid = [];
  for (let row = 0; row < 5; row++) {
    grid.push(COLUMNS.map((letter) => columnValues[letter]![row]!));
  }
  return grid;
}

/** Hash SHA-256 do array ordenado de números da cartela — usado para checar duplicidade. */
export function hashGrid(grid: CardGrid): string {
  const numbers = grid
    .flat()
    .filter((v): v is number => typeof v === 'number')
    .sort((a, b) => a - b);
  return createHash('sha256').update(numbers.join(',')).digest('hex');
}

export type GenerateUniqueCardParams = {
  roomId: string;
  playerId: string;
  playerName: string;
  serial: number; // usado para compor o displayNumber "#014"
  existingHashes: ReadonlySet<string>;
  maxAttempts?: number;
};

/** Gera uma cartela garantidamente diferente de todas em `existingHashes`. */
export function generateUniqueCard(params: GenerateUniqueCardParams): Card {
  const { roomId, playerId, playerName, serial, existingHashes, maxAttempts = 1000 } = params;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = generateCardGrid();
    const hash = hashGrid(grid);
    if (!existingHashes.has(hash)) {
      return {
        cardId: nanoid(),
        displayNumber: `#${String(serial).padStart(3, '0')}`,
        roomId,
        playerId,
        playerName,
        grid,
        hash,
        createdAt: Date.now(),
      };
    }
  }

  throw new Error('Não foi possível gerar uma cartela única após várias tentativas');
}
