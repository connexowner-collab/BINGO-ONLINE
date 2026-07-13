import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import { bingoAudio, type PreloadProgress } from '../lib/audio';
import type { Ball, NearWinEntry, Phase, RoomPublicState, RoomSettings, WinMode } from '../lib/types';
import { BallDisplay } from '../components/host/BallDisplay';
import { BoardGrid } from '../components/host/BoardGrid';
import { NearWinPanel } from '../components/host/NearWinPanel';
import { WinnerOverlay } from '../components/host/WinnerOverlay';
import { QRJoin } from '../components/host/QRJoin';
import { AdminDrawer } from '../components/host/AdminDrawer';

const WIN_MODES: WinMode[] = [
  'QUINA',
  'COLUNA',
  'DIAGONAL',
  'LINHA_QUALQUER',
  'QUATRO_CANTOS',
  'X',
  'MOLDURA',
  'CARTELA_CHEIA',
];

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
      <div className="min-h-screen bg-bingoNavy p-6 text-white">
        <h1 className="font-display text-3xl font-extrabold text-bingoOrange">Painel de Sorteio</h1>
        <p className="mt-1 text-white/60">Configure as fases e crie a sala.</p>
        {error && <p className="mt-2 rounded bg-red-900 p-2 text-red-200">{error}</p>}

        <h2 className="mt-6 font-display text-xl font-bold">Fases</h2>
        <div className="mt-2 space-y-2">
          {phaseDrafts.map((phase, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-bingoNavyLight p-3">
              <select
                value={phase.mode}
                onChange={(e) => {
                  const next = [...phaseDrafts];
                  next[i] = { ...next[i]!, mode: e.target.value as WinMode };
                  setPhaseDrafts(next);
                }}
                className="rounded bg-white/10 px-2 py-1"
              >
                {WIN_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={phase.prizeLabel}
                placeholder="Nome do prêmio"
                onChange={(e) => {
                  const next = [...phaseDrafts];
                  next[i] = { ...next[i]!, prizeLabel: e.target.value };
                  setPhaseDrafts(next);
                }}
                className="flex-1 rounded bg-white/10 px-2 py-1"
              />
              <button
                onClick={() => setPhaseDrafts(phaseDrafts.filter((_, idx) => idx !== i))}
                className="text-white/50 hover:text-red-400"
              >
                remover
              </button>
            </div>
          ))}
          <button
            onClick={() => setPhaseDrafts([...phaseDrafts, { mode: 'QUINA', prizeLabel: '' }])}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
          >
            + fase
          </button>
        </div>

        <h2 className="mt-6 font-display text-xl font-bold">Configurações</h2>
        <div className="mt-2 flex flex-wrap gap-4 rounded-lg bg-bingoNavyLight p-3">
          <label className="flex items-center gap-2">
            Modo:
            <select
              value={drawMode}
              onChange={(e) => setDrawMode(e.target.value as 'AUTO' | 'MANUAL')}
              className="rounded bg-white/10 px-2 py-1"
            >
              <option value="AUTO">AUTO</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </label>
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
        </div>

        <button
          onClick={createRoom}
          className="mt-6 rounded-xl bg-bingoOrange px-6 py-3 font-display text-lg font-bold text-bingoNavy hover:brightness-95"
        >
          Criar sala
        </button>

        <footer className="mt-10 text-xs text-white/30">Bingo recreativo. Sem apostas ou prêmios em dinheiro.</footer>
      </div>
    );
  }

  const currentPhase = room.phases.find((p) => p.id === room.currentPhaseId);
  const drawnNumbers = new Set(drawnBalls.map((b) => b.number));

  // --- Lobby: aguardando desbloqueio de áudio + início ---
  if (room.status === 'LOBBY') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bingoNavy p-6 text-center text-white">
        <h1 className="font-display text-3xl font-extrabold text-bingoOrange">BINGO · Sala {joinCode}</h1>
        <QRJoin joinCode={joinCode!} />
        <p className="text-white/70">{players.filter((p) => p.connected).length} jogador(es) entraram</p>
        <ul className="max-h-32 overflow-y-auto text-white/60">
          {players.map((p, i) => (
            <li key={i}>{p.name}</li>
          ))}
        </ul>

        {!audioReady ? (
          <div className="w-full max-w-sm">
            <button
              onClick={async () => {
                await bingoAudio.unlockAndPreload(setAudioProgress);
                setAudioFallback(bingoAudio.isFallback);
                setAudioReady(true);
              }}
              className="w-full rounded-xl bg-bingoOrange px-6 py-4 font-display text-xl font-bold text-bingoNavy hover:brightness-95"
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
              className="rounded-xl bg-green-500 px-8 py-4 font-display text-xl font-bold text-white hover:brightness-95"
            >
              Iniciar Sorteio
            </button>
          </>
        )}

        <footer className="mt-6 text-xs text-white/30">Bingo recreativo. Sem apostas ou prêmios em dinheiro.</footer>
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

        <footer className="mt-8 text-xs text-white/30">Bingo recreativo. Sem apostas ou prêmios em dinheiro.</footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bingoNavy p-4 text-white md:p-6">
      {winnersBanner && <WinnerOverlay phase={winnersBanner} celebrationSeconds={room.settings.celebrationSeconds} />}

      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-extrabold text-bingoOrange md:text-2xl">
          BINGO · Sala {joinCode} · {room.status}
        </h1>
        <p className="text-white/70">
          Fase {(currentPhase?.order ?? 0) + 1}/{room.phases.length}: {currentPhase?.mode} · Prêmio:{' '}
          {currentPhase?.prizeLabel}
        </p>
        <AdminDrawer
          settings={room.settings}
          players={players}
          onUpdateSettings={updateSettings}
          onExportReportJson={exportReportJSON}
          onExportReportCsv={exportReportCSV}
        />
      </header>

      {error && <p className="mt-2 rounded bg-red-900 p-2 text-red-200">{error}</p>}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <BallDisplay ball={lastBall} />
          <p className="text-center text-white/70">
            Últimas: {drawnBalls.slice(-4).map((b) => b.number).join(' · ') || '—'}
          </p>
          <BoardGrid drawnNumbers={drawnNumbers} />
          <p className="text-center text-white/60">
            Bolas sorteadas: {drawnBalls.length}/75 (restam {remainingCount}) · Jogadores:{' '}
            {players.filter((p) => p.connected).length}
          </p>
        </div>
        <NearWinPanel {...nearWin} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => socket.emit('host:pause', {})} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
          ⏸ Pausar
        </button>
        <button onClick={() => socket.emit('host:resume', {})} className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20">
          ▶ Retomar
        </button>
        {room.settings.drawMode === 'MANUAL' && (
          <button
            onClick={() => socket.emit('host:drawNext', {})}
            className="rounded-lg bg-bingoOrange px-4 py-2 font-semibold text-bingoNavy hover:brightness-95"
          >
            ⏭ Próxima bola
          </button>
        )}
        <button
          onClick={() => socket.emit('host:repeatLastBall', {})}
          className="rounded-lg bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          🔁 Repetir bola
        </button>
        <button
          onClick={() => socket.emit('host:endGame', {})}
          className="rounded-lg bg-red-700 px-4 py-2 hover:bg-red-600"
        >
          Encerrar
        </button>
      </div>

      <footer className="mt-8 text-xs text-white/30">Bingo recreativo. Sem apostas ou prêmios em dinheiro.</footer>
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
