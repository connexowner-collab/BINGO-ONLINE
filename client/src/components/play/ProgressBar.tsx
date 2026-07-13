import type { Ball } from '../../lib/types';

export function ProgressBar({ lastBall, missing }: { lastBall: Ball | null; missing: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-bingoNavyLight px-4 py-3 text-white">
      <span className="font-semibold">{missing != null ? `Faltam ${missing} números` : '—'}</span>
      <span className="font-display text-xl font-extrabold text-bingoOrange">
        {lastBall ? `${lastBall.letter} ${lastBall.number}` : '—'}
      </span>
    </div>
  );
}
