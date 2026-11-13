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

const execAsync = promisify(exec);
const logger = pino({ level: 'silent' });

// =========================================
// CORES DO TERMINAL
// =========================================
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m"
};

// =========================================
// INSTALAÇÃO AUTOMÁTICA DO FFMPEG
// =========================================
async function verificarFFmpeg() {
  try {
    await execAsync('ffmpeg -version');
    console.log(`${colors.green}✅ FFmpeg já está instalado e funcionando.${colors.reset}`);
  } catch (error) {
    console.log(`\n${colors.yellow}⚠️ FFmpeg não encontrado. Tentando instalar automaticamente...${colors.reset}`);
    try {
      await execAsync('sudo apt-get update && sudo apt-get install -y ffmpeg', { timeout: 300000 });
      console.log(`${colors.green}✅ FFmpeg instalado com sucesso!${colors.reset}`);
    } catch (err1) {
      try {
        await execAsync('pkg install ffmpeg -y', { timeout: 300000 });
        console.log(`${colors.green}✅ FFmpeg instalado com sucesso (via pkg)!${colors.reset}`);
      } catch (err2) {
        console.log(`\n${colors.red}❌ Não foi possível instalar o FFmpeg automaticamente.${colors.reset}`);
      }
    }
  }
}

// =========================================
// ATUALIZAR O RECADO (STATUS) DO BOT
// =========================================
async function atualizarRecado(client) {
  const recado = "🤖 Freddy Bot | Contato: 55 16 99746-8496";
  setTimeout(async () => {
    try {
      await client.query({
        tag: 'iq',
        attrs: { to: '@s.whatsapp.net', type: 'set', xmlns: 'status' },
        content: [{ tag: 'status', attrs: {}, content: Buffer.from(recado, 'utf-8') }],
      });
      console.log(`${colors.cyan}✅ Recado (Status) do WhatsApp atualizado!${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}❌ Erro ao atualizar recado:${colors.reset}`, error.message);
    }
  }, 5000); 
}

// =========================================
// CORRIGE O SHARP INTERNO
// =========================================
async function corrigirSharpInterno() {
  const caminhoSharpInterno = './node_modules/wa-sticker-formatter/node_modules/sharp';
  try {
    if (fs.existsSync(caminhoSharpInterno)) {
      console.log(`${colors.yellow}🔧 Removendo sharp interno quebrado...${colors.reset}`);
      await execAsync(`rm -rf ${caminhoSharpInterno}`);
    }
  } catch (error) {}
}

// =========================================
// AUTO-DOWNLOAD DE DEPENDÊNCIAS
// =========================================
async function verificarDependencias() {
  console.log(`\n${colors.cyan}🔍 Verificando dependências do sistema...${colors.reset}`);
  const pacotesBasicos = ['node-cron', 'pino', 'simple-git'];

  for (const pacote of pacotesBasicos) {
    try {
      await import(pacote);
    } catch (error) {
      console.log(`\n${colors.yellow}⏳ Instalando dependência: ${pacote} (Aguarde)...${colors.reset}`);
      try {
        execSync(`npm install ${pacote}`, { stdio: 'inherit' });
        console.log(`${colors.green}✅ ${pacote} instalado com sucesso!${colors.reset}`);
      } catch (err) {
        console.error(`${colors.red}❌ Falha ao instalar ${pacote}.${colors.reset}`);
      }
    }
  }

  try {
    await import('sharp');
  } catch (error) {
    console.log(`\n${colors.yellow}⚠️ Sharp não encontrado. Instalando...${colors.reset}`);
    try { execSync('npm install sharp', { stdio: 'inherit' }); } catch (err) {}
  }

  try {
    await import('wa-sticker-formatter');
  } catch (error) {
    console.log(`\n${colors.yellow}⏳ Instalando wa-sticker-formatter...${colors.reset}`);
    try { execSync('npm install wa-sticker-formatter', { stdio: 'inherit' }); } catch (err) {}
  }

  await corrigirSharpInterno();
}

// =========================================
// EXTRAI JID
// =========================================
function extrairJid(p) {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return p.id || p.jid || p.participant || p.userJid || '';
  return String(p);
}

// =========================================
// LÊ O NÚMERO ANTIGO DA SESSÃO
// =========================================
function obterNumeroAntigo() {
  const credsPath = './session/creds.json';
  if (fs.existsSync(credsPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
      if (creds.me && creds.me.id) {
        return creds.me.id.split('@')[0].split(':')[0];
      }
    } catch (e) {}
  }
  return null;
}

// =========================================
// MENUS DE CONEXÃO
// =========================================
async function conectarNovoNumero() {
  let phone = process.env.PHONE_NUMBER || ''; 

  if (!phone) {
    const rl = readline.createInterface({ input, output });
    
    console.log(`\n${colors.cyan}=========================================${colors.reset}`);
    console.log(`${colors.yellow}𝐇𝐞𝐲𝐲𝐲, 𝐜𝐨𝐦𝐨 𝐠𝐨𝐬𝐭𝐚𝐫𝐢𝐚 𝐝𝐞 𝐜𝐨𝐧𝐞𝐜𝐭𝐚𝐫 𝐨 𝐛𝐨𝐭? 🤔${colors.reset}`);
    console.log(`${colors.cyan}=========================================${colors.reset}`);
    console.log(`${colors.green}1${colors.reset} - Gerar Código de Pareamento`);
    console.log(`${colors.green}2${colors.reset} - Chamar Suporte`);
    console.log(`${colors.cyan}=========================================\n${colors.reset}`);

    const escolha = await rl.question(`${colors.yellow}Opção:${colors.reset} `);
    if (escolha.trim() === '2') {
      console.log(`\n${colors.cyan}📞 SUPORTE: https://wa.me/5511999999999\n${colors.reset}`);
      rl.close(); process.exit(0);
    }

    console.log(`\n${colors.cyan}📱 Digite o número (Ex: 5511999999999) ou 0 para voltar:${colors.reset}`);
    const raw = await rl.question(`${colors.yellow}Número:${colors.reset} `);
    if (raw.trim() === '0') {
      rl.close();
      return startConnect();
    }
    phone = raw.replace(/\D/g, '');
    rl.close();
  } else {
    console.log(`\n${colors.green}✅ Número obtido via Variável de Ambiente: +${phone}${colors.reset}`);
  }

  if (phone.length < 10) {
    console.log(`${colors.red}❌ Número inválido. O bot vai reiniciar.${colors.reset}`);
    setTimeout(() => startConnect(), 3000);
    return;
  }

  console.log(`\n${colors.yellow}⏳ Iniciando conexão para o número +${phone}...${colors.reset}`);

  const sessionPath = './session';
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const client = makeWASocket({ auth: state, logger, printQRInTerminal: false });

  client.ev.on('connection.update', async (update) => {
    const { qr, connection } = update;
    
    if (qr) {
      try {
        const code = await client.requestPairingCode(phone);
        console.log(`\n${colors.green}=========================================${colors.reset}`);
        console.log(`${colors.green}✅ SEU CÓDIGO DE PAREAMENTO: ${colors.bright}${colors.yellow}${code}${colors.reset}`);
        console.log(`${colors.green}=========================================\n${colors.reset}`);
        console.log(`${colors.cyan}👉 Abra o WhatsApp no celular > Aparelhos Conectados > Conectar com número de telefone > Digite o código acima.${colors.reset}`);
        console.log(`${colors.red}⚠️ ATENÇÃO: Você tem apenas 1 minuto para digitar este código antes dele expirar!${colors.reset}`);
      } catch (error) {
        console.log(`\n${colors.red}❌ ERRO AO GERAR CÓDIGO:${colors.reset}`, error.message);
      }
    }
  });

  client.ev.on('creds.update', saveCreds);
  configurarListeners(client);
}

async function conectarSessaoExistente() {
  const sessionPath = './session';
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const client = makeWASocket({ auth: state, logger, printQRInTerminal: false });

  client.ev.on('creds.update', saveCreds);
  configurarListeners(client);
}

// =========================================
// CONFIGURAÇÃO DOS LISTENERS DO CLIENTE
// =========================================
function configurarListeners(client) {
  client.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'connecting') {
      console.log(`${colors.yellow}⏳ Conectando ao WhatsApp...${colors.reset}`);
    }
    
    if (connection === 'open') {
      console.log(`\n${colors.green}=========================================${colors.reset}`);
      console.log(`${colors.green}🎉 BOT CONECTADO COM SUCESSO!${colors.reset}`);
      console.log(`${colors.green}=========================================\n${colors.reset}`);
      
      await atualizarRecado(client);
      iniciarSpawn(client);
      iniciarAutoFechar(client);
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      
      // Se foi deslogado (401) ou deu timeout esperando o código (408)
      if (statusCode === DisconnectReason.loggedOut || statusCode === DisconnectReason.timedOut || statusCode === 401 || statusCode === 408) {
        console.log(`\n${colors.red}❌ SESSÃO EXPIRADA OU DESCONECTADA.${colors.reset}`);
        console.log(`${colors.yellow}Apagando a pasta session e pedindo o número novamente...${colors.reset}`);
        
        if (fs.existsSync('./session')) {
          fs.rmSync('./session', { recursive: true, force: true });
        }
        
        setTimeout(() => startConnect(), 3000);
      } else {
        console.log(`${colors.yellow}🔄 Conexão caiu (Motivo: ${statusCode || 'Desconhecido'}). Reconectando...${colors.reset}`);
        setTimeout(() => startConnect(), 3000);
      }
    }
  });

  client.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      
      const isGroup = msg.key.remoteJid.endsWith('@g.us');
      const sender = msg.key.participant || msg.key.remoteJid;
      const pushName = msg.pushName || 'Desconhecido';
      
      console.log(`\n${colors.cyan}📥 [NOVA MENSAGEM]${colors.reset}`);
      console.log(`${colors.yellow}👤 Remetente:${colors.reset} ${pushName} (${sender.split('@')[0]})`);
      if (isGroup) console.log(`${colors.magenta}👥 Grupo:${colors.reset} ${msg.key.remoteJid.split('@')[0]}`);
      
      await handleMessage(client, msg);
    }
  });

  configurarParticipantes(client);
  configurarAntiCall(client);
}

// =========================================
// LISTENERS DE PARTICIPANTES E ANTI-CALL
// =========================================
async function configurarParticipantes(client) {
  client.ev.on('group-participants.update', async (update) => {
    try {
      const { id: grupoJid, participants, action, author } = update;
      if (action === 'add') {
        const removidos = await verificarEntradaListaNegra(client, grupoJid, participants);
        await verificarEntradaGestao(client, grupoJid, participants, removidos);
        const restantes = participants.filter(p => !removidos.has(extrairJid(p)));
        if (restantes.length === 0) return;
        const configGP = getGrupo(grupoJid);
        if (configGP.antiFake) {
          for (const p of restantes) {
            const jid = extrairJid(p);
            if (!jid) continue;
            const numero = jid.split('@')[0].split(':')[0];
            if (!numero.startsWith('55')) {
              try {
                await client.groupParticipantsUpdate(grupoJid, [jid], 'remove');
                await client.sendMessage(grupoJid, { text: `🚫 *ANTI-FAKE*\n\n@${numero} foi removido.`, mentions: [jid] });
              } catch (e) {}
            }
          }
        }
        if (configGP.bemVindo) {
          for (const p of restantes) {
            const jid = extrairJid(p);
            if (!jid) continue;
            const nome = jid.split('@')[0].split(':')[0];
            const meta = await client.groupMetadata(grupoJid).catch(() => null);
            const nomeGrupo = meta?.subject || 'Grupo';
            let legenda = configGP.legendaBV.replace(/{nome}/g, `@${nome}`).replace(/{grupo}/g, nomeGrupo);
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
    } catch (error) {}
  });
}

async function configurarAntiCall(client) {
  client.ev.on('call', async (calls) => {
    const listaCalls = Array.isArray(calls) ? calls : [calls];
    for (const call of listaCalls) {
      let groupJid = call.chatId && call.chatId.endsWith('@g.us') ? call.chatId : null;
      if (!groupJid && call.chatId && call.chatId.endsWith('@call')) {
        try {
          const todosGrupos = await client.groupFetchAllParticipating();
          for (const idGrupo in todosGrupos) {
            const grupo = todosGrupos[idGrupo];
            const p = grupo.participants.find(p => p.id.split('@')[0].split(':')[0] === call.from.split('@')[0].split(':')[0]);
            if (p) { groupJid = idGrupo; break; }
          }
        } catch (e) {}
      }
      if (!groupJid) continue;
      const configGP = getGrupo(groupJid);
      if (configGP && configGP.antiCall === true) {
        try {
          const meta = await client.groupMetadata(groupJid);
          const callerNum = call.from.split('@')[0].split(':')[0];
          const target = meta.participants.find(p => p.id.split('@')[0].split(':')[0] === callerNum);
          if (target && !target.admin) {
            await client.groupParticipantsUpdate(groupJid, [target.id], 'remove');
            await client.sendMessage(groupJid, { text: `🚫 *ANTI-CALL*\n@${callerNum} removido.`, mentions: [target.id] });
          }
        } catch (error) {}
      }
    }
  });
}

// =========================================
// FUNÇÃO PRINCIPAL DE CONEXÃO
// =========================================
async function startConnect() {
  if (process.argv.includes('atualizar')) {
    console.log(`${colors.yellow}🔄 Iniciando atualização via terminal...${colors.reset}`);
    const { atualizarBot } = await import('./update.js');
    const res = await atualizarBot();
    console.log(res.mensagem);
    process.exit(res.sucesso ? 0 : 1);
  }

  await corrigirSharpInterno();
  await verificarFFmpeg(); 
  await verificarDependencias(); 

  const sessionPath = './session';
  const sessionExists = fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;

  if (sessionExists) {
    const numeroAntigo = obterNumeroAntigo();
    if (numeroAntigo) {
      const rl = readline.createInterface({ input, output });
      console.log(`\n${colors.cyan}=========================================${colors.reset}`);
      console.log(`${colors.yellow}🔍 SESSÃO ENCONTRADA!${colors.reset}`);
      console.log(`${colors.cyan}=========================================${colors.reset}`);
      console.log(`${colors.yellow}👤 Vimos que você conectou o bot no número recentemente: ${colors.green}+${numeroAntigo}${colors.reset}`);
      console.log(`\n${colors.green}1${colors.reset} - ✅ Reconectar com este número`);
      console.log(`${colors.red}2${colors.reset} - 🔄 Conectar um número novo (Apaga a sessão atual)`);
      
      const resp = await rl.question(`\n${colors.yellow}Gostaria de reconectar? (1 ou 2):${colors.reset} `);
      rl.close();

      if (resp.trim() === '2') {
        console.log(`\n${colors.red}🗑️ Apagando sessão antiga e reiniciando...${colors.reset}`);
        fs.rmSync(sessionPath, { recursive: true, force: true });
        await conectarNovoNumero();
        return;
      } else {
        console.log(`\n${colors.green}✅ Reconectando ao número +${numeroAntigo}...${colors.reset}`);
        await conectarSessaoExistente();
        return;
      }
    } else {
      await conectarSessaoExistente();
      return;
    }
  }

  await conectarNovoNumero();
}

startConnect().catch(console.error);
