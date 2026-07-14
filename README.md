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

### Opção A — evento local (recomendada, sem custo)

Se todo mundo vai estar no mesmo lugar (mesma festa, mesmo Wi-Fi), não precisa de nenhum serviço de nuvem pago. O próprio servidor serve o site inteiro:

```bash
cd server
npm run start:local-event
```

Isso builda o client, builda o servidor e sobe tudo num processo só. O terminal mostra dois endereços:

- `http://localhost:3001/host` — abra este no notebook ligado à TV.
- `http://SEU-IP-NA-REDE:3001` — os celulares entram por aqui (mesma rede Wi-Fi), ou escaneiam o QR code que aparece no painel.

Não precisa configurar `VITE_SERVER_URL`: o client detecta sozinho o endereço de onde a página foi carregada.

### Opção A+ — evento local, mas com jogadores em qualquer rede (5G, outro Wi-Fi)

Se nem todo mundo vai estar no Wi-Fi da festa, use isto em vez da opção A — mesmo notebook, mas com um túnel público gratuito ([localtunnel](https://github.com/localtunnel/localtunnel), sem conta, sem custo):

```bash
cd server
npm run start:public
```

Isso sobe o servidor e o túnel juntos e imprime um endereço `https://algumacoisa.loca.lt` que funciona de qualquer rede com internet. **Abra o painel usando esse endereço** (não `localhost`), para o QR code gerado já funcionar para todo mundo. A primeira vez que alguém abre o link, o localtunnel mostra uma tela pedindo para clicar em "Continue" — é normal, só precisa uma vez por pessoa.

### Opção B — nuvem (site acessível de qualquer lugar, sem depender do notebook ficar ligado)

- **Client → Vercel**: o `vercel.json` na raiz já aponta para `client/`. Basta importar o repositório `BINGO-ONLINE` como projeto na Vercel.
- **Servidor (Socket.IO) → um serviço com processo persistente** (Render tem plano gratuito com "cold start"; Railway e Fly.io têm planos pagos a partir de poucos dólares/mês) — *não* pode ir para a Vercel, que só roda funções serverless sem estado em memória e sem timer preciso de 3–20s. Configure lá as variáveis de ambiente (`CLIENT_ORIGIN` apontando para a URL da Vercel, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) e os comandos `npm run build` / `npm start`.
- Depois do deploy do servidor, atualize `VITE_SERVER_URL` no ambiente do client (Vercel → Settings → Environment Variables) para a URL pública do servidor, e refaça o deploy do client.

## Aviso legal

Bingo recreativo. Sem apostas ou prêmios em dinheiro.
