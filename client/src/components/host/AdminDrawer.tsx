import { useState } from 'react';
import type { RoomSettings } from '../../lib/types';

type ConnectedPlayer = { name: string; connected: boolean };

export function AdminDrawer({
  settings,
  players,
  onUpdateSettings,
  onExportReportJson,
  onExportReportCsv,
}: {
  settings: RoomSettings;
  players: ConnectedPlayer[];
  onUpdateSettings: (partial: Partial<RoomSettings>) => void;
  onExportReportJson: () => void;
  onExportReportCsv: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
      >
        ⚙️ Admin
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="h-full w-full max-w-md overflow-y-auto bg-bingoNavyLight p-10 text-white shadow-[-20px_0_60px_rgba(0,0,0,.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-[30px] font-bold">Configurações</h2>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-[18px] font-extrabold uppercase tracking-[.05em] text-white/55">
                Modo de sorteio
              </div>
              <div className="flex gap-2.5">
                {(['AUTO', 'MANUAL'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdateSettings({ drawMode: mode })}
                    className="rounded-[9px] px-4 py-2.5 text-[16px] font-bold"
                    style={{
                      background: settings.drawMode === mode ? '#F5A623' : 'rgba(255,255,255,.06)',
                      color: settings.drawMode === mode ? '#201B3B' : '#fff',
                      border: `2px solid ${settings.drawMode === mode ? '#F5A623' : 'rgba(255,255,255,.15)'}`,
                    }}
                  >
                    {mode === 'AUTO' ? 'Automático' : 'Manual (gerar próximo número)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2.5">
              <div className="text-[18px] font-extrabold uppercase tracking-[.05em] text-white/55">
                Velocidade do sorteio
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={settings.intervalSeconds}
                  onChange={(e) => onUpdateSettings({ intervalSeconds: Number(e.target.value) })}
                  className="h-2.5 flex-1 accent-bingoOrange"
                  disabled={settings.drawMode !== 'AUTO'}
                />
                <div className="num text-[20px] font-extrabold">{settings.intervalSeconds}s</div>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2.5">
              <div className="text-[18px] font-extrabold uppercase tracking-[.05em] text-white/55">
                Máx. cartelas por jogador
              </div>
              <input
                type="number"
                min={1}
                max={4}
                value={settings.maxCardsPerPlayer}
                onChange={(e) => onUpdateSettings({ maxCardsPerPlayer: Number(e.target.value) })}
                className="w-20 rounded-lg bg-white/10 px-3 py-1.5 text-right"
              />
            </div>

            <div className="mt-7 flex flex-col gap-4">
              <Toggle
                label="Acompanhar cartelas e anunciar vencedor automático"
                checked={settings.anunciarVencedorAutomatico}
                onChange={(v) => onUpdateSettings({ anunciarVencedorAutomatico: v })}
              />
              {!settings.anunciarVencedorAutomatico && (
                <p className="-mt-2 text-sm text-white/50">
                  O painel continua mostrando "quase lá" normalmente, mas quem grita BINGO precisa se anunciar — use
                  "Declarar vencedor" abaixo do quadro.
                </p>
              )}
              <Toggle
                label="Marcação automática da cartela"
                checked={settings.autoMark}
                onChange={(v) => onUpdateSettings({ autoMark: v })}
              />
              <Toggle
                label="Voz do locutor"
                checked={settings.voiceEnabled}
                onChange={(v) => onUpdateSettings({ voiceEnabled: v })}
              />
              <Toggle
                label="Repetir número"
                checked={settings.voiceRepeat}
                onChange={(v) => onUpdateSettings({ voiceRepeat: v })}
              />
              <Toggle
                label="Entrada tardia"
                checked={settings.allowLateJoin}
                onChange={(v) => onUpdateSettings({ allowLateJoin: v })}
              />
              <Toggle
                label="Permitir vitória repetida entre fases"
                checked={settings.permitirVitoriaRepetida}
                onChange={(v) => onUpdateSettings({ permitirVitoriaRepetida: v })}
              />
            </div>

            <h3 className="mb-2 mt-8 font-display text-lg font-bold">Jogadores ({players.length})</h3>
            <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
              {players.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                  {p.name}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex gap-2">
              <button
                onClick={onExportReportJson}
                className="flex-1 rounded-lg bg-bingoOrange px-4 py-2 font-semibold text-bingoNavy hover:brightness-95"
              >
                Exportar JSON
              </button>
              <button
                onClick={onExportReportCsv}
                className="flex-1 rounded-lg bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20"
              >
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Pill switch — mesmo desenho do documento de identidade visual (trilha 52x30, thumb 24px). */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 text-left"
    >
      <span className="text-[19px] font-bold">{label}</span>
      <span
        className="relative shrink-0 rounded-full transition-colors"
        style={{ width: 52, height: 30, background: checked ? '#F5A623' : 'rgba(255,255,255,.15)' }}
      >
        <span
          className="absolute top-[3px] rounded-full bg-white transition-all"
          style={{ width: 24, height: 24, left: checked ? 25 : 3 }}
        />
      </span>
    </button>
  );
}
