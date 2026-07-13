import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

export function WinOverlay({ displayNumber, prizeLabel }: { displayNumber: string; prizeLabel: string }) {
  useEffect(() => {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bingoNavy/95 p-6 text-center text-white"
    >
      <h1 className="font-display text-5xl font-extrabold text-bingoOrange">BINGO! 🎉</h1>
      <p className="mt-4 text-lg">Prêmio: {prizeLabel}</p>
      <p className="mt-8 font-display text-2xl font-bold">MOSTRE ESTA TELA:</p>
      <p className="font-display text-6xl font-extrabold text-bingoOrange">{displayNumber}</p>
    </motion.div>
  );
}
