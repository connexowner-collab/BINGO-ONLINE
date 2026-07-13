const COLUMNS = ['B', 'I', 'N', 'G', 'O'] as const;

export function BoardGrid({ drawnNumbers, currentNumber }: { drawnNumbers: Set<number>; currentNumber: number | null }) {
  return (
    <div className="rounded-[18px] bg-bingoNavyLight p-6">
      <div className="flex gap-2.5">
        {COLUMNS.map((letter, col) => (
          <div key={letter} className="flex flex-col items-center gap-1.5">
            <div className="font-display text-[22px] font-extrabold text-bingoGold">{letter}</div>
            {Array.from({ length: 15 }, (_, row) => {
              const number = col * 15 + row + 1;
              const isCurrent = number === currentNumber;
              const isCalled = drawnNumbers.has(number);
              return (
                <div
                  key={number}
                  className="num flex h-[34px] w-[34px] items-center justify-center rounded-[7px] text-[15px] font-bold"
                  style={{
                    background: isCurrent ? '#F5A623' : isCalled ? '#5C8DF2' : 'rgba(255,255,255,.06)',
                    color: isCurrent ? '#201B3B' : isCalled ? '#fff' : 'rgba(255,255,255,.3)',
                  }}
                >
                  {number}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
