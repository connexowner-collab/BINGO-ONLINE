import { HostPage } from './pages/HostPage';
import { PlayPage } from './pages/PlayPage';
import { Cloud, RibbonBanner, Star } from './components/decor/Sparkle';

const EVENT_TITLE = 'BINGO DO ANTHONY';

function LandingPage() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center text-white"
      style={{ background: 'linear-gradient(180deg,#3E6FD9 0%,#5C8DF2 38%,#10142A 74%)' }}
    >
      <Cloud top={30} left={-60} width={340} height={110} opacity={0.85} />
      <Cloud top={180} right={-80} width={300} height={100} opacity={0.7} />
      <Star top={20} left={300} size={20} />
      <Star top={110} left={480} size={26} />
      <Star top={90} right={140} size={18} />

      <RibbonBanner>{EVENT_TITLE}</RibbonBanner>

      <p className="max-w-sm text-white/70">
        Bingo ao vivo — painel de sorteio numa tela grande e cartelas no celular de cada jogador.
      </p>

      <a
        href="/host"
        className="w-64 rounded-xl bg-bingoOrange px-6 py-4 font-display text-lg font-extrabold text-bingoInk hover:brightness-95"
      >
        🎙 Painel de sorteio
      </a>

      <img
        src="/mascots/mascot-1.png"
        alt=""
        className="pointer-events-none absolute bottom-4 left-2 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-56"
      />
      <img
        src="/mascots/mascot-2.png"
        alt=""
        className="pointer-events-none absolute bottom-4 left-1/2 hidden h-48 w-auto -translate-x-1/2 drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:block"
      />
      <img
        src="/mascots/mascot-3.png"
        alt=""
        className="pointer-events-none absolute bottom-4 right-2 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-56"
      />

      <footer className="relative z-10 mt-20 text-xs text-white/40">
        Bingo recreativo. Sem apostas ou prêmios em dinheiro.
      </footer>
    </div>
  );
}

export function App() {
  const path = window.location.pathname;

  if (path.startsWith('/play')) return <PlayPage />;
  if (path.startsWith('/host')) return <HostPage />;

  return <LandingPage />;
}
