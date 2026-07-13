export function ConnectionBanner({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-4 text-bingoInk" style={{ background: '#FFC24B' }}>
      <span
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full font-extrabold"
        style={{ background: '#201B3B', color: '#FFC24B' }}
      >
        !
      </span>
      <div>
        <div className="font-extrabold">Reconectando…</div>
        <div className="text-sm font-bold">a rede do evento oscilou. sua cartela continua marcada, aguarde um instante.</div>
      </div>
    </div>
  );
}
