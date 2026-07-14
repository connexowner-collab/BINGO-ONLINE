import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RoomEngine } from '../src/game/engine.js';

describe('RoomEngine', () => {
  test('cria sala em LOBBY com fases PENDING/ACTIVE corretas', () => {
    const engine = new RoomEngine([
      { mode: 'QUINA', prizeLabel: 'Kit café' },
      { mode: 'CARTELA_CHEIA', prizeLabel: 'Smart TV' },
    ]);
    const room = engine.getRoom();
    assert.equal(room.status, 'LOBBY');
    assert.equal(room.phases[0]!.status, 'ACTIVE');
    assert.equal(room.phases[1]!.status, 'PENDING');
    assert.equal(room.joinCode.length, 6);
    assert.equal(room.remainingBalls.length, 75);
  });

  test('issueCard respeita maxCardsPerPlayer', () => {
    const engine = new RoomEngine([{ mode: 'QUINA', prizeLabel: 'Prêmio' }], {
      maxCardsPerPlayer: 1,
    });
    engine.issueCard('p1', 'Ana');
    assert.throws(() => engine.issueCard('p1', 'Ana'));
  });

  test('drawNext só funciona com a sala em RUNNING', () => {
    const engine = new RoomEngine([{ mode: 'QUINA', prizeLabel: 'Prêmio' }]);
    assert.equal(engine.drawNext(), null); // ainda em LOBBY
    engine.start();
    const result = engine.drawNext();
    assert.notEqual(result, null);
    assert.equal(engine.getRoom().drawnBalls.length, 1);
  });

  test('fluxo completo: sorteia até fechar QUINA e celebra', () => {
    const engine = new RoomEngine([{ mode: 'QUINA', prizeLabel: 'Prêmio' }], {
      maxCardsPerPlayer: 1,
    });
    engine.issueCard('p1', 'Ana');
    engine.start();

    let won = false;
    for (let i = 0; i < 75 && !won; i++) {
      const result = engine.drawNext();
      if (!result) break;
      if (result.phaseWon) {
        won = true;
        assert.equal(engine.getRoom().status, 'CELEBRATING');
        assert.equal(result.evaluation.winners.length, 1);
      }
    }
    assert.equal(won, true);
  });

  test('advancePhase move para a próxima fase e depois finaliza', () => {
    const engine = new RoomEngine([
      { mode: 'QUATRO_CANTOS', prizeLabel: 'Fase 1' },
      { mode: 'CARTELA_CHEIA', prizeLabel: 'Fase 2' },
    ]);
    engine.issueCard('p1', 'Ana');
    engine.start();

    let wonResult: ReturnType<typeof engine.drawNext> = null;
    for (let i = 0; i < 75; i++) {
      const result = engine.drawNext();
      if (result?.phaseWon) {
        wonResult = result;
        break;
      }
    }
    assert.notEqual(wonResult, null);
    assert.equal(engine.getRoom().status, 'CELEBRATING');

    const { nextPhase, finished } = engine.advancePhase();
    assert.equal(finished, false);
    assert.equal(nextPhase?.mode, 'CARTELA_CHEIA');
    assert.equal(engine.getRoom().status, 'RUNNING');

    // Continua sorteando até fechar a cartela cheia (todas as 75 bolas bastam).
    let secondWin = false;
    for (let i = 0; i < 75; i++) {
      const result = engine.drawNext();
      if (!result) break;
      if (result.phaseWon) {
        secondWin = true;
        break;
      }
    }
    assert.equal(secondWin, true);
    const finalAdvance = engine.advancePhase();
    assert.equal(finalAdvance.finished, true);
    assert.equal(engine.getRoom().status, 'FINISHED');
  });

  test('pause impede novos sorteios e resume os libera novamente', () => {
    const engine = new RoomEngine([{ mode: 'QUINA', prizeLabel: 'Prêmio' }]);
    engine.start();
    engine.drawNext();
    engine.pause();
    assert.equal(engine.getRoom().status, 'PAUSED');
    assert.equal(engine.drawNext(), null);

    engine.resume();
    assert.equal(engine.getRoom().status, 'RUNNING');
    assert.notEqual(engine.drawNext(), null);
  });

  test('anunciarVencedorAutomatico=false não celebra sozinho, mas near-win continua', () => {
    const engine = new RoomEngine([{ mode: 'QUATRO_CANTOS', prizeLabel: 'Prêmio' }], {
      anunciarVencedorAutomatico: false,
    });
    const card = engine.issueCard('p1', 'Ana');
    engine.start();

    let sawWinnerFlag = false;
    for (let i = 0; i < 75; i++) {
      const result = engine.drawNext();
      if (!result) break;
      if (result.phaseWon) sawWinnerFlag = true;
      if (result.evaluation.winners.some((w) => w.cardId === card.cardId)) break;
    }

    assert.equal(sawWinnerFlag, false, 'não deveria auto-celebrar com anunciarVencedorAutomatico=false');
    assert.equal(engine.getRoom().status, 'RUNNING');
  });

  test('declareWinner valida contra as bolas sorteadas antes de aceitar', () => {
    const engine = new RoomEngine([{ mode: 'QUATRO_CANTOS', prizeLabel: 'Prêmio' }], {
      anunciarVencedorAutomatico: false,
    });
    const card = engine.issueCard('p1', 'Ana');
    engine.start();
    engine.drawNext();

    assert.throws(() => engine.declareWinner(card.displayNumber), /ainda não fechou/);
    assert.throws(() => engine.declareWinner('#999'), /não encontrada/);

    for (let i = 0; i < 75; i++) {
      const result = engine.drawNext();
      if (!result) break;
      if (result.evaluation.winners.some((w) => w.cardId === card.cardId)) break;
    }

    const { winners } = engine.declareWinner(card.displayNumber);
    assert.equal(winners[0]!.cardId, card.cardId);
    assert.equal(engine.getRoom().status, 'CELEBRATING');
  });

  test('continueRound só funciona depois de FINISHED e exclui quem já ganhou', () => {
    const engine = new RoomEngine([{ mode: 'QUATRO_CANTOS', prizeLabel: 'Prêmio' }]);
    engine.issueCard('p1', 'Ana');
    engine.issueCard('p2', 'Beto');
    engine.start();

    assert.throws(() => engine.continueRound('QUINA', 'Prêmio 2'), /depois que o jogo termina/);

    let winnerCardId: string | null = null;
    for (let i = 0; i < 75; i++) {
      const result = engine.drawNext();
      if (!result) break;
      if (result.phaseWon) {
        winnerCardId = result.evaluation.winners[0]!.cardId;
        break;
      }
    }
    assert.ok(winnerCardId);
    engine.advancePhase(); // não há mais fases pré-configuradas -> FINISHED
    assert.equal(engine.getRoom().status, 'FINISHED');

    const newPhase = engine.continueRound('QUINA', 'Prêmio 2');
    assert.equal(engine.getRoom().status, 'RUNNING');
    assert.equal(engine.getRoom().currentPhaseId, newPhase.id);
    assert.equal(engine.getRoom().phases.length, 2);
    // Vitória repetida passa a ser proibida — quem já ganhou fica de fora.
    assert.equal(engine.getRoom().settings.permitirVitoriaRepetida, false);

    // Sorteia até a QUINA fechar de novo: só a cartela que NÃO ganhou antes
    // pode vencer, já que permitirVitoriaRepetida virou false.
    for (let i = 0; i < 75; i++) {
      const result = engine.drawNext();
      if (!result) break;
      if (result.phaseWon) {
        for (const w of result.evaluation.winners) {
          assert.notEqual(w.cardId, winnerCardId, 'quem já ganhou não pode vencer a rodada seguinte');
        }
        break;
      }
    }
  });
});
