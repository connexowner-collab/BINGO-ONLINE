import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import type { Phase } from '../../lib/types';

export function WinnerOverlay({ phase, celebrationSeconds }: { phase: Phase; celebrationSeconds: number }) {
  const [secondsLeft, setSecondsLeft] = useState(celebrationSeconds);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      const duration = 2500;
      const end = Date.now() + duration;
      (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 } });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }
  }, []);

  useEffect(() => {
    setSecondsLeft(celebrationSeconds);
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [phase.id, celebrationSeconds]);

  const isTie = phase.winners.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bingoNavy/95 p-6 text-center"
    >
      <motion.h1
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="font-display text-6xl font-extrabold text-bingoOrange md:text-8xl"
      >
        BINGO! 🎉
      </motion.h1>
      <p className="mt-2 font-display text-xl text-white/80">Prêmio: {phase.prizeLabel}</p>

      <div className={`mt-8 grid gap-4 ${isTie ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
        {phase.winners.map((w) => (
          <div key={w.cardId} className="rounded-2xl bg-white/10 px-8 py-4">
            <div className="font-display text-3xl font-extrabold text-white md:text-5xl">{w.displayNumber}</div>
            <div className="text-lg text-white/70 md:text-2xl">{w.playerName}</div>
          </div>
        ))}
      </div>

      {isTie && <p className="mt-4 text-white/60">Empate! Mais de uma cartela fechou na mesma bola.</p>}

      <p className="mt-10 text-white/50">Próxima fase em {secondsLeft}s…</p>
    </motion.div>
  );
}
