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

  /** Token da chamada de playBall em andamento — usado para cancelar repetições
   * de um número que já foi superado por um sorteio mais novo (ver playBall). */
  private currentToken = 0;
  private activeClone: HTMLAudioElement | null = null;

  /** Interrompe imediatamente qualquer áudio/fala do número anterior. */
  private stopCurrent(): void {
    if (this.activeClone) {
      this.activeClone.pause();
      this.activeClone.currentTime = 0;
      this.activeClone = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  private playClone(audio: HTMLAudioElement, token: number): Promise<void> {
    return new Promise((resolve) => {
      if (token !== this.currentToken) return resolve(); // já foi superado antes de começar
      const clone = audio.cloneNode(true) as HTMLAudioElement;
      this.activeClone = clone;
      const finish = () => {
        if (this.activeClone === clone) this.activeClone = null;
        resolve();
      };
      clone.addEventListener('ended', finish, { once: true });
      clone.play().catch(finish);
    });
  }

  private speak(text: string, rate: number, token: number): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || token !== this.currentToken) {
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

  /**
   * Fala a bola sorteada. Se uma bola mais nova for sorteada antes da fala
   * (ou da repetição) terminar, a anterior é cortada na hora e nunca repete
   * — sem isso, sorteios rápidos deixavam vários números se sobrepondo.
   */
  async playBall(ball: { number: number; letter: string }, repeat: boolean): Promise<void> {
    const token = ++this.currentToken;
    this.stopCurrent();

    const audio = this.ballAudio.get(ball.number);
    const text = `${ball.letter}, ${ball.number}`;

    if (audio && !this.fallbackMode) {
      await this.playClone(audio, token);
      if (repeat && token === this.currentToken) {
        await wait(700);
        if (token === this.currentToken) await this.playClone(audio, token);
      }
    } else {
      await this.speak(text, 0.85, token);
      if (repeat && token === this.currentToken) {
        await wait(300);
        if (token === this.currentToken) await this.speak(text, 0.85, token);
      }
    }
  }

  playSfx(name: 'win' | 'tick' | 'phase-start'): void {
    const audio = this.sfxAudio.get(name);
    // Efeitos sonoros tocam por conta própria — usa clone direto (sem token),
    // não competem com o cancelamento da voz das bolas.
    if (audio && !this.fallbackMode) {
      const clone = audio.cloneNode(true) as HTMLAudioElement;
      void clone.play().catch(() => undefined);
    }
  }
}

export const bingoAudio = new BingoAudioController();
