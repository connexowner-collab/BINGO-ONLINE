export function ConnectionBanner({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-red-600 py-2 text-center font-semibold text-white">
      Reconectando…
    </div>
  );
}
