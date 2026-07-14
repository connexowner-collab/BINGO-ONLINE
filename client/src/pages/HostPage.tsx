import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { bingoAudio, type PreloadProgress } from '../lib/audio';
import type { Ball, NearWinEntry, Phase, RoomPublicState, RoomSettings, WinMode } from '../lib/types';
import { WIN_MODE_OPTIONS } from '../lib/modeLabels';
import { BallDisplay } from '../components/host/BallDisplay';
import { BoardGrid } from '../components/host/BoardGrid';
import { NearWinPanel } from '../components/host/NearWinPanel';
import { WinnerOverlay } from '../components/host/WinnerOverlay';
import { QRJoin } from '../components/host/QRJoin';
import { AdminDrawer } from '../components/host/AdminDrawer';
import { Cloud, RibbonBanner, Star } from '../components/decor/Sparkle';

const EVENT_TITLE = 'BINGO DO ANTHONY';

type PhaseDraft = { mode: WinMode; prizeLabel: string };
type ConnectedPlayer = { name: string; connected: boolean };

export function HostPage() {
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomPublicState | null>(null);
  const [drawnBalls, setDrawnBalls] = useState<Ball[]>([]);
  const [remainingCount, setRemainingCount] = useState(75);
  const [lastBall, setLastBall] = useState<Ball | null>(null);
  const [nearWin, setNearWin] = useState<{
    oneAway: NearWinEntry[];
    twoAway: NearWinEntry[];
    oneAwayExtraCount: number;
    twoAwayExtraCount: number;
  }>({ oneAway: [], twoAway: [], oneAwayExtraCount: 0, twoAwayExtraCount: 0 });
  const [players, setPlayers] = useState<ConnectedPlayer[]>([]);
  const [phaseDrafts, setPhaseDrafts] = useState<PhaseDraft[]>([{ mode: 'QUINA', prizeLabel: 'Prêmio 1' }]);
  const [intervalSeconds, setIntervalSeconds] = useState(6);
  const [drawMode, setDrawMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [error, setError] = useState<string | null>(null);
  const [winnersBanner, setWinnersBanner] = useState<Phase | null>(null);
  const [finalReport, setFinalReport] = useState<unknown>(null);
  const [declareInput, setDeclareInput] = useState('');

  const [audioReady, setAudioReady] = useState(false);
  const [audioProgress, setAudioProgress] = useState<PreloadProgress>({ loaded: 0, total: 78 });
  const [audioFallback, setAudioFallback] = useState(false);

  useEffect(() => {
    function onStateSync(state: RoomPublicState) {
      setRoom(state);
      setDrawnBalls(state.drawnBalls);
      setRemainingCount(state.remainingCount);
      setLastBall(state.drawnBalls.at(-1) ?? null);
    }
    function onBallDrawn(payload: { ball: Ball; totalDrawn: number; remaining: number }) {
      setLastBall(payload.ball);
      setRemainingCount(payload.remaining);
      setDrawnBalls((prev) => (prev.some((b) => b.sequence === payload.ball.sequence) ? prev : [...prev, payload.ball]));
      bingoAudio.playSfx('tick');
      const settings = room?.settings;
      void bingoAudio.playBall(payload.ball, settings?.voiceRepeat ?? true);
    }
    function onNearWin(payload: typeof nearWin) {
      setNearWin(payload);
    }
    function onPhaseWon(payload: { phase: Phase }) {
      setWinnersBanner(payload.phase);
      bingoAudio.playSfx('win');
    }
    function onPhaseStarted() {
      setWinnersBanner(null);
      bingoAudio.playSfx('phase-start');
    }
    function onPlayerJoined(payload: { playerName: string; totalPlayers: number }) {
      setPlayers((prev) => [...prev, { name: payload.playerName, connected: true }]);
    }
    function onPlayerLeft(payload: { playerName: string }) {
      setPlayers((prev) => {
        const idx = prev.findIndex((p) => p.name === payload.playerName && p.connected);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx]!, connected: false };
        return next;
      });
    }
    function onGameFinished(payload: { report: unknown }) {
      setFinalReport(payload.report);
    }
    function onError(payload: { code: string; message: string }) {
      setError(`${payload.code}: ${payload.message}`);
    }

    socket.on('state:sync', onStateSync);
    socket.on('ball:drawn', onBallDrawn);
    socket.on('nearWin:update', onNearWin);
    socket.on('phase:won', onPhaseWon);
    socket.on('phase:started', onPhaseStarted);
    socket.on('room:playerJoined', onPlayerJoined);
    socket.on('room:playerLeft', onPlayerLeft);
    socket.on('game:finished', onGameFinished);
    socket.on('error', onError);

    return () => {
      socket.off('state:sync', onStateSync);
      socket.off('ball:drawn', onBallDrawn);
      socket.off('nearWin:update', onNearWin);
      socket.off('phase:won', onPhaseWon);
      socket.off('phase:started', onPhaseStarted);
      socket.off('room:playerJoined', onPlayerJoined);
      socket.off('room:playerLeft', onPlayerLeft);
      socket.off('game:finished', onGameFinished);
      socket.off('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.settings.voiceRepeat]);

  function createRoom() {
    socket.emit('host:createRoom', { settings: { drawMode, intervalSeconds }, phases: phaseDrafts }, (res) => {
      if (res.ok) setJoinCode(res.joinCode);
      else setError(res.error);
    });
  }

  function updateSettings(partial: Partial<RoomSettings>) {
    socket.emit('host:updateSettings', partial);
  }

  function declareWinner() {
    if (!declareInput.trim()) return;
    const displayNumber = declareInput.trim().startsWith('#') ? declareInput.trim() : `#${declareInput.trim()}`;
    socket.emit('host:declareWinner', { displayNumber });
    setDeclareInput('');
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportReportJSON() {
    const data = finalReport ?? { drawnBalls, phases: room?.phases, joinCode, totalPlayers: players.length };
    download(`bingo-relatorio-${joinCode ?? 'sala'}.json`, JSON.stringify(data, null, 2), 'application/json');
  }

  function exportReportCSV() {
    const header = 'sequencia,letra,numero,horario';
    const rows = drawnBalls.map((b) => `${b.sequence},${b.letter},${b.number},${new Date(b.drawnAt).toISOString()}`);
    download(`bingo-bolas-${joinCode ?? 'sala'}.csv`, [header, ...rows].join('\n'), 'text/csv');
  }

  // --- Tela de criação de sala ---
  if (!room) {
    return (
      <div className="min-h-screen bg-bingoNavy p-6 text-white md:p-10">
        <h1 className="font-display text-3xl font-extrabold text-bingoOrange">Painel de Sorteio</h1>
        <p className="mt-1 text-white/60">
          Configure as fases e crie a sala. Você pode jogar só com o sorteio automático — cartelas digitais são
          opcionais, dá pra usar cartelas físicas de papel.
        </p>
        {error && <p className="mt-2 rounded bg-red-900 p-2 text-red-200">{error}</p>}

        <h2 className="mt-6 font-display text-xl font-bold">Fases</h2>
        <div className="mt-2 space-y-3">
          {phaseDrafts.map((phase, i) => (
            <div key={i} className="rounded-lg bg-bingoNavyLight p-4">
              <div className="flex flex-wrap gap-2">
                {WIN_MODE_OPTIONS.map(({ mode, label }) => {
                  const selected = phase.mode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        const next = [...phaseDrafts];
                        next[i] = { ...next[i]!, mode };
                        setPhaseDrafts(next);
                      }}
                      className="rounded-[9px] px-3.5 py-2 text-[15px] font-bold"
                      style={{
                        background: selected ? '#F5A623' : 'rgba(255,255,255,.06)',
                        color: selected ? '#201B3B' : '#fff',
                        border: `2px solid ${selected ? '#F5A623' : 'rgba(255,255,255,.15)'}`,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  value={phase.prizeLabel}
                  placeholder="Nome do prêmio"
                  onChange={(e) => {
                    const next = [...phaseDrafts];
                    next[i] = { ...next[i]!, prizeLabel: e.target.value };
                    setPhaseDrafts(next);
                  }}
                  className="flex-1 rounded bg-white/10 px-3 py-2"
                />
                <button
                  onClick={() => setPhaseDrafts(phaseDrafts.filter((_, idx) => idx !== i))}
                  className="text-white/50 hover:text-red-400"
                >
                  remover
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setPhaseDrafts([...phaseDrafts, { mode: 'QUINA', prizeLabel: '' }])}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          >
            + fase
          </button>
        </div>

        <h2 className="mt-6 font-display text-xl font-bold">Como sortear</h2>
        <div className="mt-2 flex flex-wrap gap-4 rounded-lg bg-bingoNavyLight p-4">
          <div className="flex gap-2">
            {(['AUTO', 'MANUAL'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setDrawMode(mode)}
                className="rounded-[9px] px-4 py-2 text-[15px] font-bold"
                style={{
                  background: drawMode === mode ? '#F5A623' : 'rgba(255,255,255,.06)',
                  color: drawMode === mode ? '#201B3B' : '#fff',
                  border: `2px solid ${drawMode === mode ? '#F5A623' : 'rgba(255,255,255,.15)'}`,
                }}
              >
                {mode === 'AUTO' ? 'Automático (sorteia sozinho)' : 'Manual (eu clico pra gerar cada número)'}
              </button>
            ))}
          </div>
          {drawMode === 'AUTO' && (
            <label className="flex items-center gap-2">
              Intervalo (s):
              <input
                type="number"
                min={3}
                max={20}
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="w-16 rounded bg-white/10 px-2 py-1"
              />
            </label>
          )}
        </div>

        <button
          onClick={createRoom}
          className="mt-6 rounded-xl bg-bingoOrange px-6 py-3 font-display text-lg font-bold text-bingoNavy hover:brightness-95"
        >
          Criar sala
        </button>
      </div>
    );
  }

  const currentPhase = room.phases.find((p) => p.id === room.currentPhaseId);
  const drawnNumbers = new Set(drawnBalls.map((b) => b.number));

  // --- Lobby (P1 do documento de identidade visual) ---
  if (room.status === 'LOBBY') {
    return (
      <div
        className="relative flex min-h-screen flex-col items-center overflow-hidden text-white"
        style={{ background: 'linear-gradient(180deg,#3E6FD9 0%,#5C8DF2 38%,#10142A 74%)' }}
      >
        <Cloud top={30} left={-60} width={340} height={110} opacity={0.85} />
        <Cloud top={180} right={-80} width={300} height={100} opacity={0.7} />
        <Star top={20} left={300} size={20} />
        <Star top={110} left={480} size={26} />

        <div className="z-10 mt-14">
          <RibbonBanner>{EVENT_TITLE}</RibbonBanner>
        </div>

        <div className="z-10 mt-10 flex flex-wrap items-center justify-center gap-14 px-6">
          <div className="flex flex-col items-center gap-4">
            <QRJoin joinCode={joinCode!} />
          </div>
          <div className="flex flex-col gap-3 text-center md:text-left">
            <div className="text-sm font-bold uppercase tracking-[.08em] text-white/60">código da sala</div>
            <div className="num font-display text-6xl font-extrabold tracking-[.06em] md:text-8xl">{joinCode}</div>
            <div className="flex items-baseline justify-center gap-3 md:justify-start">
              <div className="num font-display text-4xl font-extrabold text-bingoGold">
                {players.filter((p) => p.connected).length}
              </div>
              <div className="font-bold text-white/65">jogadores na sala</div>
            </div>
          </div>
          <div className="max-h-72 w-72 overflow-hidden rounded-[20px] bg-bingoNavyLight p-5">
            <div className="text-sm font-bold uppercase tracking-[.06em] text-white/55">entrando agora</div>
            <ul className="mt-2 max-h-56 overflow-y-auto">
              {players.map((p, i) => (
                <li key={i} className="border-b border-white/10 py-1.5 font-bold">
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="z-10 mt-6 max-w-md text-center text-sm text-white/70">
          Não precisa de cartela digital pra começar — dá pra jogar só com o sorteio automático e cartelas físicas de
          papel. Quem quiser cartela no celular entra pelo QR acima.
        </p>

        <div className="z-10 mt-8 flex flex-col items-center gap-4">
          {!audioReady ? (
            <div className="w-full max-w-sm">
              <button
                onClick={async () => {
                  await bingoAudio.unlockAndPreload(setAudioProgress);
                  setAudioFallback(bingoAudio.isFallback);
                  setAudioReady(true);
                }}
                className="w-full rounded-xl bg-bingoOrange px-6 py-4 font-display text-xl font-bold text-bingoInk hover:brightness-95"
              >
                🔊 Ativar áudio e iniciar
              </button>
              {audioProgress.loaded > 0 && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-bingoOrange transition-all"
                    style={{ width: `${(audioProgress.loaded / audioProgress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              {audioFallback && (
                <p className="rounded bg-yellow-900 px-3 py-1 text-sm text-yellow-200">
                  áudio em modo fallback (voz do navegador)
                </p>
              )}
              <button
                onClick={() => socket.emit('host:startGame', {})}
                className="rounded-xl bg-bingoWin px-8 py-4 font-display text-xl font-bold text-white hover:brightness-95"
              >
                Iniciar Sorteio
              </button>
            </>
          )}
        </div>

        <img
          src="/mascots/mascot-1.png"
          alt=""
          className="pointer-events-none absolute bottom-4 left-2 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-56"
        />
        <img
          src="/mascots/mascot-2.png"
          alt=""
          className="pointer-events-none absolute bottom-4 left-1/2 hidden h-48 w-auto -translate-x-1/2 drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:block"
        />
        <img
          src="/mascots/mascot-3.png"
          alt=""
          className="pointer-events-none absolute bottom-4 right-2 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-56"
        />
      </div>
    );
  }

  // --- Resumo final (seção 10: tela de resumo pós-jogo) ---
  if (room.status === 'FINISHED') {
    const durationMin = Math.round((Date.now() - room.createdAt) / 60000);
    return (
      <div className="min-h-screen bg-bingoNavy p-6 text-white">
        <h1 className="font-display text-3xl font-extrabold text-bingoOrange">Jogo encerrado — Sala {joinCode}</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Jogadores" value={players.length} />
          <Stat label="Bolas sorteadas" value={drawnBalls.length} />
          <Stat label="Duração" value={`${durationMin} min`} />
          <Stat label="Fases" value={room.phases.length} />
        </div>

        <h2 className="mt-8 font-display text-xl font-bold">Vencedores por fase</h2>
        <div className="mt-2 space-y-3">
          {room.phases.map((phase) => (
            <div key={phase.id} className="rounded-xl bg-bingoNavyLight p-4">
              <p className="font-semibold text-bingoOrange">
                {phase.mode} · {phase.prizeLabel}
              </p>
              {phase.winners.length === 0 ? (
                <p className="text-white/50">sem vencedores</p>
              ) : (
                <ul>
                  {phase.winners.map((w) => (
                    <li key={w.cardId}>
                      {w.displayNumber} — {w.playerName} (bola #{w.ballSequence})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={exportReportJSON} className="rounded-lg bg-bingoOrange px-4 py-2 font-semibold text-bingoNavy">
            Exportar JSON
          </button>
          <button onClick={exportReportCSV} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
            Exportar CSV
          </button>
        </div>
      </div>
    );
  }

  // --- Sorteio em andamento (P2) ---
  return (
    <div
      className="relative min-h-screen overflow-hidden pb-28 text-white"
      style={{ background: 'linear-gradient(180deg,#3E6FD9 0%,#5C8DF2 20%,#10142A 46%)' }}
    >
      {winnersBanner && <WinnerOverlay phase={winnersBanner} celebrationSeconds={room.settings.celebrationSeconds} />}

      <Cloud top={14} left={-60} width={300} height={96} opacity={0.7} />
      <Cloud top={60} right={-70} width={260} height={86} opacity={0.55} />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-6 pt-6 md:px-10">
        <h1 className="font-display text-xl font-extrabold text-white md:text-2xl">Sala {joinCode}</h1>
        <AdminDrawer
          settings={room.settings}
          players={players}
          onUpdateSettings={updateSettings}
          onExportReportJson={exportReportJSON}
          onExportReportCsv={exportReportCSV}
        />
      </header>

      {error && <p className="relative z-10 mx-6 mt-2 rounded bg-red-900 p-2 text-red-200 md:mx-10">{error}</p>}

      <div className="relative z-10 mt-8 flex flex-wrap items-start justify-center gap-8 px-6 md:px-10">
        <BallDisplay ball={lastBall} trail={drawnBalls.slice(-5, -1).reverse()} />
        <BoardGrid drawnNumbers={drawnNumbers} currentNumber={lastBall?.number ?? null} />
        <NearWinPanel {...nearWin} />
      </div>

      {!room.settings.anunciarVencedorAutomatico && (
        <div className="relative z-10 mx-auto mt-6 flex max-w-md items-center gap-2 px-6">
          <input
            value={declareInput}
            onChange={(e) => setDeclareInput(e.target.value)}
            placeholder="nº da cartela (ex: 014)"
            className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-white/40"
          />
          <button
            onClick={declareWinner}
            className="rounded-lg bg-bingoWin px-4 py-2 font-bold text-white hover:brightness-95"
          >
            Declarar vencedor
          </button>
        </div>
      )}

      <img
        src="/mascots/mascot-3.png"
        alt=""
        className="pointer-events-none absolute bottom-24 right-8 hidden h-56 w-auto opacity-90 drop-shadow-[0_16px_20px_rgba(0,0,0,.4)] lg:block"
      />

      <div className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-bingoNavyLight px-6 py-4 md:px-16">
        <div style={{ background: '#5C8DF2' }} className="rounded-md px-5 py-2 font-bold">
          Fase {(currentPhase?.order ?? 0) + 1} de {room.phases.length} · {currentPhase?.mode} ·{' '}
          {currentPhase?.prizeLabel}
        </div>
        <div className="num flex gap-8 font-extrabold">
          <div>
            {drawnBalls.length}/75 bolas · restam {remainingCount}
          </div>
          <div>{players.filter((p) => p.connected).length} jogadores</div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => socket.emit('host:pause', {})} className="rounded-lg bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
            Pausar
          </button>
          <button onClick={() => socket.emit('host:resume', {})} className="rounded-lg bg-white/10 px-4 py-2 font-bold hover:bg-white/20">
            Retomar
          </button>
          {room.settings.drawMode === 'MANUAL' && (
            <button
              onClick={() => socket.emit('host:drawNext', {})}
              className="rounded-lg bg-bingoOrange px-5 py-2 font-bold text-bingoInk hover:brightness-95"
            >
              Gerar próximo número
            </button>
          )}
          <button
            onClick={() => socket.emit('host:repeatLastBall', {})}
            className="rounded-lg bg-white/10 px-4 py-2 font-bold hover:bg-white/20"
          >
            Repetir
          </button>
          <button onClick={() => socket.emit('host:endGame', {})} className="rounded-lg bg-red-700 px-4 py-2 font-bold hover:bg-red-600">
            Encerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-bingoNavyLight p-4 text-center">
      <div className="font-display text-2xl font-extrabold text-bingoOrange">{value}</div>
      <div className="text-sm text-white/60">{label}</div>
    </div>
  );
}
