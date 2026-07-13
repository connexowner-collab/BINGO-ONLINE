import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateCardGrid, hashGrid, generateUniqueCard, letterForNumber } from '../src/game/cards.js';

const COLUMN_RANGES: Record<string, [number, number]> = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};
const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;

describe('letterForNumber', () => {
  test('mapeia os limites de cada coluna corretamente', () => {
    assert.equal(letterForNumber(1), 'B');
    assert.equal(letterForNumber(15), 'B');
    assert.equal(letterForNumber(16), 'I');
    assert.equal(letterForNumber(30), 'I');
    assert.equal(letterForNumber(31), 'N');
    assert.equal(letterForNumber(45), 'N');
    assert.equal(letterForNumber(46), 'G');
    assert.equal(letterForNumber(60), 'G');
    assert.equal(letterForNumber(61), 'O');
    assert.equal(letterForNumber(75), 'O');
  });

  test('lança erro para números fora de 1-75', () => {
    assert.throws(() => letterForNumber(0));
    assert.throws(() => letterForNumber(76));
  });
});

describe('generateCardGrid', () => {
  test('produz uma grade 5x5 com espaço livre no centro', () => {
    const grid = generateCardGrid();
    assert.equal(grid.length, 5);
    for (const row of grid) assert.equal(row.length, 5);
    assert.equal(grid[2]![2], 'FREE');
  });

  test('cada coluna tem números distintos dentro da faixa correta', () => {
    const grid = generateCardGrid();
    for (let col = 0; col < 5; col++) {
      const letter = COLUMNS[col]!;
      const [min, max] = COLUMN_RANGES[letter]!;
      const colValues = grid.map((row) => row[col]!).filter((v) => v !== 'FREE') as number[];

      const expectedCount = letter === 'N' ? 4 : 5;
      assert.equal(colValues.length, expectedCount);

      const uniqueValues = new Set(colValues);
      assert.equal(uniqueValues.size, colValues.length, `coluna ${letter} deve ter números distintos`);

      for (const value of colValues) {
        assert.ok(value >= min && value <= max, `${value} deveria estar entre ${min} e ${max} (coluna ${letter})`);
      }
    }
  });

  test('coluna N tem exatamente 4 números e 1 FREE', () => {
    const grid = generateCardGrid();
    const nColumn = grid.map((row) => row[2]);
    const freeCount = nColumn.filter((v) => v === 'FREE').length;
    assert.equal(freeCount, 1);
  });

  test('gera grades diferentes em chamadas sucessivas (probabilisticamente)', () => {
    const a = generateCardGrid();
    const b = generateCardGrid();
    assert.notDeepEqual(a, b);
  });
});

describe('hashGrid', () => {
  test('grades com os mesmos números produzem o mesmo hash', () => {
    const grid = generateCardGrid();
    assert.equal(hashGrid(grid), hashGrid(grid));
  });

  test('grades diferentes produzem hashes diferentes (probabilisticamente)', () => {
    const a = generateCardGrid();
    const b = generateCardGrid();
    assert.notEqual(hashGrid(a), hashGrid(b));
  });
});

describe('generateUniqueCard', () => {
  test('preenche metadados corretamente', () => {
    const card = generateUniqueCard({
      roomId: 'room-1',
      playerId: 'player-1',
      playerName: 'Ana',
      serial: 14,
      existingHashes: new Set(),
    });

    assert.equal(card.roomId, 'room-1');
    assert.equal(card.playerId, 'player-1');
    assert.equal(card.playerName, 'Ana');
    assert.equal(card.displayNumber, '#014');
    assert.ok(card.cardId.length > 0);
    assert.equal(card.hash, hashGrid(card.grid));
  });

  test('nunca repete um hash já emitido na sala', () => {
    const first = generateUniqueCard({
      roomId: 'room-1',
      playerId: 'player-1',
      playerName: 'Ana',
      serial: 1,
      existingHashes: new Set(),
    });

    const second = generateUniqueCard({
      roomId: 'room-1',
      playerId: 'player-2',
      playerName: 'Beto',
      serial: 2,
      existingHashes: new Set([first.hash]),
    });

    assert.notEqual(second.hash, first.hash);
  });

  test('lança erro se não conseguir gerar cartela única após maxAttempts', () => {
    const alwaysCollides = { has: () => true } as unknown as ReadonlySet<string>;
    assert.throws(() =>
      generateUniqueCard({
        roomId: 'room-1',
        playerId: 'player-1',
        playerName: 'Ana',
        serial: 1,
        existingHashes: alwaysCollides,
        maxAttempts: 3,
      }),
    );
  });
});
