import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  markedPositions,
  distanceForMode,
  missingNumbersForMode,
  hasWon,
  evaluateCardsForMode,
  limitNearWinGroup,
} from '../src/game/evaluate.js';
import type { Card, CardGrid, NearWinEntry } from '../src/types.js';

// Cartela fixa usada em todos os testes:
// B  I  N   G  O
// 1 16 31  46 61
// 2 17 32  47 62
// 3 18 FREE 48 63
// 4 19 33  49 64
// 5 20 34  50 65
const GRID: CardGrid = [
  [1, 16, 31, 46, 61],
  [2, 17, 32, 47, 62],
  [3, 18, 'FREE', 48, 63],
  [4, 19, 33, 49, 64],
  [5, 20, 34, 50, 65],
];

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    cardId: 'card-1',
    displayNumber: '#001',
    roomId: 'room-1',
    playerId: 'player-1',
    playerName: 'Ana',
    grid: GRID,
    hash: 'hash-1',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('markedPositions', () => {
  test('marca o espaço FREE mesmo sem nenhuma bola sorteada', () => {
    const marked = markedPositions(GRID, new Set());
    assert.equal(marked.has('2,2'), true);
    assert.equal(marked.size, 1);
  });

  test('marca posições cujo número já saiu', () => {
    const marked = markedPositions(GRID, new Set([1, 16]));
    assert.equal(marked.has('0,0'), true);
    assert.equal(marked.has('0,1'), true);
    assert.equal(marked.has('0,2'), false);
  });
});

describe('distanceForMode / hasWon — QUINA', () => {
  test('linha completa dá distância 0 e vitória', () => {
    const drawn = new Set([1, 16, 31, 46, 61]); // linha 0 inteira
    assert.equal(distanceForMode(GRID, drawn, 'QUINA'), 0);
    assert.equal(hasWon(GRID, drawn, 'QUINA'), true);
  });

  test('faltando 1 número na linha mais próxima dá distância 1', () => {
    const drawn = new Set([1, 16, 31, 46]); // falta 61
    assert.equal(distanceForMode(GRID, drawn, 'QUINA'), 1);
    assert.deepEqual(missingNumbersForMode(GRID, drawn, 'QUINA'), [61]);
  });

  test('sem nenhuma bola, a linha do FREE (linha 2) já parte com distância 4', () => {
    assert.equal(distanceForMode(GRID, new Set(), 'QUINA'), 4);
  });

  test('QUINA fecha por coluna, não só por linha', () => {
    // Coluna B inteira (1,2,3,4,5), nenhuma linha completa
    const drawn = new Set([1, 2, 3, 4, 5]);
    assert.equal(distanceForMode(GRID, drawn, 'QUINA'), 0);
    assert.equal(hasWon(GRID, drawn, 'QUINA'), true);
  });

  test('QUINA fecha por diagonal, não só por linha ou coluna', () => {
    // Diagonal principal: (0,0)=1,(1,1)=17,FREE,(3,3)=49,(4,4)=65
    const drawn = new Set([1, 17, 49, 65]);
    assert.equal(distanceForMode(GRID, drawn, 'QUINA'), 0);
    assert.equal(hasWon(GRID, drawn, 'QUINA'), true);
  });
});

describe('distanceForMode — COLUNA', () => {
  test('coluna N precisa de só 4 números por causa do FREE', () => {
    const drawn = new Set([31, 32, 33]); // falta 34 na coluna N
    assert.equal(distanceForMode(GRID, drawn, 'COLUNA'), 1);
    assert.deepEqual(missingNumbersForMode(GRID, drawn, 'COLUNA'), [34]);
  });
});

describe('distanceForMode — DIAGONAL e X', () => {
  test('diagonal principal completa (inclui FREE no centro)', () => {
    const drawn = new Set([1, 17, 49, 65]); // (0,0)(1,1)FREE(3,3)(4,4)
    assert.equal(distanceForMode(GRID, drawn, 'DIAGONAL'), 0);
  });

  test('X exige as duas diagonais (8 números + FREE central)', () => {
    const almost = new Set([1, 17, 49, 65, 61, 47, 19]); // falta o 5 (4,0)
    assert.equal(distanceForMode(GRID, almost, 'X'), 1);
    assert.deepEqual(missingNumbersForMode(GRID, almost, 'X'), [5]);

    const complete = new Set([1, 17, 49, 65, 61, 47, 19, 5]);
    assert.equal(distanceForMode(GRID, complete, 'X'), 0);
  });
});

describe('distanceForMode — QUATRO_CANTOS e MOLDURA', () => {
  test('quatro cantos', () => {
    const drawn = new Set([1, 61, 5, 65]);
    assert.equal(distanceForMode(GRID, drawn, 'QUATRO_CANTOS'), 0);
  });

  test('moldura (perímetro) precisa de 16 números', () => {
    const perimeterNumbers = [1, 16, 31, 46, 61, 5, 20, 34, 50, 65, 2, 3, 4, 62, 63, 64];
    assert.equal(perimeterNumbers.length, 16);
    assert.equal(distanceForMode(GRID, new Set(perimeterNumbers), 'MOLDURA'), 0);
    assert.equal(distanceForMode(GRID, new Set(perimeterNumbers.slice(1)), 'MOLDURA'), 1);
  });
});

describe('distanceForMode — CARTELA_CHEIA', () => {
  test('distância = 24 - marcados (sem contar FREE)', () => {
    const allNumbers = GRID.flat().filter((v): v is number => typeof v === 'number');
    assert.equal(allNumbers.length, 24);

    assert.equal(distanceForMode(GRID, new Set(), 'CARTELA_CHEIA'), 24);
    assert.equal(distanceForMode(GRID, new Set(allNumbers.slice(0, 23)), 'CARTELA_CHEIA'), 1);
    assert.equal(distanceForMode(GRID, new Set(allNumbers), 'CARTELA_CHEIA'), 0);
  });
});

describe('evaluateCardsForMode', () => {
  test('agrupa vencedores, oneAway e twoAway; ordena por displayNumber', () => {
    const winnerCard = makeCard({ cardId: 'c1', displayNumber: '#014' });
    const oneAwayCardB = makeCard({ cardId: 'c2', displayNumber: '#087', playerName: 'Marcos' });
    const oneAwayCardA = makeCard({ cardId: 'c3', displayNumber: '#022', playerName: 'Carlos' });

    // Bolas: fecha a linha 0 completa para winnerCard (mesma grade para todas
    // as cartelas neste teste simplificado — o que varia é o modo avaliado
    // "como se" cada cartela tivesse essas bolas batendo diferente não é o
    // caso aqui; testamos o agrupamento com base na mesma grade e mesmo set
    // de bolas, mas modos diferentes por chamada).
    const drawnForWin = new Set([1, 16, 31, 46, 61]);
    const evalWin = evaluateCardsForMode([winnerCard], drawnForWin, 'QUINA');
    assert.equal(evalWin.winners.length, 1);
    assert.equal(evalWin.winners[0]!.displayNumber, '#014');

    const drawnForNearWin = new Set([1, 16, 31, 46]); // falta 1 na linha 0
    const evalNear = evaluateCardsForMode(
      [oneAwayCardB, oneAwayCardA],
      drawnForNearWin,
      'QUINA',
    );
    assert.equal(evalNear.winners.length, 0);
    assert.equal(evalNear.oneAway.length, 2);
    // Ordenado por displayNumber: #022 antes de #087
    assert.deepEqual(
      evalNear.oneAway.map((e: NearWinEntry) => e.displayNumber),
      ['#022', '#087'],
    );
  });

  test('empate: duas cartelas fechando na mesma bola aparecem como vencedoras', () => {
    const cardA = makeCard({ cardId: 'a', displayNumber: '#001' });
    const cardB = makeCard({ cardId: 'b', displayNumber: '#002' });
    const drawn = new Set([1, 16, 31, 46, 61]);
    const evaluation = evaluateCardsForMode([cardA, cardB], drawn, 'QUINA');
    assert.equal(evaluation.winners.length, 2);
  });
});

describe('limitNearWinGroup', () => {
  test('trunca em 12 itens e conta o excedente', () => {
    const group: NearWinEntry[] = Array.from({ length: 15 }, (_, i) => ({
      displayNumber: `#${i}`,
      playerName: 'X',
      missingNumbers: [],
    }));
    const { shown, extraCount } = limitNearWinGroup(group);
    assert.equal(shown.length, 12);
    assert.equal(extraCount, 3);
  });

  test('sem excedente quando o grupo é menor que o limite', () => {
    const group: NearWinEntry[] = [{ displayNumber: '#1', playerName: 'X', missingNumbers: [] }];
    const { shown, extraCount } = limitNearWinGroup(group);
    assert.equal(shown.length, 1);
    assert.equal(extraCount, 0);
  });
});
