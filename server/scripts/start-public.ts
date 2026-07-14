// Sobe o servidor (que já serve o client, ver index.ts) + um túnel público
// gratuito (localtunnel), para que jogadores em qualquer rede — Wi-Fi da
// festa, 5G, outra rede — consigam entrar, não só quem está no mesmo Wi-Fi
// do notebook. Sem conta, sem custo: roda com `npm run start:public`.

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);

function prefixLines(prefix: string, chunk: Buffer | string): string {
  return chunk
    .toString()
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => `${prefix} ${line}`)
    .join('\n');
}

const server = spawn(process.execPath, [join(__dirname, '..', 'dist', 'index.js')], {
  stdio: ['inherit', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => console.log(prefixLines('[servidor]', d)));
server.stderr.on('data', (d) => console.error(prefixLines('[servidor]', d)));

// shell: true é necessário no Windows para rodar o `npx.cmd` (Node não
// executa arquivos .cmd diretamente via spawn sem um shell). PORT é sempre
// numérico (Number(...) acima), então é seguro embutir na string do comando.
const tunnel = spawn(`npx localtunnel --port ${PORT}`, { stdio: ['inherit', 'pipe', 'pipe'], shell: true });

let announced = false;
tunnel.stdout.on('data', (d: Buffer) => {
  const text = d.toString();
  console.log(prefixLines('[túnel]', text));
  const match = text.match(/your url is:\s*(https:\/\/\S+)/i);
  if (match && !announced) {
    announced = true;
    const publicUrl = match[1];
    console.log('\n=================================================================');
    console.log(' Endereço público (funciona em qualquer rede — Wi-Fi, 5G, etc.):');
    console.log(`   ${publicUrl}`);
    console.log('');
    console.log(' IMPORTANTE: abra o painel usando ESSE endereço (não "localhost"),');
    console.log(' assim o QR code que aparece na tela já funciona para todo mundo:');
    console.log(`   ${publicUrl}/host`);
    console.log('=================================================================\n');
  }
});
tunnel.stderr.on('data', (d) => console.error(prefixLines('[túnel]', d)));

function shutdown() {
  server.kill();
  tunnel.kill();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('exit', (code) => {
  console.error(`[servidor] encerrou (código ${code}) — derrubando o túnel também.`);
  tunnel.kill();
  process.exit(code ?? 1);
});
