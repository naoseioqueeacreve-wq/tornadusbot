import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import { handleMessage } from './index.js';
import { BOT_NAME, OWNER_NUMBER, PREFIX, API_KEY } from './config.js';
import { iniciarSpawn } from './functions/pokemonSpawn.js';
import { getGrupo } from './functions/adminDB.js';
import { verificarEntradaListaNegra } from './commands/protecao.js';
import { verificarEntradaGestao, iniciarAutoFechar } from './commands/gestao.js';
import { verificarSaidaGrupo } from './commands/automacao.js';
// IMPORT COM O NOME NOVO (COM ESPAÇO)
import { verificarAntiPayment } from './functions/anti paymente.js';

const execAsync = promisify(exec);
const logger = pino({ level: 'silent' });

const colors = {
  reset:   "\x1b[0m",
  bright:  "\x1b[1m",
  green:   "\x1b[32m",
  yellow:  "\x1b[33m",
  blue:    "\x1b[34m",
  magenta: "\x1b[35m",
  cyan:    "\x1b[36m",
  red:     "\x1b[31m"
};

function log(cor, emoji, msg) {
  const hora = new Date().toLocaleTimeString('pt-BR');
  console.log(`${cor}[${hora}] ${emoji} ${msg}${colors.reset}`);
}

async function verificarFFmpeg() {
  try {
    await execAsync('ffmpeg -version');
    log(colors.green, '✅', 'FFmpeg já está instalado.');
  } catch {
    log(colors.yellow, '⚠️', 'FFmpeg não encontrado. Tentando instalar...');
    try {
      await execAsync('sudo apt-get update && sudo apt-get install -y ffmpeg', { timeout: 300000 });
      log(colors.green, '✅', 'FFmpeg instalado com sucesso!');
    } catch {
      try {
        await execAsync('pkg install ffmpeg -y', { timeout: 300000 });
        log(colors.green, '✅', 'FFmpeg instalado via pkg!');
      } catch {
        log(colors.red, '❌', 'Não foi possível instalar o FFmpeg automaticamente.');
      }
    }
  }
}

async function corrigirSharpInterno() {
  const caminho = './node_modules/wa-sticker-formatter/node_modules/sharp';
  try {
    if (fs.existsSync(caminho)) {
      log(colors.yellow, '🔧', 'Removendo sharp interno quebrado...');
      await execAsync(`rm -rf ${caminho}`);
    }
  } catch {}
}

async function verificarDependencias() {
  log(colors.cyan, '🔍', 'Verificando dependências...');
  for (const pkg of ['node-cron', 'pino', 'simple-git', 'qrcode-terminal']) {
    try {
      await import(pkg);
    } catch {
      log(colors.yellow, '⏳', `Instalando ${pkg}...`);
      try {
        execSync(`npm install ${pkg}`, { stdio: 'inherit' });
        log(colors.green, '✅', `${pkg} instalado!`);
      } catch {
        log(colors.red, '❌', `Falha ao instalar ${pkg}.`);
      }
    }
  }
  try { await import('sharp'); } catch {
    log(colors.yellow, '⚠️', 'Instalando sharp...');
    try { execSync('npm install sharp', { stdio: 'inherit' }); } catch {}
  }
  try { await import('wa-sticker-formatter'); } catch {
    log(colors.yellow, '⏳', 'Instalando wa-sticker-formatter...');
    try { execSync('npm install wa-sticker-formatter', { stdio: 'inherit' }); } catch {}
  }
  await corrigirSharpInterno();
}

async function atualizarRecado(client) {
  const recado = `🤖 ${BOT_NAME} | Online`;
  setTimeout(async () => {
    try {
      await client.query({
        tag: 'iq',
        attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
        content: [{ tag: 'status', attrs: {}, content: Buffer.from(recado, 'utf-8') }],
      });
      log(colors.cyan, '✅', 'Recado do WhatsApp atualizado!');
    } catch (e) {
      log(colors.red, '❌', `Erro ao atualizar recado: ${e.message}`);
    }
  }, 5000);
}

function extrairJid(p) {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return p.id || p.jid || p.participant || p.userJid || '';
  return String(p);
}

function obterNumeroAntigo() {
  const credsPath = './session/creds.json';
  if (!fs.existsSync(credsPath)) return null;
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    return creds?.me?.id?.split('@')[0]?.split(':')[0] || null;
  } catch {
    return null;
  }
}

function sessaoExiste() {
  return fs.existsSync('./session/creds.json');
}

async function conectarComCodigo(phone) {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const client = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false
  });

  let codigoGerado = false;

  client.ev.on('connection.update', async ({ qr }) => {
    if (qr && !codigoGerado) {
      codigoGerado = true;
      try {
        const code = await client.requestPairingCode(phone);
        console.log(`\n${colors.green}╔══════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.green}║   CÓDIGO DE PAREAMENTO: ${colors.bright}${colors.yellow}${code.padEnd(10)}${colors.reset}${colors.green}   ║${colors.reset}`);
        console.log(`${colors.green}╚══════════════════════════════════════╝${colors.reset}`);
        console.log(`${colors.cyan}👉 WhatsApp > Aparelhos Conectados > Conectar com número > Digite o código acima${colors.reset}`);
        console.log(`${colors.red}⚠️  Você tem 1 minuto para digitar o código!${colors.reset}\n`);
      } catch (e) {
        log(colors.red, '❌', `Erro ao gerar código: ${e.message}`);
      }
    }
  });

  client.ev.on('creds.update', saveCreds);
  configurarListeners(client);
}

async function conectarComQR() {
  const qrcode = (await import('qrcode-terminal')).default;
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const client = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false
  });

  client.ev.on('connection.update', ({ qr }) => {
    if (qr) {
      console.log(`\n${colors.cyan}╔══════════════════════════════════════╗${colors.reset}`);
      console.log(`${colors.cyan}║     ESCANEIE O QR CODE ABAIXO         ║${colors.reset}`);
      console.log(`${colors.cyan}╚══════════════════════════════════════╝${colors.reset}\n`);
      qrcode.generate(qr, { small: true });
      console.log(`${colors.yellow}👉 WhatsApp > Aparelhos Conectados > Conectar um aparelho${colors.reset}`);
      console.log(`${colors.red}⚠️  O QR Code expira em cerca de 20 segundos e será renovado automaticamente.${colors.reset}\n`);
    }
  });

  client.ev.on('creds.update', saveCreds);
  configurarListeners(client);
}

export async function startConnect(silencioso = false) {
  await verificarDependencias();
  await verificarFFmpeg();

  if (silencioso && sessaoExiste()) {
    log(colors.yellow, '🔄', 'Reconectando à sessão existente...');
    return conectarSessaoExistente();
  }

  const phoneEnv = process.env.PHONE_NUMBER?.replace(/\D/g, '');
  if (phoneEnv && phoneEnv.length >= 10) {
    log(colors.green, '✅', `Número via variável de ambiente: +${phoneEnv}`);
    return conectarComCodigo(phoneEnv);
  }

  if (sessaoExiste()) {
    const numeroSalvo = obterNumeroAntigo();
    if (numeroSalvo) {
      log(colors.green, '📱', `Sessão encontrada para +${numeroSalvo}. Conectando...`);
    } else {
      log(colors.green, '📁', 'Sessão encontrada. Conectando...');
    }
    return conectarSessaoExistente();
  }

  await exibirMenu();
}

async function exibirMenu() {
  const rl = readline.createInterface({ input, output });

  console.log(`\n${colors.cyan}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║       BEM-VINDO AO ${BOT_NAME.toUpperCase().padEnd(18)}║${colors.reset}`);
  console.log(`${colors.cyan}╠═══════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.green}║  [1] Conectar via Código de Pareamento║${colors.reset}`);
  console.log(`${colors.blue}║  [2] Conectar via QR Code             ║${colors.reset}`);
  console.log(`${colors.yellow}║  [3] Suporte                          ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════╝${colors.reset}\n`);

  let escolha = '';
  while (!['1', '2', '3'].includes(escolha.trim())) {
    escolha = await rl.question(`${colors.yellow}Escolha uma opção (1, 2 ou 3): ${colors.reset}`);
  }
  escolha = escolha.trim();

  if (escolha === '3') {
    console.log(`\n${colors.cyan}📞 Suporte: https://wa.me/5511999999999\n${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  if (escolha === '2') {
    rl.close();
    log(colors.yellow, '⏳', 'Gerando QR Code...');
    return conectarComQR();
  }

  let phone = '';
  while (phone.length < 10) {
    const raw = await rl.question(`${colors.cyan}📱 Digite seu número com DDD (Ex: 5511999999999):\n${colors.yellow}Número: ${colors.reset}`);
    phone = raw.replace(/\D/g, '');
    if (phone.length < 10) log(colors.red, '❌', 'Número inválido. Tente novamente.');
  }

  rl.close();
  log(colors.yellow, '⏳', `Iniciando conexão para +${phone}...`);
  await conectarComCodigo(phone);
}

async function conectarSessaoExistente() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const client = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false
  });
  client.ev.on('creds.update', saveCreds);
  configurarListeners(client);
}

function configurarListeners(client) {
  client.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'connecting') {
      log(colors.yellow, '⏳', 'Conectando ao WhatsApp...');
    }

    if (connection === 'open') {
      console.log(`\n${colors.green}╔══════════════════════════════╗${colors.reset}`);
      console.log(`${colors.green}║   🎉 BOT CONECTADO!          ║${colors.reset}`);
      console.log(`${colors.green}╚══════════════════════════════╝\n${colors.reset}`);
      await atualizarRecado(client);
      iniciarSpawn(client);
      iniciarAutoFechar(client);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const sessaoInvalida = [
        DisconnectReason.loggedOut,
        DisconnectReason.badSession,
        401,
        403
      ].includes(statusCode);

      if (sessaoInvalida) {
        log(colors.red, '❌', `Sessão encerrada (código ${statusCode}). Apagando sessão...`);
        if (fs.existsSync('./session')) {
          fs.rmSync('./session', { recursive: true, force: true });
        }
        setTimeout(() => startConnect(false), 3000);
      } else {
        log(colors.yellow, '🔄', `Conexão perdida (código ${statusCode ?? 'desconhecido'}). Reconectando...`);
        setTimeout(() => startConnect(true), 3000);
      }
    }
  });

  client.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      // 🚨 Verifica Anti-Payment
      const bloqueado = await verificarAntiPayment(client, msg);
      if (bloqueado) continue;

      const isGroup = msg.key.remoteJid.endsWith('@g.us');
      const sender = msg.key.participant || msg.key.remoteJid;
      const pushName = msg.pushName || 'Desconhecido';
      log(colors.cyan, '📥', `${pushName} (${sender.split('@')[0]})${isGroup ? ` › ${msg.key.remoteJid.split('@')[0]}` : ''}`);
      await handleMessage(client, msg);
    }
  });

  configurarParticipantes(client);
  configurarAntiCall(client);
}

function configurarParticipantes(client) {
  client.ev.on('group-participants.update', async (update) => {
    try {
      const { id: grupoJid, participants, action, author } = update;

      if (action === 'add') {
        const removidos = await verificarEntradaListaNegra(client, grupoJid, participants);
        await verificarEntradaGestao(client, grupoJid, participants, removidos);
        const restantes = participants.filter(p => !removidos.has(extrairJid(p)));
        if (!restantes.length) return;

        const configGP = getGrupo(grupoJid);

        if (configGP.antiFake) {
          for (const p of restantes) {
            const jid = extrairJid(p);
            if (!jid) continue;
            const numero = jid.split('@')[0].split(':')[0];
            if (!numero.startsWith('55')) {
              try {
                await client.groupParticipantsUpdate(grupoJid, [jid], 'remove');
                await client.sendMessage(grupoJid, {
                  text: `🚫 *ANTI-FAKE*\n\n@${numero} foi removido por não ter número brasileiro.`,
                  mentions: [jid]
                });
              } catch {}
            }
          }
        }

        if (configGP.bemVindo) {
          const meta = await client.groupMetadata(grupoJid).catch(() => null);
          const nomeGrupo = meta?.subject || 'o grupo';
          for (const p of restantes) {
            const jid = extrairJid(p);
            if (!jid) continue;
            const nome = jid.split('@')[0].split(':')[0];
            const legenda = configGP.legendaBV
              .replace(/{nome}/g, `@${nome}`)
              .replace(/{grupo}/g, nomeGrupo);
            const payload = { text: legenda, mentions: [jid] };
            if (configGP.fotoBV && fs.existsSync(configGP.fotoBV)) {
              payload.image = fs.readFileSync(configGP.fotoBV);
              payload.caption = legenda;
              delete payload.text;
            }
            await client.sendMessage(grupoJid, payload);
          }
        }
      }

      if (action === 'remove') {
        await verificarSaidaGrupo(client, grupoJid, participants, author);
      }
    } catch {}
  });
}

function configurarAntiCall(client) {
  client.ev.on('call', async (calls) => {
    const lista = Array.isArray(calls) ? calls : [calls];
    for (const call of lista) {
      let groupJid = call.chatId?.endsWith('@g.us') ? call.chatId : null;
      if (!groupJid && call.chatId?.endsWith('@call')) {
        try {
          const grupos = await client.groupFetchAllParticipating();
          for (const idGrupo in grupos) {
            const encontrou = grupos[idGrupo].participants.find(
              p => p.id.split('@')[0].split(':')[0] === call.from.split('@')[0].split(':')[0]
            );
            if (encontrou) { groupJid = idGrupo; break; }
          }
        } catch {}
      }
      if (!groupJid) continue;
      const configGP = getGrupo(groupJid);
      if (configGP?.antiCall) {
        try {
          await client.groupParticipantsUpdate(groupJid, [call.from], 'remove');
          await client.sendMessage(groupJid, {
            text: `📵 *ANTI-CALL*\n\n@${call.from.split('@')[0].split(':')[0]} foi removido por iniciar uma chamada.`,
            mentions: [call.from]
          });
        } catch {}
      }
    }
  });
}

startConnect().catch(console.error);
