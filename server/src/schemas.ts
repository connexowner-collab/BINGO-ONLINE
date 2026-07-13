// Validação zod de todos os payloads recebidos via socket (seção 10: "Validação zod em 100% dos eventos entrantes").

import { z } from 'zod';

export const winModeSchema = z.enum(['QUINA', 'COLUNA', 'DIAGONAL', 'QUATRO_CANTOS', 'X', 'MOLDURA', 'CARTELA_CHEIA']);

export const phaseInputSchema = z.object({
  mode: winModeSchema,
  prizeLabel: z.string().min(1).max(120),
});

export const roomSettingsPartialSchema = z
  .object({
    drawMode: z.enum(['AUTO', 'MANUAL']),
    intervalSeconds: z.number().int().min(3).max(20),
    maxCardsPerPlayer: z.number().int().min(1).max(4),
    autoMark: z.boolean(),
    celebrationSeconds: z.number().int().min(3).max(60),
    anunciarVencedorAutomatico: z.boolean(),
    permitirVitoriaRepetida: z.boolean(),
    allowLateJoin: z.boolean(),
    voiceEnabled: z.boolean(),
    voiceRepeat: z.boolean(),
  })
  .partial();

export const hostCreateRoomSchema = z.object({
  settings: roomSettingsPartialSchema.optional(),
  phases: z.array(phaseInputSchema).min(1),
});

export const hostRejoinRoomSchema = z.object({
  roomId: z.string().min(1),
});

export const playerJoinSchema = z.object({
  joinCode: z
    .string()
    .length(6)
    .transform((s) => s.toUpperCase()),
  name: z.string().min(1).max(40),
  playerId: z.string().min(1).optional(),
});

export const emptyPayloadSchema = z.object({}).strict();

export const hostDeclareWinnerSchema = z.object({
  displayNumber: z.string().min(1).max(10),
});
