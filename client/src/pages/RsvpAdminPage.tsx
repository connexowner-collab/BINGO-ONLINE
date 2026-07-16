import { useEffect, useState } from 'react';
import { fetchRsvpList, fetchRsvpSummary, type RsvpResponseRow, type RsvpSummary } from '../lib/rsvp';

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-2xl bg-bingoNavyLight p-4 text-center">
      <div className="font-display text-3xl font-extrabold" style={{ color: accent ?? '#F5A623' }}>
        {value}
      </div>
      <div className="mt-1 text-sm text-white/60">{label}</div>
    </div>
  );
}

export function RsvpAdminPage() {
  const [summary, setSummary] = useState<RsvpSummary | null>(null);
  const [responses, setResponses] = useState<RsvpResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [s, r] = await Promise.all([fetchRsvpSummary(), fetchRsvpList()]);
    setSummary(s);
    setResponses(r);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const confirmed = responses.filter((r) => r.attending);
  const declined = responses.filter((r) => !r.attending);

  return (
    <div className="min-h-screen bg-bingoNavy p-6 text-white md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-bingoOrange">Confirmações — Chá do Anthony</h1>
          <p className="mt-1 text-white/60">Acompanhamento de presença dos convidados.</p>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
        >
          ↻ atualizar
        </button>
      </div>

      {loading ? (
        <p className="mt-8 text-white/60">Carregando…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard label="Confirmados" value={summary?.confirmedCount ?? 0} accent="#4ADE80" />
            <StatCard label="Não vão" value={summary?.declinedCount ?? 0} accent="#FF4D5E" />
            <StatCard label="Adultos (acomp.)" value={summary?.totalAdults ?? 0} />
            <StatCard label="Crianças (acomp.)" value={summary?.totalChildren ?? 0} />
            <StatCard label="Total de pessoas" value={summary?.totalPeopleAttending ?? 0} accent="#5C8DF2" />
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-display text-xl font-bold text-bingoWin">Confirmados ({confirmed.length})</h2>
              <div className="mt-2 space-y-2">
                {confirmed.length === 0 && <p className="text-sm text-white/40">ninguém confirmou ainda</p>}
                {confirmed.map((r) => (
                  <div key={r.id} className="rounded-lg bg-bingoNavyLight p-3">
                    <div className="font-bold">{r.guestName}</div>
                    {r.hasCompanions && (
                      <div className="mt-1 text-sm text-white/60">
                        + {r.adultsCount} adulto(s), {r.childrenCount} criança(s)
                        {r.companionNames && <> — {r.companionNames}</>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-red-400">Não vão ({declined.length})</h2>
              <div className="mt-2 space-y-2">
                {declined.length === 0 && <p className="text-sm text-white/40">ninguém avisou que não vem</p>}
                {declined.map((r) => (
                  <div key={r.id} className="rounded-lg bg-bingoNavyLight p-3 font-bold">
                    {r.guestName}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
