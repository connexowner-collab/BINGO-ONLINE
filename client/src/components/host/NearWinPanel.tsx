import type { NearWinEntry } from '../../lib/types';

function Group({
  title,
  entries,
  extraCount,
  accent,
}: {
  title: string;
  entries: NearWinEntry[];
  extraCount: number;
  accent: string;
}) {
  return (
    <div>
      <h3 className={`font-display text-sm font-bold uppercase tracking-wide ${accent}`}>
        {title} ({entries.length}
        {extraCount > 0 ? `+${extraCount}` : ''})
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-white/40">ninguém ainda</p>
      ) : (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.displayNumber} className="flex justify-between text-sm text-white/90">
              <span className="font-semibold">{e.displayNumber}</span>
              <span className="text-white/60">{e.playerName}</span>
            </li>
          ))}
        </ul>
      )}
      {extraCount > 0 && <p className="mt-1 text-xs text-white/40">+ {extraCount} outras</p>}
    </div>
  );
}

export function NearWinPanel({
  oneAway,
  twoAway,
  oneAwayExtraCount,
  twoAwayExtraCount,
}: {
  oneAway: NearWinEntry[];
  twoAway: NearWinEntry[];
  oneAwayExtraCount: number;
  twoAwayExtraCount: number;
}) {
  return (
    <div className="space-y-4 rounded-2xl bg-bingoNavyLight p-4">
      <h2 className="font-display text-lg font-bold text-white">⚠️ Quase lá</h2>
      <Group title="Falta 1" entries={oneAway} extraCount={oneAwayExtraCount} accent="text-red-400" />
      <Group title="Faltam 2" entries={twoAway} extraCount={twoAwayExtraCount} accent="text-yellow-400" />
    </div>
  );
}
