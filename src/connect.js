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
// INSTALAÇÃO AUTOMÁTICA DO FFMPEG
// =========================================
async function verificarFFmpeg() {
  try {
    await execAsync('ffmpeg -version');
    console.log('✅ FFmpeg já está instalado e funcionando.');
  } catch (error) {
    console.log('\n⚠️ FFmpeg não encontrado. Tentando instalar automaticamente...');
    try {
      await execAsync('sudo apt-get update && sudo apt-get install -y ffmpeg', { timeout: 300000 });
      console.log('✅ FFmpeg instalado com sucesso!');
    } catch (err1) {
      try {
        await execAsync('pkg install ffmpeg -y', { timeout: 300000 });
        console.log('✅ FFmpeg instalado com sucesso (via pkg)!');
      } catch (err2) {
        console.log('\n❌ Não foi possível instalar o FFmpeg automaticamente.');
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
      console.log('✅ Recado (Status) do WhatsApp atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar recado:', error.message);
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
      console.log('🔧 Removendo sharp interno quebrado...');
      await execAsync(`rm -rf ${caminhoSharpInterno}`);
    }
  } catch (error) {}
}

// =========================================
// AUTO-DOWNLOAD DE DEPENDÊNCIAS
// =========================================
async function verificarDependencias() {
  console.log('\n🔍 Verificando dependências do sistema...');
  const pacotesBasicos = ['node-cron', 'pino', 'simple-git'];

  for (const pacote of pacotesBasicos) {
    try {
      await import(pacote);
    } catch (error) {
      console.log(`\n⏳ Instalando dependência: ${pacote} (Aguarde)...`);
      try {
        // Usando execSync para forçar o bot a esperar a instalação terminar
        execSync(`npm install ${pacote}`, { stdio: 'inherit' });
        console.log(`✅ ${pacote} instalado com sucesso!`);
      } catch (err) {
        console.error(`❌ Falha ao instalar ${pacote}.`);
      }
    }
  }

  try {
    await import('sharp');
  } catch (error) {
    console.log('\n⚠️ Sharp não encontrado. Instalando...');
    try { execSync('npm install sharp', { stdio: 'inherit' }); } catch (err) {}
  }

  try {
    await import('wa-sticker-formatter');
  } catch (error) {
    console.log('\n⏳ Instalando wa-sticker-formatter...');
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
// STATUS DAS CONFIGURAÇÕES
// =========================================
function mostrarStatusConfig() {
  console.log('=========================================');
  console.log('⚙️  *STATUS DAS CONFIGURAÇÕES*');
  console.log('=========================================');
  console.log(`🤖 Nome do bot: ${BOT_NAME ? `configurado ✅ (${BOT_NAME})` : 'não configurado ❌'}`);
  console.log(`👤 Número do dono: ${OWNER_NUMBER ? `configurado ✅` : 'não configurado ❌'}`);
  console.log(`🔣 Prefixo do bot: ${PREFIX ? `configurado ✅ (${PREFIX})` : 'não configurado ❌'}`);
  console.log('=========================================\n');
}

// =========================================
// MENU INICIAL DE CONEXÃO
// =========================================
async function mostrarMenuInicial(rl) {
  console.log('=========================================');
  console.log('Como gostaria de conectar ele? 🤔');
  console.log('Código: digite 1');
  console.log('Chamar suporte: digite 2');
  console.log('=========================================\n');
  const escolha = await rl.question('Opção: ');
  if (escolha.trim() === '1') return 'codigo';
  if (escolha.trim() === '2') return 'suporte';
  return 'invalido';
}

async function pedirNumero(rl) {
  console.log('\n📱 Digite o número (Ex: 5511999999999) ou 0 para voltar:');
  const raw = await rl.question('Número: ');
  if (raw.trim() === '0') return null;
  const phone = raw.replace(/\D/g, '');
  if (phone.length < 10) return 'invalido';
  return phone;
}

// =========================================
// LISTENERS
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
    } catch (error) {
      console.error('[PARTICIPANTES] Erro:', error.message);
    }
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
    console.log('🔄 Iniciando atualização via terminal...');
    const { atualizarBot } = await import('./update.js');
    const res = await atualizarBot();
    console.log(res.mensagem);
    process.exit(res.sucesso ? 0 : 1);
  }

  await corrigirSharpInterno();
  await verificarFFmpeg(); 
  await verificarDependencias(); // O simple-git será instalado aqui se não existir

  console.log('\n🤖 INICIANDO BOT...\n');
  mostrarStatusConfig();

  const sessionPath = './session';
  const sessionExists = fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;

  if (!sessionExists) {
    const rl = readline.createInterface({ input, output });
    let voltarAoMenu = true;
    let phone = null;

    while (voltarAoMenu) {
      const opcao = await mostrarMenuInicial(rl);
      if (opcao === 'codigo') {
        let pedindoNumero = true;
        while (pedindoNumero) {
          const resultado = await pedirNumero(rl);
          if (resultado === null) { pedindoNumero = false; }
          else if (resultado === 'invalido') { continue; }
          else { phone = resultado; pedindoNumero = false; voltarAoMenu = false; }
        }
      } else if (opcao === 'suporte') {
        console.log('\n📞 SUPORTE: https://wa.me/5511999999999\n');
        rl.close(); process.exit(0);
      }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const client = makeWASocket({ auth: state, logger });

    client.ev.on('connection.update', async (update) => {
      const { qr } = update;
      if (qr) {
        try {
          const code = await client.requestPairingCode(phone);
          console.log(`\n👉 SEU CÓDIGO: ${code} 👈\n`);
        } catch (error) {}
        rl.close();
      }
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(`🎉 ${BOT_NAME} CONECTADO!`);
        await atualizarRecado(client);
        iniciarSpawn(client);
        iniciarAutoFechar(client);
      }
      if (connection === 'close') {
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          setTimeout(() => startConnect(), 1500);
        }
      }
    });

    client.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        await handleMessage(client, msg);
      }
    });

    await configurarParticipantes(client);
    await configurarAntiCall(client);

  } else {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const client = makeWASocket({ auth: state, logger });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(`✅ ${BOT_NAME} reconectado!`);
        await atualizarRecado(client);
        iniciarSpawn(client);
        iniciarAutoFechar(client);
      }
      if (connection === 'close') {
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          setTimeout(() => startConnect(), 1500);
        }
      }
    });

    client.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        await handleMessage(client, msg);
      }
    });

    await configurarParticipantes(client);
    await configurarAntiCall(client);
  }
}

startConnect().catch(console.error);
