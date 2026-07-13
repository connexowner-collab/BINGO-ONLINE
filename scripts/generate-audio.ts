// Gera os assets de áudio do painel (seção 7 do spec):
//   - client/public/audio/balls/{letra}-{numero}.wav  (75 arquivos, via SAPI no Windows)
//   - client/public/audio/sfx/{win,tick,phase-start}.wav (sintetizados aqui, sem dependências)
//
// Rode com: node scripts/generate-audio.ts
//
// Nota de formato: usamos .wav em vez de .mp3 porque este projeto não depende
// de nenhum encoder MP3 (nem ffmpeg, nem libs nativas) — o navegador toca
// .wav de forma idêntica via <audio>. Ver client/src/lib/audio.ts.

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SFX_DIR = join(__dirname, '..', 'client', 'public', 'audio', 'sfx');
const SAMPLE_RATE = 44100;

function toneSamples(freqHz: number, durationMs: number, amplitude = 0.5): Float32Array {
  const n = Math.floor((durationMs / 1000) * SAMPLE_RATE);
  const samples = new Float32Array(n);
  const fadeSamples = Math.min(200, Math.floor(n / 6));
  for (let i = 0; i < n; i++) {
    const envelope = i < fadeSamples ? i / fadeSamples : i > n - fadeSamples ? (n - i) / fadeSamples : 1;
    samples[i] = Math.sin((2 * Math.PI * freqHz * i) / SAMPLE_RATE) * amplitude * envelope;
  }
  return samples;
}

function silenceSamples(durationMs: number): Float32Array {
  return new Float32Array(Math.floor((durationMs / 1000) * SAMPLE_RATE));
}

function concat(...chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function encodeWav(samples: Float32Array): Buffer {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // tamanho do bloco fmt
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bits por amostra
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
}

function writeSfx(name: string, samples: Float32Array) {
  mkdirSync(SFX_DIR, { recursive: true });
  writeFileSync(join(SFX_DIR, `${name}.wav`), encodeWav(samples));
  console.log(`  gerado sfx/${name}.wav`);
}

function generateSfx() {
  console.log('Gerando efeitos sonoros...');
  writeSfx('tick', toneSamples(1200, 60, 0.4));
  writeSfx(
    'win',
    concat(toneSamples(523.25, 120), toneSamples(659.25, 120), toneSamples(783.99, 120), toneSamples(1046.5, 240)),
  );
  writeSfx('phase-start', concat(toneSamples(440, 150), silenceSamples(40), toneSamples(880, 220)));
}

function generateBallVoices() {
  if (process.platform !== 'win32') {
    console.warn(
      'Plataforma não-Windows detectada: pulando a geração das 75 vozes das bolas.\n' +
        'O painel funciona normalmente via fallback SpeechSynthesis do navegador.\n' +
        'Para gerar os arquivos reais, rode este script no Windows (usa a voz SAPI pt-BR nativa).',
    );
    return;
  }

  console.log('Gerando 75 vozes das bolas via SAPI (pt-BR)...');
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(__dirname, 'generate-audio.ps1')],
    { stdio: 'inherit' },
  );
}

generateSfx();
generateBallVoices();
console.log('Concluído.');
