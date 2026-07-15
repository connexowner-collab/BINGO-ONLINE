import { useEffect, useState } from 'react';
import { CloudField, RibbonBanner, Star } from '../decor/Sparkle';

const SPLASH_DURATION_MS = 2600;

function messagesFor(name: string): string[] {
  return [
    `Boa sorte, ${name}!`,
    'Que vença o mais atento!',
    `Prepare os olhos, ${name}!`,
    'Excelente jogo pra você!',
    'Fique de olho nos números!',
    `Boa partida, ${name}!`,
    'Que a sorte esteja com você!',
    `Vai com tudo, ${name}!`,
    'Um ótimo Bingo pra você!',
    'Que vença a melhor cartela!',
  ];
}

/** Tela rápida (poucos segundos) mostrada assim que o jogador entra na sala, antes da cartela. */
export function WelcomeSplash({ name, onDone }: { name: string; onDone: () => void }) {
  const [message] = useState(() => {
    const pool = messagesFor(name.trim() || 'jogador');
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!;
  });

  useEffect(() => {
    const timer = setTimeout(onDone, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 overflow-hidden px-8 text-center text-white"
      style={{ background: 'linear-gradient(180deg,#3E6FD9 0%,#5C8DF2 38%,#10142A 74%)' }}
    >
      <CloudField />
      <Star top={40} left={50} size={18} />
      <Star top={90} right={60} size={22} />

      <div
        className="z-10 overflow-hidden rounded-full bg-white shadow-[0_20px_50px_rgba(0,0,0,.4)]"
        style={{ width: 176, height: 176, border: '6px solid #F5A623' }}
      >
        <img src="/favicon.png" alt="" className="h-full w-full object-cover" />
      </div>

      <div className="z-10">
        <RibbonBanner fontSize={24} wrap>{message}</RibbonBanner>
      </div>
    </div>
  );
}
