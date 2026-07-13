import type { NearWinEntry } from '../../lib/types';

function formatMissing(numbers: number[]): string {
  if (numbers.length === 0) return '';
  if (numbers.length === 1) return `falta o ${numbers[0]}`;
  return `faltam ${numbers.slice(0, -1).join(', ')} e ${numbers.at(-1)}`;
}

type Row = { tag: string; tagColor: string; bg: string; card: string; name: string; detail: string };

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
  const rows: Row[] = [
    ...oneAway.map((e) => ({
      tag: 'falta 1',
      tagColor: '#FF4D5E',
      bg: 'rgba(255,77,94,.15)',
      card: e.displayNumber,
      name: e.playerName,
      detail: formatMissing(e.missingNumbers),
    })),
    ...twoAway.map((e) => ({
      tag: 'faltam 2',
      tagColor: '#FFC24B',
      bg: 'rgba(255,194,75,.12)',
      card: e.displayNumber,
      name: e.playerName,
      detail: formatMissing(e.missingNumbers),
    })),
  ];

  return (
    <div className="flex w-[400px] flex-col gap-3.5 rounded-[18px] border-2 border-bingoAlert bg-bingoNavyLight p-5">
      <div className="text-[18px] font-extrabold uppercase tracking-[.06em] text-bingoAlert">quase lá</div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/40">ninguém por perto ainda</p>
      ) : (
        rows.map((r, i) => (
          <div key={i} className="flex flex-col gap-0.5 rounded-[10px] px-3 py-2.5" style={{ background: r.bg }}>
            <div className="text-[15px] font-extrabold uppercase tracking-[.04em]" style={{ color: r.tagColor }}>
              {r.tag}
            </div>
            <div className="text-[19px] font-extrabold text-white">
              {r.card} · {r.name}
            </div>
            <div className="text-[17px] font-bold text-white/80">{r.detail}</div>
          </div>
        ))
      )}

      {(oneAwayExtraCount > 0 || twoAwayExtraCount > 0) && (
        <p className="text-xs text-white/40">
          + {oneAwayExtraCount + twoAwayExtraCount} outras
        </p>
      )}
    </div>
  );
}
