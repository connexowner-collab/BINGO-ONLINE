// RoomEngine: gerencia o estado de uma sala — sorteio, pausa, fases.
// Não é puro (gera ids, timestamps), mas não faz I/O externo (sem rede/disco).
// Orquestração de timers (modo AUTO, celebração) fica a cargo do chamador (Fase 2).

import { randomInt } from 'node:crypto';
import { nanoid } from 'nanoid';
import { generateUniqueCard, letterForNumber } from './cards.js';
import { evaluateCardsForMode, type PhaseEvaluation } from './evaluate.js';
import type { Ball, Card, Phase, PhaseWinner, Room, RoomSettings, WinMode } from '../types.js';

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  drawMode: 'AUTO',
  intervalSeconds: 6,
  maxCardsPerPlayer: 1,
  // Marcação manual por padrão: a graça do bingo é o jogador tocar seu próprio
  // número. O servidor sempre valida vitória e near-win a partir das bolas
  // sorteadas, nunca a partir do que o jogador tocou (ver seção 8.2 do spec).
  autoMark: false,
  celebrationSeconds: 12,
  permitirVitoriaRepetida: true,
  allowLateJoin: true,
  voiceEnabled: true,
  voiceRepeat: true,
};

export type PhaseInput = {
  mode: WinMode;
  prizeLabel: string;
};

const JOIN_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateJoinCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += JOIN_CODE_CHARS[randomInt(JOIN_CODE_CHARS.length)];
  }
  return code;
}

function shuffledBallPool(): number[] {
  const pool = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool;
}

export type DrawResult = {
  ball: Ball;
  evaluation: PhaseEvaluation;
  /** true quando a fase ativa fechou nesta bola (sala entra em CELEBRATING). */
  phaseWon: boolean;
};

/**
 * Motor de uma sala de bingo. O servidor é a única fonte da verdade: o
 * cliente nunca decide número sorteado, marcação ou vitória.
 */
export class RoomEngine {
  private room: Room;
  private cards = new Map<string, Card>();
  private playerCardIds = new Map<string, string[]>();
  private cardHashes = new Set<string>();
  private cardSerial = 0;
  /** cardIds que já venceram alguma fase — usado quando permitirVitoriaRepetida = false. */
  private previousWinnerCardIds = new Set<string>();

  constructor(phaseInputs: PhaseInput[], settings: Partial<RoomSettings> = {}) {
    if (phaseInputs.length === 0) {
      throw new Error('Uma sala precisa de ao menos uma fase configurada');
    }

    const resolvedSettings: RoomSettings = { ...DEFAULT_ROOM_SETTINGS, ...settings };

    const phases: Phase[] = phaseInputs.map((input, index) => ({
      id: nanoid(),
      order: index,
      mode: input.mode,
      prizeLabel: input.prizeLabel,
      status: index === 0 ? 'ACTIVE' : 'PENDING',
      winners: [],
    }));

    this.room = {
      roomId: nanoid(),
      joinCode: generateJoinCode(),
      status: 'LOBBY',
      drawnBalls: [],
      remainingBalls: shuffledBallPool(),
      phases,
      currentPhaseId: phases[0]!.id,
      settings: resolvedSettings,
      createdAt: Date.now(),
    };
  }

  /**
   * Reconstrói um motor a partir de estado persistido (seção 9.3: recuperação
   * após restart). Usa `Object.create` para pular o construtor normal, que
   * sempre gera sala/joinCode/embaralhamento novos.
   */
  static restore(room: Room, cards: Card[]): RoomEngine {
    const engine = Object.create(RoomEngine.prototype) as RoomEngine;
    engine.room = room;
    engine.cards = new Map(cards.map((c) => [c.cardId, c]));
    engine.playerCardIds = new Map();
    for (const card of cards) {
      const list = engine.playerCardIds.get(card.playerId) ?? [];
      list.push(card.cardId);
      engine.playerCardIds.set(card.playerId, list);
    }
    engine.cardHashes = new Set(cards.map((c) => c.hash));
    engine.cardSerial = cards.length;
    engine.previousWinnerCardIds = new Set(
      room.phases.flatMap((p) => (p.status === 'COMPLETED' ? p.winners.map((w) => w.cardId) : [])),
    );
    return engine;
  }

  getRoom(): Readonly<Room> {
    return this.room;
  }

  getCard(cardId: string): Card | undefined {
    return this.cards.get(cardId);
  }

  getCardsForPlayer(playerId: string): Card[] {
    return (this.playerCardIds.get(playerId) ?? []).map((id) => this.cards.get(id)!);
  }

  private allCards(): Card[] {
    return [...this.cards.values()];
  }

  private eligibleCardsForCurrentPhase(): Card[] {
    if (this.room.settings.permitirVitoriaRepetida) return this.allCards();
    return this.allCards().filter((c) => !this.previousWinnerCardIds.has(c.cardId));
  }

  private currentPhase(): Phase {
    const phase = this.room.phases.find((p) => p.id === this.room.currentPhaseId);
    if (!phase) throw new Error('Nenhuma fase ativa');
    return phase;
  }

  /** Emite uma nova cartela para o jogador, respeitando maxCardsPerPlayer. */
  issueCard(playerId: string, playerName: string): Card {
    const existing = this.playerCardIds.get(playerId) ?? [];
    if (existing.length >= this.room.settings.maxCardsPerPlayer) {
      throw new Error('Limite de cartelas por jogador atingido');
    }

    this.cardSerial += 1;
    const card = generateUniqueCard({
      roomId: this.room.roomId,
      playerId,
      playerName,
      serial: this.cardSerial,
      existingHashes: this.cardHashes,
    });

    this.cards.set(card.cardId, card);
    this.cardHashes.add(card.hash);
    this.playerCardIds.set(playerId, [...existing, card.cardId]);
    return card;
  }

  start(): void {
    if (this.room.status !== 'LOBBY') {
      throw new Error(`Não é possível iniciar uma sala com status ${this.room.status}`);
    }
    this.room.status = 'RUNNING';
  }

  updateSettings(partial: Partial<RoomSettings>): void {
    this.room.settings = { ...this.room.settings, ...partial };
  }

  pause(): void {
    if (this.room.status !== 'RUNNING') return;
    this.room.status = 'PAUSED';
  }

  resume(): void {
    if (this.room.status !== 'PAUSED') return;
    this.room.status = 'RUNNING';
  }

  /**
   * Sorteia a próxima bola e avalia a fase ativa (seção 6, passos 1-5).
   * Retorna null se não há mais bolas ou a sala não está em RUNNING.
   */
  drawNext(): DrawResult | null {
    if (this.room.status !== 'RUNNING') return null;
    if (this.room.remainingBalls.length === 0) return null;

    const number = this.room.remainingBalls.shift()!;
    const ball: Ball = {
      number,
      letter: letterForNumber(number),
      drawnAt: Date.now(),
      sequence: this.room.drawnBalls.length + 1,
    };
    this.room.drawnBalls.push(ball);

    const phase = this.currentPhase();
    const drawnNumbers = new Set(this.room.drawnBalls.map((b) => b.number));
    const evaluation = evaluateCardsForMode(this.eligibleCardsForCurrentPhase(), drawnNumbers, phase.mode);

    if (evaluation.winners.length > 0) {
      const winners: PhaseWinner[] = evaluation.winners.map((card) => ({
        cardId: card.cardId,
        displayNumber: card.displayNumber,
        playerName: card.playerName,
        ballSequence: ball.sequence,
      }));
      phase.winners = winners;
      phase.status = 'COMPLETED';
      for (const w of winners) this.previousWinnerCardIds.add(w.cardId);
      this.room.status = 'CELEBRATING';
      return { ball, evaluation, phaseWon: true };
    }

    return { ball, evaluation, phaseWon: false };
  }

  /** Repete a última bola sorteada (para o host re-falar o número). */
  getLastBall(): Ball | null {
    return this.room.drawnBalls.at(-1) ?? null;
  }

  /**
   * Avança para a próxima fase pendente, ou finaliza o jogo se não houver mais.
   * Deve ser chamado pelo host após `celebrationSeconds` (seção 3).
   */
  advancePhase(): { nextPhase: Phase | null; finished: boolean } {
    if (this.room.status !== 'CELEBRATING') {
      throw new Error('Só é possível avançar de fase durante CELEBRATING');
    }

    const currentOrder = this.currentPhase().order;
    const nextPhase = this.room.phases.find((p) => p.order === currentOrder + 1);

    if (!nextPhase) {
      this.room.status = 'FINISHED';
      this.room.currentPhaseId = null;
      return { nextPhase: null, finished: true };
    }

    nextPhase.status = 'ACTIVE';
    this.room.currentPhaseId = nextPhase.id;
    this.room.status = 'RUNNING';
    return { nextPhase, finished: false };
  }

  endGame(): void {
    this.room.status = 'FINISHED';
    this.room.currentPhaseId = null;
  }
}
