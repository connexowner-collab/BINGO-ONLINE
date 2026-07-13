import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { setupWakeLock } from '../lib/wakeLock';
import type { Ball, Card, Phase, RoomPublicState } from '../lib/types';
import { BingoCard } from '../components/play/BingoCard';
import { ProgressBar } from '../components/play/ProgressBar';
import { WinOverlay } from '../components/play/WinOverlay';
import { ConnectionBanner } from '../components/play/ConnectionBanner';

function joinCodeFromPath(): string {
  const parts = window.location.pathname.split('/').filter(Boolean);
  return (parts[1] ?? '').toUpperCase();
}

function loadTapped(cardId: string): Set<number> {
  try {
    const raw = localStorage.getItem(`bingo:tapped:${cardId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveTapped(cardId: string, tapped: Set<number>) {
  localStorage.setItem(`bingo:tapped:${cardId}`, JSON.stringify([...tapped]));
}

export function PlayPage() {
  const [joinCode, setJoinCode] = useState(joinCodeFromPath());
  const [name, setName] = useState(localStorage.getItem('bingo:playerName') ?? '');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [drawnNumbers, setDrawnNumbers] = useState<Set<number>>(new Set());
  const [lastBall, setLastBall] = useState<Ball | null>(null);
  const [progressByCard, setProgressByCard] = useState<Record<string, { marked: number[]; missingForCurrentPhase: number }>>({});
  const [tappedByCard, setTappedByCard] = useState<Record<string, Set<number>>>({});
  const [connected, setConnected] = useState(socket.connected);
  const [wonEntry, setWonEntry] = useState<{ displayNumber: string; prizeLabel: string } | null>(null);

  const [highContrast, setHighContrast] = useState(localStorage.getItem('bingo:highContrast') === '1');
  const [largeText, setLargeText] = useState(localStorage.getItem('bingo:largeText') === '1');

  useEffect(() => setupWakeLock(), []);

  useEffect(() => {
    function onCardAssigned(payload: { cards: Card[] }) {
      setCards(payload.cards);
      setTappedByCard((prev) => {
        const next = { ...prev };
        for (const c of payload.cards) if (!next[c.cardId]) next[c.cardId] = loadTapped(c.cardId);
        return next;
      });
    }
    function onProgress(payload: { cardId: string; marked: number[]; missingForCurrentPhase: number }) {
      setProgressByCard((prev) => ({
        ...prev,
        [payload.cardId]: { marked: payload.marked, missingForCurrentPhase: payload.missingForCurrentPhase },
      }));
      if (navigator.vibrate) navigator.vibrate(60);
    }
    function onStateSync(state: RoomPublicState) {
      setRoom(state);
      setDrawnNumbers(new Set(state.drawnBalls.map((b) => b.number)));
      setLastBall(state.drawnBalls.at(-1) ?? null);
    }
    function onBallDrawn(payload: { ball: Ball }) {
      setLastBall(payload.ball);
      setDrawnNumbers((prev) => new Set(prev).add(payload.ball.number));
    }
    function onPhaseWon(payload: { phase: Phase }) {
      setCards((currentCards) => {
        const mine = payload.phase.winners.find((w) => currentCards.some((c) => c.cardId === w.cardId));
        if (mine) setWonEntry({ displayNumber: mine.displayNumber, prizeLabel: payload.phase.prizeLabel });
        return currentCards;
      });
    }
    function onPhaseStarted() {
      setWonEntry(null);
    }
    function onError(payload: { code: string; message: string }) {
      setError(`${payload.code}: ${payload.message}`);
    }
    function onConnect() {
      setConnected(true);
      const storedPlayerId = localStorage.getItem('bingo:playerId');
      const storedJoinCode = localStorage.getItem('bingo:joinCode');
      if (storedPlayerId && storedJoinCode) {
        socket.emit('player:join', { joinCode: storedJoinCode, name, playerId: storedPlayerId }, (res) => {
          if (res.ok) setJoined(true);
        });
      }
    }
    function onDisconnect() {
      setConnected(false);
    }

    socket.on('player:cardAssigned', onCardAssigned);
    socket.on('player:progress', onProgress);
    socket.on('state:sync', onStateSync);
    socket.on('ball:drawn', onBallDrawn);
    socket.on('phase:won', onPhaseWon);
    socket.on('phase:started', onPhaseStarted);
    socket.on('error', onError);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    // socket.io pode conectar antes deste efeito rodar (ex.: troca de aba) —
    // sincroniza o estado atual para o banner de reconexão não ficar preso.
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('player:cardAssigned', onCardAssigned);
      socket.off('player:progress', onProgress);
      socket.off('state:sync', onStateSync);
      socket.off('ball:drawn', onBallDrawn);
      socket.off('phase:won', onPhaseWon);
      socket.off('phase:started', onPhaseStarted);
      socket.off('error', onError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(() => socket.emit('player:heartbeat', {}), 20_000);
    return () => clearInterval(interval);
  }, [joined]);

  function join() {
    if (!joinCode || !name) return;
    const storedPlayerId = localStorage.getItem('bingo:playerId') ?? undefined;
    socket.emit('player:join', { joinCode, name, playerId: storedPlayerId }, (res) => {
      if (res.ok) {
        localStorage.setItem('bingo:playerId', res.playerId);
        localStorage.setItem('bingo:playerName', name);
        localStorage.setItem('bingo:joinCode', joinCode);
        setJoined(true);
      } else {
        setError(res.error);
      }
    });
  }

  function toggleTap(cardId: string, n: number) {
    setTappedByCard((prev) => {
      const current = new Set(prev[cardId] ?? []);
      if (current.has(n)) current.delete(n);
      else current.add(n);
      saveTapped(cardId, current);
      return { ...prev, [cardId]: current };
    });
  }

  if (!joined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bingoNavy p-6 text-white">
        <h1 className="font-display text-3xl font-extrabold text-bingoOrange">Entrar no Bingo</h1>
        {error && <p className="rounded bg-red-900 p-2 text-red-200">{error}</p>}
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="Código da sala"
          className="w-full max-w-xs rounded-lg bg-white/10 px-4 py-3 text-center text-xl uppercase tracking-widest"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="w-full max-w-xs rounded-lg bg-white/10 px-4 py-3 text-center text-xl"
        />
        <button
          onClick={join}
          className="w-full max-w-xs rounded-xl bg-bingoOrange px-6 py-3 font-display text-xl font-bold text-bingoNavy hover:brightness-95"
        >
          Entrar
        </button>
        <footer className="mt-6 text-xs text-white/30">Bingo recreativo. Sem apostas ou prêmios em dinheiro.</footer>
      </div>
    );
  }

  const currentPhase = room?.phases.find((p) => p.id === room.currentPhaseId);
  const autoMark = room?.settings.autoMark ?? false;

  return (
    <div className={`min-h-screen p-4 ${highContrast ? 'bg-white text-black' : 'bg-bingoNavy text-white'}`}>
      <ConnectionBanner connected={connected} />
      {wonEntry && <WinOverlay displayNumber={wonEntry.displayNumber} prizeLabel={wonEntry.prizeLabel} />}

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Olá, {name}</h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => {
              const v = !largeText;
              setLargeText(v);
              localStorage.setItem('bingo:largeText', v ? '1' : '0');
            }}
            className="rounded bg-white/10 px-2 py-1"
          >
            A{largeText ? '−' : '+'}
          </button>
          <button
            onClick={() => {
              const v = !highContrast;
              setHighContrast(v);
              localStorage.setItem('bingo:highContrast', v ? '1' : '0');
            }}
            className="rounded bg-white/10 px-2 py-1"
          >
            ◐ contraste
          </button>
        </div>
      </div>

      <p className="mt-1 text-sm opacity-70">
        Fase atual: {currentPhase?.mode} · Prêmio: {currentPhase?.prizeLabel}
      </p>

      <div className="mt-3">
        <ProgressBar lastBall={lastBall} missing={progressByCard[cards[0]?.cardId ?? '']?.missingForCurrentPhase ?? null} />
      </div>

      {!autoMark && (
        <p className="mt-2 text-center text-sm opacity-70">Toque nos números sorteados para marcar sua cartela.</p>
      )}

      <div className="mt-4 flex flex-col items-center gap-6">
        {cards.map((card) => (
          <BingoCard
            key={card.cardId}
            card={card}
            drawnNumbers={drawnNumbers}
            autoMark={autoMark}
            tappedNumbers={tappedByCard[card.cardId] ?? new Set()}
            onToggleTap={(n) => toggleTap(card.cardId, n)}
            highContrast={highContrast}
            largeText={largeText}
          />
        ))}
      </div>

      {(room?.settings.maxCardsPerPlayer ?? 1) > cards.length && (
        <button
          onClick={() => socket.emit('player:requestExtraCard', {})}
          className="mx-auto mt-4 block rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          + cartela extra
        </button>
      )}

      <footer className="mt-8 text-center text-xs opacity-40">Bingo recreativo. Sem apostas ou prêmios em dinheiro.</footer>
    </div>
  );
}
