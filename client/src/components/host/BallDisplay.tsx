import { AnimatePresence, motion } from 'framer-motion';
import type { Ball } from '../../lib/types';
import { SignatureBall } from '../decor/Sparkle';

export function BallDisplay({ ball, trail }: { ball: Ball | null; trail: Ball[] }) {
  return (
    <div className="flex items-center gap-9">
      <AnimatePresence mode="wait">
        {ball ? (
          <motion.div
            key={ball.sequence}
            initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <SignatureBall letter={ball.letter} number={ball.number} size={220} />
          </motion.div>
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-full bg-white/5 font-display text-3xl text-white/30">
            —
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-5">
        {trail.map((b, i) => {
          const size = [84, 72, 62, 54][i] ?? 48;
          const opacity = [0.85, 0.65, 0.5, 0.35][i] ?? 0.25;
          const font = [28, 24, 20, 17][i] ?? 15;
          return (
            <div
              key={b.sequence}
              className="flex items-center justify-center rounded-full"
              style={{
                width: size,
                height: size,
                opacity,
                background: 'linear-gradient(145deg,#3A4176,#1B2150)',
              }}
            >
              <div className="font-display font-extrabold text-white" style={{ fontSize: font }}>
                {b.letter}
                {b.number}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
