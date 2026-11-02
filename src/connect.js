import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { handleMessage } from './index.js';
import { BOT_NAME, OWNER_NUMBER, PREFIX, API_KEY } from './config.js';
import { iniciarSpawn } from './functions/pokemonSpawn.js';
import { getGrupo } from './functions/adminDB.js';

// 🛡️ IMPORTS DOS NOVOS SISTEMAS (PROTEÇÃO, GESTÃO E AUTOMAÇÃO)
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
    console.log('⏳ Isso pode demorar alguns minutos na primeira vez...');

    try {
      await execAsync('sudo apt-get update && sudo apt-get install -y ffmpeg', { timeout: 300000 });
      console.log('✅ FFmpeg instalado com sucesso (via apt-get)!');
    } catch (err1) {
      console.log('⚠️ Falha no apt-get. Tentando via pkg (Termux/Celular)...');
      
      try {
        await execAsync('pkg install ffmpeg -y', { timeout: 300000 });
        console.log('✅ FFmpeg instalado com sucesso (via pkg)!');
      } catch (err2) {
        console.log('\n❌ Não foi possível instalar o FFmpeg automaticamente.');
        console.log('💡 Se estiver no Windows, baixe o FFmpeg no site oficial e adicione à pasta do bot.');
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
        attrs: {
          to: '@s.whatsapp.net',
          type: 'set',
          xmlns: 'status',
        },
        content: [
          {
            tag: 'status',
            attrs: {},
            content: Buffer.from(recado, 'utf-8'),
          },
        ],
      });
      console.log('✅ Recado (Status) do WhatsApp atualizado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao atualizar recado:', error.message);
    }
  }, 5000); 
}

// =========================================
// CORRIGE O SHARP INTERNO DO WA-STICKER-FORMATTER
// =========================================
async function corrigirSharpInterno() {
  const caminhoSharpInterno = './node_modules/wa-sticker-formatter/node_modules/sharp';

  try {
    if (fs.existsSync(caminhoSharpInterno)) {
      console.log('🔧 Removendo sharp interno quebrado do wa-sticker-formatter...');
      await execAsync(`rm -rf ${caminhoSharpInterno}`);
      console.log('✅ Sharp interno removido. Vai usar o sharp da raiz.');
    }
  } catch (error) {
    console.error('[SHARP-FIX] Erro:', error.message.split('\n')[0]);
  }
}

// =========================================
// AUTO-DOWNLOAD DE DEPENDÊNCIAS
// =========================================
async function verificarDependencias() {
  const pacotesBasicos = ['node-cron', 'pino'];

  for (const pacote of pacotesBasicos) {
    try {
      await import(pacote);
    } catch (error) {
      console.log(`\n⏳ Instalando dependência: ${pacote}...`);
      try {
        await execAsync(`npm install ${pacote}`);
        console.log(`✅ ${pacote} instalado!`);
      } catch (err) {
        console.error(`❌ Falha ao instalar ${pacote}:`, err.message.split('\n')[0]);
      }
    }
  }

  try {
    await import('sharp');
    console.log('✅ Sharp já está instalado e funcionando.');
  } catch (error) {
    console.log('\n⚠️ Sharp não encontrado. Tentando instalar automaticamente...');

    const estrategias = [
      { nome: 'Padrão', cmd: 'npm install sharp' },
      { nome: 'Limpar cache + reinstalar', cmd: 'npm cache clean --force && npm install sharp' },
      { nome: 'Com --ignore-scripts=false', cmd: 'npm install --ignore-scripts=false sharp' },
      { nome: 'Aprovar scripts', cmd: 'npm install-scripts approve sharp' },
      { nome: 'Rebuild', cmd: 'npm rebuild sharp' }
    ];

    let instalado = false;

    for (const est of estrategias) {
      if (instalado) break;
      console.log(`\n🔧 Tentativa: ${est.nome}`);
      try {
        await execAsync(est.cmd, { timeout: 180000 });
        try {
          await import('sharp');
          console.log(`✅ Sharp instalado via: ${est.nome}`);
          instalado = true;
        } catch (e) {}
      } catch (err) {}
    }
  }

  try {
    await import('wa-sticker-formatter');
    console.log('✅ wa-sticker-formatter já está instalado.');
  } catch (error) {
    console.log('\n⏳ Instalando wa-sticker-formatter...');
    try {
      await execAsync('npm install wa-sticker-formatter');
      console.log('✅ wa-sticker-formatter instalado!');
    } catch (err) {}
  }

  await corrigirSharpInterno();
}

// =========================================
// EXTRAI JID (string ou objeto)
// =========================================
function extrairJid(p) {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') {
    return p.id || p.jid || p.participant || p.userJid || '';
  }
  return String(p);
}

// =========================================
// STATUS DAS CONFIGURAÇÕES
// =========================================
function mostrarStatusConfig() {
  const nomeOk = BOT_NAME && BOT_NAME.trim().length > 0;
  const ownerOk = OWNER_NUMBER && OWNER_NUMBER.trim().length > 0;
  const prefixoOk = PREFIX && PREFIX.trim().length > 0;
  const apiOk = API_KEY && API_KEY.trim().length > 0;

  console.log('=========================================');
  console.log('⚙️  *STATUS DAS CONFIGURAÇÕES*');
  console.log('=========================================');
  console.log(`🤖 Nome do bot: ${nomeOk ? `configurado ✅ (${BOT_NAME})` : 'não configurado ❌'}`);
  console.log(`👤 Número do dono: ${ownerOk ? `configurado ✅ (${OWNER_NUMBER})` : 'não configurado ❌'}`);
  console.log(`🔣 Prefixo do bot: ${prefixoOk ? `configurado ✅ (${PREFIX})` : 'não configurado ❌'}`);
  console.log(`🔑 API do bot: ${apiOk ? 'configurado ✅' : 'não configurado ❌'}`);
  console.log('=========================================\n');
}

// =========================================
// MENU INICIAL DE CONEXÃO
// =========================================
async function mostrarMenuInicial(rl) {
  console.log('=========================================');
  console.log('𝐇𝐞𝐲𝐲𝐲, 𝐯𝐨𝐜𝐞̂ 𝐚𝐜𝐚𝐛𝐨𝐮 𝐝𝐞 𝐥𝐢𝐠𝐚𝐫 𝐨 𝐬𝐞𝐮 𝐛𝐨𝐭 𝐧𝐚 𝐡𝐨𝐬𝐩𝐞𝐝𝐚𝐠𝐞𝐦!!! 𝐂𝐨𝐦𝐨 𝐠𝐨𝐬𝐭𝐚𝐫𝐢𝐚 𝐝𝐞 𝐜𝐨𝐧𝐞𝐜𝐭𝐚𝐫 𝐞𝐥𝐞? 🤔');
  console.log('𝐂𝐨́𝐝𝐢𝐠𝐨: digite 1');
  console.log('𝐂𝐡𝐚𝐦𝐚𝐫 𝐬𝐮𝐩𝐨𝐫𝐭𝐞: digite 2');
  console.log('=========================================\n');

  const escolha = await rl.question('Opção: ');
  if (escolha.trim() === '1') return 'codigo';
  if (escolha.trim() === '2') return 'suporte';
  return 'invalido';
}

// =========================================
// PASSO A PASSO DO NÚMERO
// =========================================
async function pedirNumero(rl) {
  console.log('\n=========================================');
  console.log('📋 *PASSO A PASSO PARA CONECTAR O BOT*');
  console.log('=========================================');
  console.log('1️⃣  Digite o número do WhatsApp que você quer conectar.');
  console.log('2️⃣  O número deve estar no formato internacional.');
  console.log('3️⃣  Inclua o código do país (55 para Brasil) + DDD + número.');
  console.log('4️⃣  NÃO use "+", espaços, traços ou parênteses.');
  console.log('');
  console.log('✅ Exemplo correto: 5511999999999');
  console.log('❌ Exemplo errado: +55 (11) 99999-9999');
  console.log('');
  console.log('🔙 Digite 0 para voltar ao menu anterior.');
  console.log('=========================================\n');

  const raw = await rl.question('📱 Digite o número (ou 0 para voltar): ');
  if (raw.trim() === '0') return null;

  const phone = raw.replace(/\D/g, '');

  if (phone.length < 10) {
    console.log('\n❌ Número inválido. Digite novamente no formato correto.');
    return 'invalido';
  }
  return phone;
}

// =========================================
// LISTENER: ENTRADA E SAÍDA DE MEMBROS
// =========================================
async function configurarParticipantes(client) {
  client.ev.on('group-participants.update', async (update) => {
    try {
      const { id: grupoJid, participants, action, author } = update;

      // ================== ENTRADA (ADD) ==================
      if (action === 'add') {
        // 1. Verifica Lista Negra
        const removidos = await verificarEntradaListaNegra(client, grupoJid, participants);

        // 2. Verifica Gestão (Regras e Atividade)
        await verificarEntradaGestao(client, grupoJid, participants, removidos);

        const restantes = participants.filter(p => !removidos.has(extrairJid(p)));
        if (restantes.length === 0) return;

        const configGP = getGrupo(grupoJid);

        // 3. Anti-Fake
        if (configGP.antiFake) {
          for (const p of restantes) {
            const jid = extrairJid(p);
            if (!jid) continue;
            const numero = jid.split('@')[0].split(':')[0];
            if (!numero.startsWith('55')) {
              try {
                await client.groupParticipantsUpdate(grupoJid, [jid], 'remove');
                await client.sendMessage(grupoJid, {
                  text: `🚫 *ANTI-FAKE*\n\n@${numero} foi removido (número estrangeiro).`,
                  mentions: [jid]
                });
              } catch (e) {}
            }
          }
        }

        // 4. Boas-Vindas
        if (configGP.bemVindo) {
          for (const p of restantes) {
            const jid = extrairJid(p);
            if (!jid) continue;
            const nome = jid.split('@')[0].split(':')[0];
            const meta = await client.groupMetadata(grupoJid).catch(() => null);
            const nomeGrupo = meta?.subject || 'Grupo';

            let legenda = configGP.legendaBV
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

      // ================== SAÍDA (REMOVE) ==================
      if (action === 'remove') {
        // Dispara a despedida se estiver ativa nas automações
        await verificarSaidaGrupo(client, grupoJid, participants, author);
      }

    } catch (error) {
      console.error('[PARTICIPANTES] Erro:', error.message);
    }
  });
}

// =========================================
// LISTENER: ANTI-CALL
// =========================================
async function configurarAntiCall(client) {
  client.ev.on('call', async (calls) => {
    const listaCalls = Array.isArray(calls) ? calls : [calls];

    for (const call of listaCalls) {
      console.log('\n📞 [DEBUG] Chamada recebida:', call.status, '| chatId:', call.chatId, '| from:', call.from);

      let groupJid = null;
      
      if (call.chatId && call.chatId.endsWith('@g.us')) {
        groupJid = call.chatId;
      } else if (call.groupJid) {
        groupJid = call.groupJid;
      } else if (call.chatId && call.chatId.endsWith('@call')) {
        console.log('🔎 [ANTI-CALL] ID de grupo oculto. Procurando o usuário nos grupos...');
        try {
          const todosGrupos = await client.groupFetchAllParticipating();
          
          for (const idGrupo in todosGrupos) {
            const grupo = todosGrupos[idGrupo];
            const participanteEncontrado = grupo.participants.find(p => {
                const pId = p.id.split('@')[0].split(':')[0];
                const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : null;
                const fromLimpo = call.from.split('@')[0].split(':')[0];
                return pId === fromLimpo || (pLid && pLid === fromLimpo);
            });

            if (participanteEncontrado) {
              groupJid = idGrupo;
              console.log(`✅ [ANTI-CALL] Usuário encontrado no grupo: ${idGrupo.split('@')[0]}`);
              break;
            }
          }
        } catch (e) {
          console.log('❌ [ANTI-CALL] Erro ao procurar grupos:', e.message);
        }
        
        if (!groupJid) {
          console.log('⚠️ [ANTI-CALL] Não foi possível encontrar o grupo dessa chamada.');
          continue;
        }
      }

      if (!groupJid) continue;

      const configGP = getGrupo(groupJid);

      if (configGP && configGP.antiCall === true) {
        try {
          const groupMetadata = await client.groupMetadata(groupJid);
          
          const callerNum = call.from.split('@')[0].split(':')[0];
          
          const targetParticipant = groupMetadata.participants.find(p => {
            const pNum = p.id.split('@')[0].split(':')[0];
            const pLid = p.lid ? p.lid.split('@')[0].split(':')[0] : null;
            return pNum === callerNum || (pLid && pLid === callerNum);
          });

          if (!targetParticipant) {
            console.log(`⚠️ [ANTI-CALL] Participante ${callerNum} não encontrado no grupo.`);
            continue;
          }

          if (targetParticipant.admin) {
            console.log(`⚠️ [ANTI-CALL] ${callerNum} é admin, não será removido.`);
            continue;
          }

          console.log(`🚫 [ANTI-CALL] Tentando remover ${callerNum}...`);
          
          await client.groupParticipantsUpdate(groupJid, [targetParticipant.id], 'remove');
          
          await client.sendMessage(groupJid, {
            text: `🚫 *ANTI-CALL DETECTADO*\n\nO usuário @${callerNum} foi removido por iniciar uma chamada.`,
            mentions: [targetParticipant.id]
          });

          console.log(`✅ [ANTI-CALL] ${callerNum} removido com sucesso!`);

        } catch (error) {
          console.error('❌ [ANTI-CALL] Falha ao remover. O bot realmente é admin?');
          console.error('Detalhes:', error.message);
        }
      }
    }
  });
}

// =========================================
// FUNÇÃO PRINCIPAL DE CONEXÃO
// =========================================
async function startConnect() {
  await corrigirSharpInterno();
  await verificarFFmpeg(); 
  await verificarDependencias();

  console.log('\n');
  console.log('█▀ ▄▀█ █▀█ █░ █▀█');
  console.log('█▄ █▀█ █▀▄ █▄ █▄█');
  console.log('');
  console.log('█▄▄ █▀█ ▀█▀');
  console.log('█▄█ █▄█ ░█░');
  console.log('\n');

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
          if (resultado === null) {
            console.log('\n🔙 Voltando ao menu anterior...\n');
            pedindoNumero = false;
          } else if (resultado === 'invalido') {
            continue;
          } else {
            phone = resultado;
            pedindoNumero = false;
            voltarAoMenu = false;
          }
        }
      } else if (opcao === 'suporte') {
        console.log('\n=========================================');
        console.log('📞 *SUPORTE*');
        console.log('=========================================');
        console.log('Entre em contato pelo WhatsApp:');
        console.log('https://wa.me/5511999999999');
        console.log('');
        console.log('Ou acesse nosso grupo de suporte.');
        console.log('=========================================\n');
        rl.close();
        process.exit(0);
      } else {
        console.log('\n❌ Opção inválida. Tente novamente.\n');
      }
    }

    console.log(`\n⏳ Gerando código para o número: ${phone}...`);

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const client = makeWASocket({ auth: state, logger });

    client.ev.on('connection.update', async (update) => {
      const { qr } = update;
      if (qr) {
        try {
          const code = await client.requestPairingCode(phone);
          console.log('\n=========================================');
          console.log('✅ *CÓDIGO DE PAREAMENTO GERADO*');
          console.log('=========================================');
          console.log(`👉 ${code} 👈`);
          console.log('=========================================');
          console.log('');
          console.log('📲 *COMO USAR O CÓDIGO:*');
          console.log('1. Abra o WhatsApp no celular.');
          console.log('2. Toque em "Aparelhos Conectados".');
          console.log('3. Toque em "Conectar com número de telefone".');
          console.log('4. Digite o código acima.');
          console.log('');
          console.log('⏳ O bot conectará automaticamente após você inserir o código.');
          console.log('=========================================\n');
        } catch (error) {
          console.log('\n❌ Erro ao gerar código. Verifique o número e tente novamente.');
          console.log('Detalhes:', error.message);
        }
        rl.close();
      }
    });

    client.ev.on('creds.update', saveCreds);

    client.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log('\n=========================================');
        console.log(`🎉 ${BOT_NAME} CONECTADO COM SUCESSO!`);
        console.log('=========================================');
        console.log('O bot está online e pronto para uso.');
        console.log('=========================================\n');
        
        await atualizarRecado(client);
        iniciarSpawn(client);
        iniciarAutoFechar(client);
      }
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('🔄 Reconectando...');
          setTimeout(() => startConnect(), 1500);
        } else {
          console.log('❌ Sessão desconectada. Apague a pasta session e reinicie.');
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
        console.log(`✅ ${BOT_NAME} reconectado com sucesso!`);
        
        await atualizarRecado(client);
        iniciarSpawn(client);
        iniciarAutoFechar(client);
      }
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('🔄 Reconectando...');
          setTimeout(() => startConnect(), 1500);
        } else {
          console.log('❌ Sessão desconectada. Apague a pasta session e reinicie.');
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
