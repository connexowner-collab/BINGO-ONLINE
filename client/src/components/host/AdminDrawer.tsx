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
            className="h-full w-full max-w-sm overflow-y-auto bg-bingoNavyLight p-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Configurações</h2>
              <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span>Modo de sorteio</span>
                <select
                  className="rounded bg-white/10 px-2 py-1"
                  value={settings.drawMode}
                  onChange={(e) => onUpdateSettings({ drawMode: e.target.value as 'AUTO' | 'MANUAL' })}
                >
                  <option value="AUTO">AUTO</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </label>

              <label className="flex items-center justify-between">
                <span>Intervalo (3–20s): {settings.intervalSeconds}s</span>
                <input
                  type="range"
                  min={3}
                  max={20}
                  value={settings.intervalSeconds}
                  onChange={(e) => onUpdateSettings({ intervalSeconds: Number(e.target.value) })}
                />
              </label>

              <label className="flex items-center justify-between">
                <span>Máx. cartelas por jogador</span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={settings.maxCardsPerPlayer}
                  onChange={(e) => onUpdateSettings({ maxCardsPerPlayer: Number(e.target.value) })}
                  className="w-16 rounded bg-white/10 px-2 py-1 text-right"
                />
              </label>

              <ToggleRow
                label="Marcação automática da cartela"
                checked={settings.autoMark}
                onChange={(v) => onUpdateSettings({ autoMark: v })}
              />
              <ToggleRow
                label="Voz ativada"
                checked={settings.voiceEnabled}
                onChange={(v) => onUpdateSettings({ voiceEnabled: v })}
              />
              <ToggleRow
                label="Repetir número na voz"
                checked={settings.voiceRepeat}
                onChange={(v) => onUpdateSettings({ voiceRepeat: v })}
              />
              <ToggleRow
                label="Permitir entrada tardia"
                checked={settings.allowLateJoin}
                onChange={(v) => onUpdateSettings({ allowLateJoin: v })}
              />
              <ToggleRow
                label="Permitir vitória repetida entre fases"
                checked={settings.permitirVitoriaRepetida}
                onChange={(v) => onUpdateSettings({ permitirVitoriaRepetida: v })}
              />
            </div>

            <h3 className="mb-2 mt-6 font-display text-lg font-bold">Jogadores ({players.length})</h3>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
