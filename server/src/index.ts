import 'dotenv/config';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import {
  registerSocketHandlers,
  startAutoTimer,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from './sockets/handlers.js';
import { RoomEngine } from './game/engine.js';
import { roomManager } from './roomManager.js';
import { loadActiveRooms } from './db/repository.js';
import { checkPassword, issueToken, verifyToken } from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true }));

// Login por senha única do site — só protege a tela inicial e o /host no
// client; a autoridade do jogo em si continua nos eventos host:* (ver
// roomManager.hostSecret), então mesmo que essa senha vaze não dá pra
// controlar uma sala sem também ter o hostSecret dela.
app.use('/auth', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return void res.sendStatus(204);
  next();
});

app.post('/auth/login', (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || !checkPassword(password)) {
    return res.status(401).json({ ok: false, error: 'SENHA_INVALIDA' });
  }
  res.json({ ok: true, ...issueToken() });
});

app.post('/auth/verify', (req, res) => {
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  res.json({ ok: token.length > 0 && verifyToken(token) });
});

// Modo "evento local" (seção "sem custo de nuvem"): se o client já foi
// buildado (client/dist), este mesmo processo serve o site inteiro — não
// precisa do Vite dev server nem de deploy separado. Os celulares entram
// pelo IP da rede Wi-Fi do notebook (ver log ao iniciar).
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
const servingClient = existsSync(join(clientDist, 'index.html'));
if (servingClient) {
  app.use(express.static(clientDist));
  // Roteamento do client é feito no próprio front (App.tsx lê window.location.pathname),
  // então qualquer rota não estática cai aqui e recebe o index.html.
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

registerSocketHandlers(io);

function localNetworkUrls(port: number): string[] {
  const urls: string[] = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) urls.push(`http://${addr.address}:${port}`);
    }
  }
  return urls;
}

async function restoreRoomsFromPersistence(): Promise<void> {
  const restored = await loadActiveRooms();
  for (const { room, cards } of restored) {
    const engine = RoomEngine.restore(room, cards);
    const runtime = roomManager.register(engine);
    if (room.status === 'RUNNING' && room.settings.drawMode === 'AUTO') {
      startAutoTimer(io, runtime, room.roomId);
    }
  }
  if (restored.length > 0) {
    console.log(`Restauradas ${restored.length} sala(s) da persistência.`);
  }
}

restoreRoomsFromPersistence()
  .catch((err) => console.error('[boot] falha ao restaurar salas:', err))
  .finally(() => {
    httpServer.listen(PORT, () => {
      console.log(`Servidor do Bingo rodando na porta ${PORT}`);
      if (servingClient) {
        const urls = localNetworkUrls(PORT);
        console.log('\nModo evento local: este processo também está servindo o site.');
        console.log(`Painel (neste notebook): http://localhost:${PORT}/host`);
        if (urls.length > 0) {
          console.log('Celulares na mesma rede Wi-Fi entram em:');
          for (const url of urls) console.log(`  ${url}`);
        } else {
          console.log('Não encontrei um IP de rede local — confirme se o Wi-Fi está conectado.');
        }
      }
    });
  });
