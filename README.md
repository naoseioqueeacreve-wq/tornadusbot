# meu-bot

Base de bot de WhatsApp (Node.js + Baileys 7.0.0-rc14, ESM), seguindo o curso:
**connect.js conecta; index.js decide; a case só despacha.**

## Estrutura

```
meu-bot/
├─ package.json
├─ .gitignore
├─ session/              # credenciais (NUNCA publicar)
├─ data/                 # banco JSON (ignorado pelo Git)
└─ src/
   ├─ connect.js         # conexão, pareamento, reconexão, encaminha mensagens
   ├─ index.js           # parser (prefix/command/args/q) + switch/case
   ├─ config.js          # prefixo, dono, timeouts
   ├─ commands/          # comandos grandes (menu, buscar, play, saldo)
   ├─ functions/         # funções reutilizáveis (named e default export)
   ├─ scrapers/          # integrações externas (retornam { ok, data | error })
   └─ database/          # acesso a dados isolado
```

## Requisitos

- Node.js 22 ou 24 (LTS)
- Termux: `pkg update && pkg upgrade && pkg install nodejs git`

## Como rodar

```bash
npm install
npm start
```

Na primeira execução, digite o número com DDI+DDD (ex: `5516999999999`) e use o código no WhatsApp:
**Aparelhos conectados → Conectar com número de telefone**.
Depois disso a pasta `session/` permite reconectar sem parear de novo.
Se aparecer logout, apague `session/` e rode novamente.

## Comandos incluídos

`!ping` `!say` `!menu`/`!help` `!ola` `!upper` `!lower` `!somar` `!esperar` `!status` `!buscar` `!play` `!saldo` `!dono`

## Como criar um comando novo

1. Crie `src/commands/meucomando.js` exportando `executeMeuComando(ctx)`.
2. Importe em `src/index.js` e adicione a case:
   ```js
   case 'meucomando': {
     return executeMeuComando(ctx)
   }
   ```
3. Se precisar de dados externos, crie um módulo em `scrapers/` que **retorna dados** (sem conhecer `reply`).

O `ctx` contém: `client, msg, from, sender, senderNumber, pushname, isGroup, isOwner, command, args, q, reply`.

## Rodando 24h em VPS

Use um gerenciador de processos (ex: PM2 ou systemd) para reiniciar após crash/reboot e guardar logs:

```bash
npm i -g pm2
pm2 start src/connect.js --name meu-bot
pm2 save && pm2 startup
```

## Segurança

- Nunca publique `session/`, `creds.json`, tokens ou dados pessoais.
- Nunca execute código ou shell recebido por mensagem.
- Antes de atualizar o Baileys: backup, leia o changelog, teste em cópia.

> O `!play` usa a iTunes Search API (prévia de 30s) apenas como exemplo de arquitetura.
> Use sempre fontes que permitam integração.
