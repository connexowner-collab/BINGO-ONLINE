import type { Card } from '../../lib/types';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;

/** Grade somente-leitura de uma cartela, usada para conferência na tela de vitória. */
export function MiniCardGrid({ card, drawnNumbers }: { card: Card; drawnNumbers: Set<number> }) {
  return (
    <div className="inline-flex flex-col gap-1 rounded-2xl bg-white p-3">
      <div className="grid grid-cols-5 gap-1">
        {COLUMNS.map((l) => (
          <div key={l} className="text-center font-display text-sm font-extrabold" style={{ color: '#5C8DF2' }}>
            {l}
          </div>
        ))}
      </div>
      {card.grid.map((row, ri) => (
        <div key={ri} className="grid grid-cols-5 gap-1">
          {row.map((cell, ci) => {
            const marked = cell === 'FREE' || drawnNumbers.has(cell as number);
            return (
              <div
                key={ci}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-extrabold"
                style={{
                  background: marked ? '#201B3B' : '#fff',
                  color: marked ? '#fff' : '#201B3B',
                  border: `1px solid ${marked ? '#201B3B' : '#EADFC2'}`,
                }}
              >
                {cell === 'FREE' ? '★' : marked ? `✓${cell}` : cell}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
