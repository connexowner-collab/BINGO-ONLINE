import { HostPage } from './pages/HostPage';
import { PlayPage } from './pages/PlayPage';
import { RsvpPage } from './pages/RsvpPage';
import { RsvpAdminPage } from './pages/RsvpAdminPage';
import { BingoAnthonyLogo, CloudField, Star } from './components/decor/Sparkle';
import { LoginGate } from './components/auth/LoginGate';

function LandingPage() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-6 pb-32 text-center text-white md:pb-56"
      style={{ background: 'linear-gradient(180deg,#3E6FD9 0%,#5C8DF2 38%,#10142A 74%)' }}
    >
      <CloudField />
      <Star top={20} left={300} size={20} />
      <Star top={110} left={480} size={26} />
      <Star top={90} right={140} size={18} />

      <BingoAnthonyLogo width={340} />

      <div className="flex flex-col gap-3">
        <a
          href="/host"
          className="w-64 rounded-xl bg-bingoOrange px-6 py-4 font-display text-lg font-extrabold text-bingoInk hover:brightness-95"
        >
          🎙 Painel de sorteio
        </a>
        <a
          href="/convite/painel"
          className="w-64 rounded-xl bg-white/10 px-6 py-3 text-center text-sm font-bold hover:bg-white/20"
        >
          💌 Confirmações do chá
        </a>
      </div>

      <img
        src="/mascots/mascot-1.png"
        alt=""
        className="pointer-events-none absolute bottom-4 left-2 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-56"
      />
      <img
        src="/mascots/mascot-2.png"
        alt=""
        className="pointer-events-none absolute bottom-4 left-1/2 h-24 w-auto -translate-x-1/2 drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-48"
      />
      <img
        src="/mascots/mascot-3.png"
        alt=""
        className="pointer-events-none absolute bottom-4 right-2 h-40 w-auto drop-shadow-[0_20px_24px_rgba(0,0,0,.4)] md:h-56"
      />
    </div>
  );
}

export function App() {
  const path = window.location.pathname;

  // Jogadores entram direto pelo QR (/play/<joinCode>) — não passam pela
  // senha do site, que só protege a tela inicial e o painel de sorteio.
  if (path.startsWith('/play')) return <PlayPage />;
  // Convidados confirmam presença por um link direto, sem senha — só o
  // painel de acompanhamento (/convite/painel) fica protegido.
  if (path.startsWith('/convite/painel')) {
    return (
      <LoginGate>
        <RsvpAdminPage />
      </LoginGate>
    );
  }
  if (path.startsWith('/convite')) return <RsvpPage />;
  if (path.startsWith('/host')) {
    return (
      <LoginGate>
        <HostPage />
      </LoginGate>
    );
  }

  return (
    <LoginGate>
      <LandingPage />
    </LoginGate>
  );
}
