import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { setupWakeLock } from '../lib/wakeLock';
import type { Ball, Card, Phase, RoomPublicState } from '../lib/types';
import { BingoCard } from '../components/play/BingoCard';
import { WinOverlay } from '../components/play/WinOverlay';
import { ConnectionBanner } from '../components/play/ConnectionBanner';
import { RibbonBanner, Cloud, Star } from '../components/decor/Sparkle';

const EVENT_TITLE = 'BINGO DO ANTHONY';

const MODE_LABELS: Record<string, string> = {
  QUINA: 'quina',
  COLUNA: 'coluna',
  DIAGONAL: 'diagonal',
  LINHA_QUALQUER: 'linha',
  QUATRO_CANTOS: 'quatro cantos',
  X: 'x',
  MOLDURA: 'moldura',
  CARTELA_CHEIA: 'cartela cheia',
};

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
  const [activeCardIdx, setActiveCardIdx] = useState(0);
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

  // --- M1 · Entrada ---
  if (!joined) {
    return (
      <div
        className="relative flex min-h-screen flex-col items-center justify-center gap-7 overflow-hidden px-8 text-center"
        style={{ background: 'linear-gradient(180deg,#5C8DF2 0%,#A9C6F7 30%,#FFF8EA 55%)' }}
      >
        <Cloud top={40} left={-40} width={220} height={70} opacity={0.85} />
        <Cloud top={100} right={-50} width={190} height={64} opacity={0.7} />
        <Star top={64} left={40} size={18} opacity={0.6} color="#F5A623" />
        <Star top={130} right={40} size={14} opacity={0.5} color="#F5A623" />

        <RibbonBanner fontSize={26}>{EVENT_TITLE}</RibbonBanner>

        {error && <p className="rounded bg-red-900 px-3 py-2 text-sm text-red-100">{error}</p>}

        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="código da sala"
          className="w-full max-w-xs rounded-2xl border-2 bg-white px-5 py-4 text-center text-xl font-bold uppercase tracking-widest text-bingoInk"
          style={{ borderColor: '#EADFC2' }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="seu nome"
          className="w-full max-w-xs rounded-2xl border-2 bg-white px-5 py-4 text-center text-xl font-bold text-bingoInk"
          style={{ borderColor: '#EADFC2' }}
        />
        <button
          onClick={join}
          className="w-full max-w-xs rounded-2xl bg-bingoOrange py-4 font-display text-xl font-extrabold text-bingoInk hover:brightness-95"
        >
          Entrar na sala
        </button>

        <img
          src="/mascots/mascot-1.png"
          alt=""
          className="pointer-events-none absolute bottom-3 left-1 h-24 w-auto drop-shadow-[0_8px_10px_rgba(0,0,0,.3)]"
        />
        <img
          src="/mascots/mascot-3.png"
          alt=""
          className="pointer-events-none absolute bottom-3 right-1 h-24 w-auto drop-shadow-[0_8px_10px_rgba(0,0,0,.3)]"
        />

        <footer className="mt-16 text-xs text-bingoInk/40">Bingo recreativo. Sem apostas ou prêmios em dinheiro.</footer>
      </div>
    );
  }

  const currentPhase = room?.phases.find((p) => p.id === room.currentPhaseId);
  const autoMark = room?.settings.autoMark ?? false;
  const activeCard = cards[activeCardIdx] ?? cards[0];
  const activeProgress = activeCard ? progressByCard[activeCard.cardId] : undefined;
  const modeLabel = currentPhase ? (MODE_LABELS[currentPhase.mode] ?? currentPhase.mode.toLowerCase()) : '';

  // --- M2/M4 · Cartela em jogo (ou desconectado) ---
  return (
    <div
      className="min-h-screen"
      style={{ background: highContrast ? '#fff' : '#FFF8EA', color: highContrast ? '#000' : '#201B3B' }}
    >
      {wonEntry && <WinOverlay displayNumber={wonEntry.displayNumber} prizeLabel={wonEntry.prizeLabel} />}

      <div
        className="flex items-center justify-between px-5 py-4 text-white"
        style={{ background: '#201B3B', opacity: connected ? 1 : 0.6 }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/mascots/mascot-1.png" alt="" className="h-10 w-auto" />
          <div className="num text-lg font-extrabold">CARTELA {activeCard?.displayNumber ?? '—'}</div>
        </div>
        <div className="font-display text-3xl font-extrabold" style={{ color: connected ? '#F5A623' : 'rgba(245,166,35,.3)' }}>
          {lastBall ? `${lastBall.letter}${lastBall.number}` : '—'}
        </div>
      </div>

      {cards.length > 1 && (
        <div className="flex gap-2 px-4 pt-3">
          {cards.map((c, i) => {
            const selected = i === activeCardIdx;
            return (
              <button
                key={c.cardId}
                onClick={() => setActiveCardIdx(i)}
                className="flex-1 rounded-[9px] py-2 text-center text-sm font-extrabold"
                style={{ background: selected ? '#201B3B' : '#F1E9D2', color: selected ? '#fff' : '#8A7B4E' }}
              >
                {c.displayNumber}
              </button>
            );
          })}
        </div>
      )}

      <ConnectionBanner connected={connected} />

      <div className="mt-2.5 py-3 text-center font-display text-xl font-extrabold text-white" style={{ background: '#5C8DF2' }}>
        {activeProgress ? `Faltam ${activeProgress.missingForCurrentPhase} números para a ${modeLabel}` : `Jogando ${modeLabel}`}
      </div>

      {!autoMark && connected && (
        <p className="px-4 pt-3 text-center text-sm opacity-70">Toque nos números sorteados para marcar sua cartela.</p>
      )}

      <div className="flex flex-col items-center gap-6 p-4" style={{ opacity: connected ? 1 : 0.4 }}>
        {activeCard && (
          <BingoCard
            key={activeCard.cardId}
            card={activeCard}
            drawnNumbers={drawnNumbers}
            autoMark={autoMark}
            tappedNumbers={tappedByCard[activeCard.cardId] ?? new Set()}
            onToggleTap={(n) => toggleTap(activeCard.cardId, n)}
            highContrast={highContrast}
            largeText={largeText}
          />
        )}
      </div>

      {(room?.settings.maxCardsPerPlayer ?? 1) > cards.length && (
        <button
          onClick={() => socket.emit('player:requestExtraCard', {})}
          className="mx-auto mb-4 block rounded-lg px-4 py-2"
          style={{ background: 'rgba(32,27,59,.08)' }}
        >
          + cartela extra
        </button>
      )}

      <div className="flex items-center justify-center gap-3 border-t px-4 py-3.5" style={{ borderColor: '#EADFC2' }}>
        <button
          onClick={() => {
            const v = !largeText;
            setLargeText(v);
            localStorage.setItem('bingo:largeText', v ? '1' : '0');
          }}
          className="text-sm font-bold"
          style={{ color: '#8A7B4E' }}
        >
          fonte ampliada
        </button>
        <span
          className="relative rounded-full"
          style={{ width: 40, height: 24, background: largeText ? '#F5A623' : '#EADFC2' }}
          onClick={() => {
            const v = !largeText;
            setLargeText(v);
            localStorage.setItem('bingo:largeText', v ? '1' : '0');
          }}
        >
          <span
            className="absolute top-[2px] rounded-full bg-white transition-all"
            style={{ width: 20, height: 20, left: largeText ? 18 : 2 }}
          />
        </span>
        <button
          onClick={() => {
            const v = !highContrast;
            setHighContrast(v);
            localStorage.setItem('bingo:highContrast', v ? '1' : '0');
          }}
          className="ml-4 text-sm font-bold"
          style={{ color: '#8A7B4E' }}
        >
          ◐ alto contraste
        </button>
      </div>

      <footer className="pb-6 pt-2 text-center text-xs" style={{ color: '#9A927E' }}>
        Bingo recreativo. Sem apostas ou prêmios em dinheiro.
      </footer>
    </div>
  );
}
