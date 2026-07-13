import { useState } from 'react';
import type { Card } from '../../lib/types';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;

export function BingoCard({
  card,
  drawnNumbers,
  autoMark,
  tappedNumbers,
  onToggleTap,
  highContrast,
  largeText,
}: {
  card: Card;
  drawnNumbers: Set<number>;
  autoMark: boolean;
  tappedNumbers: Set<number>;
  onToggleTap: (n: number) => void;
  highContrast: boolean;
  largeText: boolean;
}) {
  const [shakingCell, setShakingCell] = useState<number | null>(null);

  function handleClick(cell: number | 'FREE') {
    if (cell === 'FREE' || autoMark) return;
    if (!drawnNumbers.has(cell)) {
      setShakingCell(cell);
      setTimeout(() => setShakingCell((c) => (c === cell ? null : c)), 400);
      return;
    }
    onToggleTap(cell);
  }

  return (
    <div className="rounded-2xl bg-white p-3 shadow-lg">
      <div className="mb-2 text-center font-display text-2xl font-extrabold text-bingoNavy">
        {card.displayNumber}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {COLUMNS.map((l) => (
              <th key={l} className="pb-1 font-display text-lg font-bold text-bingoOrange">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {card.grid.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => {
                const isMarked = cell === 'FREE' || (autoMark ? drawnNumbers.has(cell as number) : tappedNumbers.has(cell as number));
                const isShaking = shakingCell === cell;
                return (
                  <td key={ci} className="p-0.5">
                    <button
                      type="button"
                      onClick={() => handleClick(cell)}
                      className={`flex aspect-square w-full items-center justify-center rounded-lg border-2 font-bold transition-colors ${
                        largeText ? 'text-xl md:text-2xl' : 'text-base md:text-lg'
                      } ${
                        isMarked
                          ? highContrast
                            ? 'border-black bg-black text-white'
                            : 'border-green-600 bg-green-400 text-green-950'
                          : 'border-bingoNavy/20 bg-bingoNavy/5 text-bingoNavy'
                      } ${isShaking ? 'animate-shake border-red-500' : ''}`}
                    >
                      {isMarked && cell !== 'FREE' ? <>✓ {cell}</> : cell}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
