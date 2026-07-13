import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Cloud, Star } from '../decor/Sparkle';

export function WinOverlay({
  displayNumber,
  prizeLabel,
  modeLabel,
}: {
  displayNumber: string;
  prizeLabel: string;
  modeLabel: string;
}) {
  useEffect(() => {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center text-white"
      style={{ background: 'linear-gradient(180deg,#5C8DF2 0%,#3E6FD9 30%,#201B3B 68%)' }}
    >
      <Cloud top={36} left={-40} width={210} height={66} opacity={0.85} />
      <Cloud top={96} right={-46} width={180} height={60} opacity={0.7} />
      <Star top={150} left={40} size={16} />
      <Star top={210} right={44} size={20} />

      <img
        src="/mascots/mascot-1.png"
        alt=""
        className="pointer-events-none absolute bottom-14 left-0 h-36 w-auto drop-shadow-[0_10px_12px_rgba(0,0,0,.35)]"
      />
      <img
        src="/mascots/mascot-3.png"
        alt=""
        className="pointer-events-none absolute bottom-14 right-0 h-36 w-auto drop-shadow-[0_10px_12px_rgba(0,0,0,.35)]"
      />

      <div className="text-xl font-extrabold uppercase tracking-[.08em] text-bingoWin">{modeLabel}!</div>
      <div className="font-display text-2xl font-extrabold">MOSTRE ESTA TELA</div>
      <div className="w-full max-w-xs rounded-[20px] bg-white px-5 py-6 text-bingoInk">
        <div className="text-sm font-bold" style={{ color: '#8A7B4E' }}>
          cartela
        </div>
        <div className="font-display text-6xl font-extrabold">{displayNumber}</div>
      </div>
      <p className="text-white/70">Prêmio: {prizeLabel}</p>
    </motion.div>
  );
}
