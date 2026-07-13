import { letterForNumber } from '../../lib/audio';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;

export function BoardGrid({ drawnNumbers }: { drawnNumbers: Set<number> }) {
  return (
    <div className="rounded-2xl bg-bingoNavyLight p-4">
      <div className="grid grid-cols-5 gap-2">
        {COLUMNS.map((letter) => (
          <div key={letter} className="text-center font-display text-xl font-bold text-bingoOrange">
            {letter}
          </div>
        ))}
        {Array.from({ length: 15 }, (_, row) =>
          COLUMNS.map((letter, col) => {
            const number = col * 15 + row + 1;
            const drawn = drawnNumbers.has(number);
            return (
              <div
                key={number}
                className={`flex h-8 items-center justify-center rounded-md text-sm font-semibold transition-colors md:h-9 md:text-base ${
                  drawn ? 'bg-green-500 text-white' : 'bg-white/5 text-white/40'
                }`}
              >
                {number}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
