import 'dotenv/config';
import { createServer } from 'node:http';
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

const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: { origin: CLIENT_ORIGIN },
});

registerSocketHandlers(io);

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
    });
  });
