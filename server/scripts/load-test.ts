// Teste de carga: simula N jogadores entrando ao mesmo tempo e jogando até o
// fim, contra um servidor já rodando. Rode com: node scripts/load-test.ts
// (o servidor precisa estar de pé em http://localhost:3001, ou ajuste SERVER_URL).

import { io, type Socket } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:3001';
const NUM_PLAYERS = Number(process.env.LOAD_TEST_PLAYERS ?? 30);

type Card = { cardId: string; displayNumber: string; hash: string };

function connect(): Socket {
  return io(SERVER_URL, { reconnection: false, forceNew: true });
}

function waitFor<T>(socket: Socket, event: string, timeoutMs = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout esperando "${event}"`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  console.log(`Teste de carga: ${NUM_PLAYERS} jogadores contra ${SERVER_URL}`);
  const startedAt = Date.now();
  const errors: unknown[] = [];

  // 1. Host cria a sala.
  const host = connect();
  await waitFor(host, 'connect');

  const createRes = await new Promise<{ ok: true; roomId: string; joinCode: string } | { ok: false; error: string }>(
    (resolve) => {
      host.emit(
        'host:createRoom',
        {
          settings: { drawMode: 'AUTO', intervalSeconds: 3, maxCardsPerPlayer: 1 },
          phases: [{ mode: 'CARTELA_CHEIA', prizeLabel: 'Teste de carga' }],
        },
        resolve,
      );
    },
  );
  if (!createRes.ok) throw new Error(`falha ao criar sala: ${createRes.error}`);
  const { joinCode } = createRes;
  console.log(`Sala criada: ${joinCode}`);

  host.on('error', (e) => errors.push(e));

  let nearWinUpdates = 0;
  host.on('nearWin:update', () => {
    nearWinUpdates++;
  });

  const finishedPromise = waitFor(host, 'game:finished', 5 * 60_000);

  // 2. N jogadores entram "ao mesmo tempo".
  const joinStart = Date.now();
  const players = await Promise.all(
    Array.from({ length: NUM_PLAYERS }, async (_, i) => {
      const socket = connect();
      await waitFor(socket, 'connect');
      socket.on('error', (e) => errors.push({ player: i, ...e }));

      const cardsPromise = waitFor<{ cards: Card[] }>(socket, 'player:cardAssigned');
      const joinRes = await new Promise<{ ok: true; playerId: string } | { ok: false; error: string }>((resolve) => {
        socket.emit('player:join', { joinCode, name: `Jogador ${i + 1}` }, resolve);
      });
      if (!joinRes.ok) throw new Error(`jogador ${i + 1} falhou ao entrar: ${joinRes.error}`);
      const { cards } = await cardsPromise;
      return { socket, playerId: joinRes.playerId, card: cards[0]! };
    }),
  );
  const joinMs = Date.now() - joinStart;
  console.log(`${players.length} jogadores entraram em ${joinMs}ms`);

  // 3. Verifica que todas as cartelas são únicas (sem colisão de hash).
  const hashes = new Set(players.map((p) => p.card.hash));
  const uniqueCards = hashes.size === players.length;
  console.log(`Cartelas únicas: ${uniqueCards ? 'OK' : 'FALHOU'} (${hashes.size}/${players.length})`);

  // 4. Inicia o sorteio e aguarda o fim do jogo.
  host.emit('host:startGame', {});
  console.log('Sorteio iniciado, aguardando o jogo terminar (cartela cheia)...');

  const report = await finishedPromise;
  const totalMs = Date.now() - startedAt;

  console.log('\n--- Resultado ---');
  console.log(`Tempo total: ${totalMs}ms`);
  console.log(`Atualizações de "quase lá" recebidas: ${nearWinUpdates}`);
  console.log(`Erros recebidos via socket: ${errors.length}`);
  if (errors.length > 0) console.log(errors.slice(0, 5));
  console.log('Relatório final:', JSON.stringify(report, null, 2).slice(0, 500), '...');

  for (const p of players) p.socket.disconnect();
  host.disconnect();

  if (!uniqueCards || errors.length > 0) {
    console.error('\nTESTE FALHOU');
    process.exit(1);
  }
  console.log('\nTESTE PASSOU');
}

main().catch((err) => {
  console.error('Erro no teste de carga:', err);
  process.exit(1);
});
