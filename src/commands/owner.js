import { OWNER_NUMBER, OWNER_NICK, MENU_FOTOS, PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import {
  getUsuario,
  salvarUsuario,
  lerDB,
  salvarDB
} from '../functions/rpg.js';
import { getNomePadraoGlobal, setNomePadraoGlobal } from '../functions/iaGrupoDB.js';
import fs from 'node:fs';
import path from 'node:path';

// =========================================
// ESTADO GLOBAL DO BOT
// =========================================
let botStatus = 'online';

export function isBotRestrito() {
  return botStatus === 'off';
}

// =========================================
// FUNÇÃO AUXILIAR
// =========================================
function getFotoMenu(nomeMenu) {
  const caminho = `./src/assets/menus/${nomeMenu}.jpg`;
  if (fs.existsSync(caminho)) return fs.readFileSync(caminho);
  return null;
}

// =========================================
// MENU DO DONO
// =========================================
export async function executeMenuOwner(ctx) {
  const { reply, sender, client, msg } = ctx;

  if (!isOwner(sender)) {
    return reply('❌ Você não tem permissão para acessar este menu.');
  }

  const statusAtual = botStatus === 'online'
    ? '🟢 ONLINE (todos usam)'
    : '🔒 RESTRITO (só o dono)';

  const menuText =
    `╭━━━━━━━〔 👑 𝐌𝐄𝐍𝐔 𝐃𝐎 𝐃𝐎𝐍𝐎 👑 〕━━━━━━━╮\n` +
    `│\n` +
    `│  👑 *Dono*: ${OWNER_NICK}\n` +
    `│  📊 *Status*: ${statusAtual}\n` +
    `│\n` +
    `╰━━━━━━━〔 🧸 Freddy Bot 🐻 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 ⚙️ 𝗕𝗔́𝗦𝗜𝗖𝗢𝗦 ⚙️ 〕━━━━━━━╮\n` +
    `│  💬 ${PREFIX}say <texto>\n` +
    `│  🔄 ${PREFIX}reiniciar\n` +
    `│  🖼️ ${PREFIX}fotomenu <menu>\n` +
    `│  🏷️ ${PREFIX}nick-dono <nome>\n` +
    `│  📝 ${PREFIX}setrecado → Forçar recado\n` +
    `│  ➕ ${PREFIX}addcmd <nome> | <resp>\n` +
    `│  ➖ ${PREFIX}delcmd <nome>\n` +
    `│  🤖 ${PREFIX}setnomeia <nome>\n` + // <-- COMANDO AQUI
    `╰━━━━━━━〔 ⚙️ Sistema ⚙️ 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 🔒 𝗔𝗖𝗘𝗦𝗦𝗢 🔒 〕━━━━━━━╮\n` +
    `│  🔒 ${PREFIX}botoff → Só o dono usa\n` +
    `│  🟢 ${PREFIX}boton → Liberar para todos\n` +
    `│  ⏰ ${PREFIX}horariooff <HH:MM> <HH:MM>\n` +
    `│  👀 ${PREFIX}horariooff ver\n` +
    `│  ❌ ${PREFIX}horariooff cancelar\n` +
    `╰━━━━━━━〔 🔐 Acesso 🔐 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 💎 𝗦𝗜𝗦𝗧𝗘𝗠𝗔 𝗩𝗜𝗣 💎 〕━━━━━━━╮\n` +
    `│  ➕ ${PREFIX}addvip @user <dias>\n` +
    `│  ⚙️ ${PREFIX}addcmdvip <cmd>\n` +
    `│  🗑️ ${PREFIX}rmcmdvip <cmd>\n` +
    `╰━━━━━━━〔 💎 Gerenciar VIP 💎 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 📖 𝗔𝗨𝗧𝗢-𝗟𝗘𝗜𝗧𝗨𝗥𝗔 📖 〕━━━━━━━╮\n` +
    `│  ✅ ${PREFIX}auto-leitura on → Ativar\n` +
    `│  🛑 ${PREFIX}auto-leitura off → Desativar\n` +
    `│  👀 ${PREFIX}auto-leitura ver [n] → Ver registros\n` +
    `│  📊 ${PREFIX}auto-leitura status → Status\n` +
    `│  🧹 ${PREFIX}auto-leitura limpar → Apagar\n` +
    `╰━━━━━━━〔 📖 Monitoramento 📖 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 🛡️ 𝗔𝗡𝗧𝗜-𝗣𝗩 🛡️ 〕━━━━━━━╮\n` +
    `│  ✅ ${PREFIX}antipv on → Ativar bloqueio\n` +
    `│  🛑 ${PREFIX}antipv off → Desativar\n` +
    `╰━━━━━━━〔 🛡️ Anti-PV 🛡️ 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 🎨 𝗣𝗘𝗥𝗦𝗢𝗡𝗔𝗟𝗜𝗭𝗔𝗖̧𝗔̃𝗢 🎨 〕━━━━━━━╮\n` +
    `│  🖼️ ${PREFIX}fotomenu <menu>\n` +
    `│  📸 ${PREFIX}definircmdfoto <cmd>\n` +
    `│  🗑️ ${PREFIX}rmcmdfoto <cmd>\n` +
    `│  📋 Menus: menu, admin, game, dono, rpg, membros, baixar, vip, todos\n` +
    `╰━━━━━━━〔 🎨 Visual 🎨 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 📢 𝗖𝗔𝗡𝗔𝗟 📢 〕━━━━━━━╮\n` +
    `│  📢 ${PREFIX}channel <link>\n` +
    `│  🗑️ ${PREFIX}rmchannel\n` +
    `╰━━━━━━━〔 📢 Canal 📢 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 🛡️ 𝗔𝗡𝗧𝗜-𝗙𝗟𝗢𝗢𝗗 🛡️ 〕━━━━━━━╮\n` +
    `│  🛡️ ${PREFIX}antiflood on/off\n` +
    `│  ⏱️ ${PREFIX}setdelay <segundos>\n` +
    `│  📊 ${PREFIX}setlimite <nº>\n` +
    `╰━━━━━━━〔 🛡️ Anti-Flood 🛡️ 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 💰 𝗔𝗟𝗨𝗚𝗨𝗘𝗟 💰 〕━━━━━━━╮\n` +
    `│  💰 ${PREFIX}aluguelglobal on/off\n` +
    `│  📋 ${PREFIX}aluguel\n` +
    `│  ➕ ${PREFIX}rg_aluguel <num> <tempo>\n` +
    `│  🔄 ${PREFIX}rn_aluguel <tempo>\n` +
    `│  ❌ ${PREFIX}rm_aluguel\n` +
    `│  🧹 ${PREFIX}listar_alugueis\n` +
    `│  🗑️ ${PREFIX}limpar_alugueis\n` +
    `│  ⏱️ Tempos: 10d (dias), 1h (horas), 1a (anos)\n` +
    `╰━━━━━━━〔 💰 Aluguel 💰 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 🎮 𝗣𝗢𝗞𝗘́𝗠𝗢𝗡 🎮 〕━━━━━━━╮\n` +
    `│  ✅ ${PREFIX}ativarspawn\n` +
    `│  ❌ ${PREFIX}desativarspawn\n` +
    `╰━━━━━━━〔 🎮 Pokémon 🎮 〕━━━━━━━╯\n` +
    `\n` +
    `╭━━━━━━━〔 💸 𝗘𝗖𝗢𝗡𝗢𝗠𝗜𝗔 💸 〕━━━━━━━╮\n` +
    `│  ➕ ${PREFIX}addcoins @user <valor>\n` +
    `│  ➖ ${PREFIX}rmcoins @user <valor>\n` +
    `╰━━━━━━━〔 💸 Economia 💸 〕━━━━━━━╯`;

  const foto = getFotoMenu('dono');
  if (foto) {
    return client.sendMessage(msg.key.remoteJid, {
      image: foto,
      caption: menuText
    }, { quoted: msg });
  }
  return reply(menuText);
}

// =========================================
// COMANDO: !say <texto>
// =========================================
export async function executeSay(ctx) {
  const { reply, sender, q } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');
  if (!q) return reply('❌ Use: !say seu texto aqui');
  return reply(q);
}

// =========================================
// COMANDO: !reiniciar
// =========================================
export async function executeReiniciar(ctx) {
  const { reply, sender } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  await reply('🔄 Reiniciando o sistema... Aguarde alguns segundos.');
  console.log('[DONO] Comando !reiniciar executado.');

  setTimeout(() => process.exit(0), 2000);
}

// =========================================
// COMANDO: !botoff
// =========================================
export async function executeBotOff(ctx) {
  const { reply, sender } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');
  if (botStatus === 'off') return reply('⚠️ O bot já está restrito.');

  botStatus = 'off';
  console.log('[DONO] Modo RESTRITO ativado.');
  return reply('🔒 *BOT RESTRITO ATIVADO*\n\nApenas o dono pode usar comandos.');
}

// =========================================
// COMANDO: !boton
// =========================================
export async function executeBotOn(ctx) {
  const { reply, sender } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');
  if (botStatus === 'online') return reply('⚠️ O bot já está liberado.');

  botStatus = 'online';
  console.log('[DONO] Bot LIBERADO.');
  return reply('🟢 *BOT LIBERADO*\n\nTodos podem usar comandos.');
}

// =========================================
// COMANDO: !nick-dono <nome>
// =========================================
export async function executeNickDono(ctx) {
  const { reply, sender, q } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  if (!q.trim()) {
    return reply(`🏷️ Use: !nick-dono <nome>\n\n📋 Regras:\n• Máximo 15 caracteres\n• Sem números`);
  }

  const nome = q.trim();

  if (nome.length > 15) return reply(`❌ Máximo 15 caracteres. Você digitou ${nome.length}.`);
  if (/\d/.test(nome)) return reply('❌ O nick não pode conter números.');
  if (nome.length < 2) return reply('❌ Pelo menos 2 caracteres.');

  await salvarConfig('OWNER_NICK', nome);
  const config = await import('../config.js');
  config.OWNER_NICK = nome;

  return reply(`✅ Nick do dono: *${nome}*`);
}

// =========================================
// COMANDO: !fotomenu <menu>
// =========================================
export async function executeFotoMenu(ctx) {
  const { reply, sender, q, msg, client } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imageMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;

  if (!imageMsg) {
    return reply(
      `🖼️ *COMO USAR:*\n\n` +
      `1. Envie uma foto\n` +
      `2. Marque a foto\n` +
      `3. Digite: !fotomenu <menu>\n\n` +
      `📋 *Menus:* menu, admin, game, dono, rpg, membros, baixar, vip, todos`
    );
  }

  const alvo = q.trim().toLowerCase();
  const menusValidos = ['menu', 'admin', 'game', 'dono', 'rpg', 'membros', 'baixar', 'vip', 'todos'];

  if (alvo && !menusValidos.includes(alvo)) {
    return reply(`❌ Menu inválido. Use: ${menusValidos.join(', ')}.`);
  }

  try {
    const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
    const stream = await downloadContentFromMessage(imageMsg, 'image');

    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const fotosDir = './src/assets/menus';
    if (!fs.existsSync(fotosDir)) fs.mkdirSync(fotosDir, { recursive: true });

    const menusParaSalvar = (alvo === 'todos' || !alvo)
      ? ['menu', 'admin', 'game', 'dono', 'rpg', 'membros', 'baixar', 'vip']
      : [alvo];

    for (const menu of menusParaSalvar) {
      fs.writeFileSync(path.join(fotosDir, `${menu}.jpg`), buffer);
      console.log(`[FOTOMENU] Foto salva para: ${menu}`);
    }

    return reply(`✅ Foto definida para: *${menusParaSalvar.join(', ')}*`);

  } catch (error) {
    console.error('[FOTOMENU] Erro:', error.message);
    return reply('❌ Erro ao processar a imagem.');
  }
}

// =========================================
// COMANDO: !addcoins @user <valor>
// =========================================
export async function executeAddCoins(ctx) {
  const { reply, sender, msg, q } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply(`💸 Use: ${PREFIX}addcoins @user <valor>\nExemplo: ${PREFIX}addcoins @joao 500`);
  }

  const alvo = mentions[0];
  const partes = q.trim().split(/\s+/);
  const valor = parseInt(partes[1]);

  if (!valor || valor <= 0) return reply('❌ Valor inválido. Use um número positivo.');

  const userAlvo = getUsuario(alvo);
  userAlvo.coins += valor;
  salvarUsuario(alvo, userAlvo);

  console.log(`[DONO] Adicionado ${valor} coins para ${alvo}`);

  return reply(
    `✅ *COINS ADICIONADAS*\n\n` +
    `👤 Usuário: @${alvo.split('@')[0]}\n` +
    `💰 Adicionado: *+${valor}*\n` +
    `💼 Novo saldo: ${userAlvo.coins}`,
    { mentions: [alvo] }
  );
}

// =========================================
// COMANDO: !rmcoins @user <valor>
// =========================================
export async function executeRmCoins(ctx) {
  const { reply, sender, msg, q } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply(`💸 Use: ${PREFIX}rmcoins @user <valor>\nExemplo: ${PREFIX}rmcoins @joao 500`);
  }

  const alvo = mentions[0];
  const partes = q.trim().split(/\s+/);
  const valor = parseInt(partes[1]);

  if (!valor || valor <= 0) return reply('❌ Valor inválido. Use um número positivo.');

  const userAlvo = getUsuario(alvo);
  const remover = Math.min(valor, userAlvo.coins);
  userAlvo.coins -= remover;
  salvarUsuario(alvo, userAlvo);

  console.log(`[DONO] Removido ${remover} coins de ${alvo}`);

  return reply(
    `✅ *COINS REMOVIDAS*\n\n` +
    `👤 Usuário: @${alvo.split('@')[0]}\n` +
    `💸 Removido: *-${remover}*\n` +
    `💼 Novo saldo: ${userAlvo.coins}`,
    { mentions: [alvo] }
  );
}

// =========================================
// COMANDO: !setrecado
// =========================================
export async function executeSetRecado(ctx) {
  const { client, sender, reply } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar.');

  const texto = "🤖 Freddy Bot | Contato: 55 16 99746-8496";

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
          content: Buffer.from(texto, 'utf-8'),
        },
      ],
    });

    return reply('✅ Recado alterado com sucesso! (Verifique no seu perfil)');
  } catch (error) {
    console.error('[SETRECADO] Erro:', error);
    return reply(`❌ Erro ao mudar recado.\n\nO WhatsApp pode estar bloqueando a ação temporariamente. Tente novamente mais tarde ou mude manualmente no celular.`);
  }
}

// =========================================
// COMANDO: !setnomeia <nome> (Dono)
// =========================================
export async function executeSetNomeIAGlobal(ctx) {
  const { reply, sender, q } = ctx;
  if (!isOwner(sender)) return reply('❌ Apenas o dono do bot pode usar este comando.');

  const nome = q.trim();
  if (!nome) return reply(`⚙️ Use: !setnomeia <nome>\nExemplo: !setnomeia Pikachu`);

  if (nome.length > 20) return reply('❌ O nome é muito longo (máximo 20 caracteres).');
  if (/\d/.test(nome)) return reply('❌ O nome não pode conter números.');

  setNomePadraoGlobal(nome);
  return reply(`✅ *NOME GLOBAL DA IA ALTERADO*\n\nO nome padrão da IA agora é *${nome}*.\n\nEle será aplicado a todos os grupos que não tenham um nome personalizado.`);
}

// =========================================
// FUNÇÃO AUXILIAR: Salva variável no config.js
// =========================================
async function salvarConfig(chave, valor, tipo = 'string') {
  const configPath = './src/config.js';
  try {
    let conteudo = fs.readFileSync(configPath, 'utf-8');
    const valorFormatado = tipo === 'boolean' ? valor : `"${valor}"`;

    if (conteudo.includes(`export let ${chave}`)) {
      const regex = new RegExp(`(export let ${chave} = ).*?(?=\\n)`, 's');
      conteudo = conteudo.replace(regex, `$1${valorFormatado}`);
    } else {
      const regexConst = new RegExp(`(export const ${chave} = ).*?(?=\\n)`, 's');
      conteudo = conteudo.replace(regexConst, `export let ${chave} = ${valorFormatado}`);
    }

    fs.writeFileSync(configPath, conteudo, 'utf-8');
  } catch (error) {
    console.error('[CONFIG] Erro:', error.message);
  }
}
