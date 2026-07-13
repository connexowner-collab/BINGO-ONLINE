import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import type { Phase } from '../../lib/types';
import { Cloud } from '../decor/Sparkle';
import { MODE_LABELS } from '../../lib/modeLabels';

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
  const modeLabel = MODE_LABELS[phase.mode] ?? phase.mode.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-hidden text-center text-white"
      style={{ background: 'linear-gradient(180deg,#5C8DF2 0%,#3E6FD9 22%,#201B3B 50%)' }}
    >
      <Cloud top={20} left={-60} width={300} height={96} opacity={0.7} />
      <Cloud top={70} right={-70} width={260} height={86} opacity={0.55} />

      <img
        src="/mascots/mascot-1.png"
        alt=""
        className="pointer-events-none absolute bottom-10 left-6 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-64"
      />
      <img
        src="/mascots/mascot-3.png"
        alt=""
        className="pointer-events-none absolute bottom-10 right-6 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-64"
      />

      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-2xl font-extrabold uppercase tracking-[.1em] text-bingoWin md:text-3xl"
      >
        {modeLabel}! {isTie && `empate entre ${phase.winners.length} cartelas`}
      </motion.div>

      <div className={`flex flex-wrap justify-center gap-14 ${isTie ? '' : ''}`}>
        {phase.winners.map((w) => (
          <div key={w.cardId} className="font-display font-extrabold leading-tight text-white">
            <div className={isTie ? 'text-3xl md:text-5xl' : 'text-4xl md:text-7xl'}>CARTELA {w.displayNumber}</div>
            <div className={isTie ? 'text-xl md:text-3xl' : 'text-2xl md:text-4xl'}>{w.playerName.toUpperCase()}</div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-lg font-bold text-white/70 md:text-2xl">
        Prêmio: {phase.prizeLabel}
      </p>
      <p className="text-base font-bold text-white/70 md:text-xl">
        Próxima fase em <span className="num font-extrabold text-bingoOrange">{secondsLeft}s</span>…
      </p>
    </motion.div>
  );
}
