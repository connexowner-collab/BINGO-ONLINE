// Locução das bolas + efeitos sonoros (seção 7 do spec).
// Os arquivos ficam em /public/audio — gerados por scripts/generate-audio.ts.
// Nota: usamos .wav em vez de .mp3 porque este ambiente não tem um encoder
// MP3 disponível (sem ffmpeg); o navegador reproduz .wav de forma idêntica.

import type { ColumnLetter } from './types';

const RANGES: [number, number, ColumnLetter][] = [
  [1, 15, 'B'],
  [16, 30, 'I'],
  [31, 45, 'N'],
  [46, 60, 'G'],
  [61, 75, 'O'],
];

export function letterForNumber(n: number): ColumnLetter {
  return RANGES.find(([min, max]) => n >= min && n <= max)?.[2] ?? 'B';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// WAV silencioso de ~100ms — usado só para destravar o autoplay no clique inicial.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

export type PreloadProgress = { loaded: number; total: number };

class BingoAudioController {
  private ballAudio = new Map<number, HTMLAudioElement>();
  private sfxAudio = new Map<string, HTMLAudioElement>();
  private fallbackMode = false;
  private unlocked = false;

  get isFallback(): boolean {
    return this.fallbackMode;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  async unlockAndPreload(onProgress?: (p: PreloadProgress) => void): Promise<void> {
    try {
      const silent = new Audio(SILENT_WAV);
      await silent.play().catch(() => undefined);
    } catch {
      // autoplay bloqueado antes do gesto do usuário — ignorado, o clique já é o gesto
    }

    const targets: { key: string; url: string; isBall: boolean; num?: number }[] = [];
    for (let n = 1; n <= 75; n++) {
      targets.push({ key: `ball-${n}`, url: `/audio/balls/${letterForNumber(n).toLowerCase()}-${n}.wav`, isBall: true, num: n });
    }
    for (const name of ['win', 'tick', 'phase-start']) {
      targets.push({ key: name, url: `/audio/sfx/${name}.wav`, isBall: false });
    }

    let loaded = 0;
    await Promise.all(
      targets.map(
        (t) =>
          new Promise<void>((resolve) => {
            const audio = new Audio();
            audio.preload = 'auto';
            const finish = (ok: boolean) => {
              if (!ok) this.fallbackMode = true;
              else if (t.isBall && t.num) this.ballAudio.set(t.num, audio);
              else if (!t.isBall) this.sfxAudio.set(t.key, audio);
              loaded += 1;
              onProgress?.({ loaded, total: targets.length });
              resolve();
            };
            audio.addEventListener('canplaythrough', () => finish(true), { once: true });
            audio.addEventListener('error', () => finish(false), { once: true });
            audio.src = t.url;
          }),
      ),
    );

    this.unlocked = true;
  }

  private playClone(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      const clone = audio.cloneNode(true) as HTMLAudioElement;
      clone.addEventListener('ended', () => resolve(), { once: true });
      clone.play().catch(() => resolve());
    });
  }

  private speak(text: string, rate = 0.85): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = rate;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  async playBall(ball: { number: number; letter: string }, repeat: boolean): Promise<void> {
    const audio = this.ballAudio.get(ball.number);
    const text = `${ball.letter}, ${ball.number}`;

    if (audio && !this.fallbackMode) {
      await this.playClone(audio);
      if (repeat) {
        await wait(700);
        await this.playClone(audio);
      }
    } else {
      await this.speak(text);
      if (repeat) {
        await wait(300);
        await this.speak(text);
      }
    }
  }

  playSfx(name: 'win' | 'tick' | 'phase-start'): void {
    const audio = this.sfxAudio.get(name);
    if (audio && !this.fallbackMode) void this.playClone(audio);
  }
}

export const bingoAudio = new BingoAudioController();
