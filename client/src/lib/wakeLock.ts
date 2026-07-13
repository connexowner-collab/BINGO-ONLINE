// Impede a tela do celular de apagar durante o jogo (seção 8.2).

let wakeLock: WakeLockSentinel | null = null;

async function requestLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch {
    // alguns navegadores recusam se a aba não estiver visível/focada — ok, tentamos de novo no visibilitychange
  }
}

export function setupWakeLock(): () => void {
  void requestLock();

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void requestLock();
  }

  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    void wakeLock?.release();
    wakeLock = null;
  };
}
