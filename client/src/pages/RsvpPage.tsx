import { useState } from 'react';
import { AnthonyBlocksLogo, CloudField, Star } from '../components/decor/Sparkle';
import { submitRsvp } from '../lib/rsvp';

type Step = 'name' | 'companions' | 'companions-form' | 'thanks-yes' | 'thanks-no';

const SKY_BG = 'linear-gradient(180deg,#5C8DF2 0%,#A9C6F7 30%,#FFF8EA 55%)';

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-6 py-10 text-center"
      style={{ background: SKY_BG, color: '#201B3B' }}
    >
      <CloudField />
      <Star top={64} left={40} size={18} opacity={0.6} color="#F5A623" />
      <Star top={130} right={40} size={14} opacity={0.5} color="#F5A623" />
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6">{children}</div>
      <img
        src="/mascots/mascot-1.png"
        alt=""
        className="pointer-events-none absolute bottom-2 left-1 h-20 w-auto drop-shadow-[0_8px_10px_rgba(0,0,0,.3)]"
      />
      <img
        src="/mascots/mascot-3.png"
        alt=""
        className="pointer-events-none absolute bottom-2 right-1 h-20 w-auto drop-shadow-[0_8px_10px_rgba(0,0,0,.3)]"
      />
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex w-full items-center justify-between rounded-2xl border-2 bg-white px-5 py-3" style={{ borderColor: '#EADFC2' }}>
      <span className="font-bold">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-xl font-extrabold text-white"
          style={{ background: '#5C8DF2' }}
        >
          −
        </button>
        <span className="num w-6 text-center text-xl font-extrabold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-xl font-extrabold text-white"
          style={{ background: '#F5A623' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function RsvpPage() {
  const [step, setStep] = useState<Step>('name');
  const [guestName, setGuestName] = useState('');
  const [adultsCount, setAdultsCount] = useState(0);
  const [childrenCount, setChildrenCount] = useState(0);
  const [companionNames, setCompanionNames] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respondNotAttending() {
    if (!guestName.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const ok = await submitRsvp({ guestName: guestName.trim(), attending: false });
    setSubmitting(false);
    if (ok) setStep('thanks-no');
    else setError('Não consegui salvar sua resposta. Tenta de novo?');
  }

  function proceedToCompanionsQuestion() {
    if (!guestName.trim()) return;
    setStep('companions');
  }

  async function confirmNoCompanions() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const ok = await submitRsvp({ guestName: guestName.trim(), attending: true, hasCompanions: false });
    setSubmitting(false);
    if (ok) setStep('thanks-yes');
    else setError('Não consegui salvar sua resposta. Tenta de novo?');
  }

  async function confirmWithCompanions() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const ok = await submitRsvp({
      guestName: guestName.trim(),
      attending: true,
      hasCompanions: true,
      adultsCount,
      childrenCount,
      companionNames: companionNames.trim(),
    });
    setSubmitting(false);
    if (ok) setStep('thanks-yes');
    else setError('Não consegui salvar sua resposta. Tenta de novo?');
  }

  if (step === 'thanks-no') {
    return (
      <Screen>
        <AnthonyBlocksLogo width={240} />
        <p className="text-xl font-bold">Que pena, {guestName || 'amigo(a)'}! Sentiremos sua falta. 💙</p>
        <p className="text-sm opacity-70">Obrigado por avisar — sua resposta já foi registrada.</p>
      </Screen>
    );
  }

  if (step === 'thanks-yes') {
    return (
      <Screen>
        <AnthonyBlocksLogo width={240} />
        <p className="text-xl font-bold">Confirmadíssimo, {guestName}! 🎉</p>
        <p className="text-sm opacity-70">Nos vemos no chá de bebê do Anthony. Obrigado por confirmar!</p>
      </Screen>
    );
  }

  if (step === 'companions') {
    return (
      <Screen>
        <AnthonyBlocksLogo width={220} />
        <h1 className="font-display text-2xl font-extrabold">Vai ter acompanhante?</h1>

        <div className="flex w-full gap-3">
          <button
            onClick={confirmNoCompanions}
            disabled={submitting}
            className="flex-1 rounded-2xl bg-white px-4 py-4 font-display text-lg font-extrabold text-bingoInk shadow-sm disabled:opacity-60"
          >
            Não
          </button>
          <button
            onClick={() => setStep('companions-form')}
            className="flex-1 rounded-2xl bg-bingoOrange px-4 py-4 font-display text-lg font-extrabold text-bingoInk hover:brightness-95"
          >
            Sim
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Screen>
    );
  }

  if (step === 'companions-form') {
    return (
      <Screen>
        <AnthonyBlocksLogo width={200} />
        <h1 className="font-display text-xl font-extrabold">Quem vem com você?</h1>

        <Stepper label="Adultos" value={adultsCount} onChange={setAdultsCount} />
        <Stepper label="Crianças" value={childrenCount} onChange={setChildrenCount} />

        <textarea
          value={companionNames}
          onChange={(e) => setCompanionNames(e.target.value)}
          placeholder="Nome dos acompanhantes (todos juntos aqui, tudo bem)"
          rows={3}
          className="w-full rounded-2xl border-2 bg-white px-4 py-3 text-sm"
          style={{ borderColor: '#EADFC2' }}
        />

        <button
          onClick={confirmWithCompanions}
          disabled={submitting}
          className="w-full rounded-2xl bg-bingoWin px-6 py-4 font-display text-lg font-extrabold text-white hover:brightness-95 disabled:opacity-60"
        >
          {submitting ? 'Enviando…' : 'Confirmar presença'}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Screen>
    );
  }

  return (
    <Screen>
      <AnthonyBlocksLogo width={260} />
      <h1 className="font-display text-2xl font-extrabold">Confirme sua presença</h1>
      <p className="text-sm opacity-70">Chá de bebê do Anthony — conta pra gente se você vem!</p>

      <input
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
        placeholder="seu nome"
        className="w-full rounded-2xl border-2 bg-white px-5 py-4 text-center text-xl font-bold text-bingoInk"
        style={{ borderColor: '#EADFC2' }}
      />

      <div className="flex w-full gap-3">
        <button
          onClick={respondNotAttending}
          disabled={submitting || !guestName.trim()}
          className="flex-1 rounded-2xl bg-white px-4 py-4 font-display text-lg font-extrabold text-bingoInk shadow-sm disabled:opacity-40"
        >
          {submitting ? '…' : 'Não vou'}
        </button>
        <button
          onClick={proceedToCompanionsQuestion}
          disabled={!guestName.trim()}
          className="flex-1 rounded-2xl bg-bingoOrange px-4 py-4 font-display text-lg font-extrabold text-bingoInk hover:brightness-95 disabled:opacity-40"
        >
          Vou sim!
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </Screen>
  );
}
