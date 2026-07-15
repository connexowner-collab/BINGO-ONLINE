import { useEffect, useState } from 'react';
import { login, verifyStoredToken } from '../../lib/auth';
import { CloudField, RibbonBanner, Star } from '../decor/Sparkle';

/**
 * Protege a tela inicial e o /host com uma senha única do site (evento
 * particular). Os jogadores não passam por aqui — entram direto por
 * /play/<joinCode>, sem precisar de senha.
 */
export function LoginGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'authed' | 'unauthed'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    verifyStoredToken().then((ok) => setStatus(ok ? 'authed' : 'unauthed'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const ok = await login(password.trim());
    setSubmitting(false);
    if (ok) {
      setStatus('authed');
    } else {
      setError('Senha incorreta.');
    }
  }

  if (status === 'checking') {
    return <div className="min-h-screen bg-bingoNavy" />;
  }

  if (status === 'authed') {
    return <>{children}</>;
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center text-white"
      style={{ background: 'linear-gradient(180deg,#3E6FD9 0%,#5C8DF2 38%,#10142A 74%)' }}
    >
      <CloudField />
      <Star top={20} left={300} size={20} />
      <Star top={110} left={480} size={26} />

      <RibbonBanner>ACESSO RESTRITO</RibbonBanner>

      <form onSubmit={handleSubmit} className="z-10 flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha do evento"
          className="rounded-xl bg-white/10 px-4 py-3 text-center text-white placeholder:text-white/40"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-bingoOrange px-6 py-3 font-display text-lg font-bold text-bingoInk hover:brightness-95 disabled:opacity-60"
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
