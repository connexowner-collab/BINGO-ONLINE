import { HostPage } from './pages/HostPage';
import { PlayPage } from './pages/PlayPage';

export function App() {
  const path = window.location.pathname;

  if (path.startsWith('/play')) return <PlayPage />;
  if (path.startsWith('/host')) return <HostPage />;

  return (
    <div style={{ fontFamily: 'monospace', padding: 24 }}>
      <h1>Bingo Online</h1>
      <p>
        <a href="/host">Painel de sorteio</a>
      </p>
      <p>
        <a href="/play">Entrar como jogador</a>
      </p>
    </div>
  );
}
