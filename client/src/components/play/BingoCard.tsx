import { useState } from 'react';
import type { Card } from '../../lib/types';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;
const FREE_MASCOTS = ['/mascots/mascot-1.png', '/mascots/mascot-2.png', '/mascots/mascot-3.png'];

/** Escolhe um mascote de forma estável por cartela (mesma cartela sempre mostra o mesmo personagem). */
function mascotForCard(cardId: string): string {
  let hash = 0;
  for (let i = 0; i < cardId.length; i++) hash = (hash * 31 + cardId.charCodeAt(i)) >>> 0;
  return FREE_MASCOTS[hash % FREE_MASCOTS.length]!;
}

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
  const freeMascot = mascotForCard(card.cardId);

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
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <div className="grid grid-cols-5 gap-1.5">
        {COLUMNS.map((l) => (
          <div key={l} className="text-center font-display text-[22px] font-extrabold" style={{ color: '#5C8DF2' }}>
            {l}
          </div>
        ))}
      </div>

      {card.grid.map((row, ri) => (
        <div key={ri} className="grid grid-cols-5 gap-1.5">
          {row.map((cell, ci) => {
            const isMarked = cell === 'FREE' || (autoMark ? drawnNumbers.has(cell as number) : tappedNumbers.has(cell as number));
            const isShaking = shakingCell === cell;
            return (
              <button
                key={ci}
                type="button"
                onClick={() => handleClick(cell)}
                className={`relative flex aspect-square items-center justify-center rounded-xl border-2 font-extrabold transition-colors ${
                  largeText ? 'text-xl' : 'text-[19px]'
                } ${isShaking ? 'animate-shake' : ''}`}
                style={{
                  background: isMarked ? (highContrast ? '#000' : '#201B3B') : '#fff',
                  color: isMarked ? '#fff' : '#201B3B',
                  borderColor: isShaking ? '#FF4D5E' : isMarked ? (highContrast ? '#000' : '#201B3B') : '#EADFC2',
                }}
              >
                {isMarked && cell !== 'FREE' && (
                  <span
                    className="absolute rounded-full"
                    style={{ width: '70%', height: '70%', background: '#F5A623', opacity: 0.35 }}
                  />
                )}
                {cell === 'FREE' ? (
                  <img src={freeMascot} alt="Espaço livre" className="relative z-10 h-full w-full object-contain p-1" />
                ) : (
                  <span className="relative z-10">{isMarked ? `✓${cell}` : cell}</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
