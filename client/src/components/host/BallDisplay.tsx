import { AnimatePresence, motion } from 'framer-motion';
import type { Ball } from '../../lib/types';

export function BallDisplay({ ball }: { ball: Ball | null }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-bingoOrange shadow-2xl md:h-72 md:w-72">
        <AnimatePresence mode="wait">
          {ball ? (
            <motion.div
              key={ball.sequence}
              initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="text-center font-display text-bingoNavy"
            >
              <div className="text-5xl font-extrabold leading-none md:text-6xl">{ball.letter}</div>
              <div className="text-7xl font-extrabold leading-none md:text-8xl">{ball.number}</div>
            </motion.div>
          ) : (
            <div className="font-display text-3xl text-bingoNavy/50">—</div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 font-display text-lg text-white/80">bola atual</p>
    </div>
  );
}
