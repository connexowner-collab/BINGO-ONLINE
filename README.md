# Bingo Online

Aplicação web de bingo ao vivo para eventos presenciais: painel de sorteio (para TV/projetor) + cartela no celular dos jogadores, sincronizados em tempo real via Socket.IO. **O servidor é a única fonte da verdade** — o cliente nunca decide número sorteado, marcação ou vitória.

## Estrutura

```
/server   Node.js + TypeScript + Express + Socket.IO (motor do jogo, sockets, persistência)
/client   React + Vite + TypeScript + Tailwind (painel /host e cartela /play)
/scripts  Geração dos áudios (vozes das bolas + efeitos sonoros)
```

## Como rodar localmente

### 1. Servidor

```bash
cd server
npm install
npm run build
npm start        # http://localhost:3001
```

Para desenvolvimento com reload automático:

```bash
npm run build:watch     # terminal 1 — recompila em segundo plano
npm run dev              # terminal 2 — roda e reinicia ao mudar o dist/
```

Variáveis de ambiente (`server/.env`, veja `.env.example`):

| Variável | Obrigatória? | Descrição |
|---|---|---|
| `PORT` | não (default 3001) | porta do servidor |
| `CLIENT_ORIGIN` | não (default `http://localhost:5173`) | origem permitida no CORS do Socket.IO |
| `SUPABASE_URL` | não | ativa a persistência (recuperação após restart, log de auditoria) |
| `SUPABASE_SERVICE_ROLE_KEY` | não | idem — **nunca** committar este valor |

Sem as variáveis do Supabase, o servidor funciona 100% em memória (sem recuperação após restart).

### 2. Cliente

```bash
cd client
npm install
npm run dev       # http://localhost:5173
```

Abra `http://localhost:5173/host` no notebook ligado à TV e `http://localhost:5173/play/<CÓDIGO>` no celular (ou escaneie o QR code exibido no painel).

### 3. Testes e typecheck

```bash
cd server
npm test          # 32 testes unitários (engine, cartelas, avaliação de vitória)
npm run typecheck
```

## Gerando os áudios

Os 75 arquivos de voz das bolas (`B, sete`, `O, setenta e cinco`, etc.) e os 3 efeitos sonoros (`win`, `tick`, `phase-start`) já estão versionados em `client/public/audio/`. Para regenerá-los:

```bash
node scripts/generate-audio.ts
```

- **Efeitos sonoros**: sintetizados localmente em JavaScript puro (sem dependências).
- **Vozes das bolas**: geradas via SAPI (voz `Microsoft Maria` pt-BR nativa do Windows) — só funciona rodando o script no Windows. Em outros sistemas operacionais, o script pula essa etapa e o painel usa automaticamente o fallback `SpeechSynthesis` do navegador (funciona igual, só que "ao vivo" em vez de pré-gravado).
- **Formato**: `.wav`, não `.mp3` — este ambiente não tem um encoder MP3 disponível (sem ffmpeg). O navegador reproduz `.wav` de forma idêntica; só ocupa um pouco mais de espaço em disco.

## Persistência (Supabase)

O spec original previa SQLite local; trocamos por **Supabase (Postgres)** para viabilizar o deploy sem depender de compilação nativa (`better-sqlite3` exige Visual Studio Build Tools, indisponível neste ambiente) e para reaproveitar a infraestrutura que já existia no projeto.

Para ativar a persistência, rode uma vez o script em `server/supabase/schema.sql` no **SQL Editor** do seu projeto Supabase (`https://supabase.com/dashboard/project/_/sql/new`). Isso cria as tabelas `rooms`, `cards` e `ball_draws`. Sem isso, o servidor detecta a ausência das tabelas, registra um aviso no log e continua funcionando normalmente em memória.

## Como conduzir um jogo do início ao fim

1. No notebook ligado à TV, abra `/host`.
2. Configure as fases (modo de vitória + nome do prêmio) e as configurações gerais (modo AUTO/MANUAL, intervalo). Clique em **Criar sala**.
3. Compartilhe o QR code / código de sala exibido — os jogadores entram pelo celular em `/play/<CÓDIGO>`.
4. Clique em **🔊 Ativar áudio e iniciar** (obrigatório — destrava o áudio no navegador) e depois em **Iniciar Sorteio**.
5. As bolas são sorteadas automaticamente (ou manualmente, no modo MANUAL). O painel fala cada número, mostra o quadro 1–75 e a lista de "quase lá".
6. Quando alguém fecha a fase, o painel celebra automaticamente e avança para a próxima fase (ou finaliza o jogo).
7. Ao final, a tela de resumo permite **exportar o relatório em JSON ou CSV**.

## Deploy

- **Client → Vercel**: o `vercel.json` na raiz já aponta para `client/`. Basta importar o repositório `BINGO-ONLINE` como projeto na Vercel.
- **Servidor (Socket.IO) → Railway ou Render**: *não* pode ir para a Vercel — funções serverless não sustentam WebSocket com estado em memória, e o sorteio automático precisa de um timer preciso de 3–20s (o cron da Vercel só roda a cada 1 minuto). Configure lá as variáveis de ambiente (`CLIENT_ORIGIN` apontando para a URL da Vercel, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) e os comandos `npm run build` / `npm start`.
- Depois do deploy do servidor, atualize `VITE_SERVER_URL` no ambiente do client (Vercel → Settings → Environment Variables) para a URL pública do servidor.

## Aviso legal

Bingo recreativo. Sem apostas ou prêmios em dinheiro.
