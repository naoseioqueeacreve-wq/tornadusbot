import { BOT_NAME, PREFIX, OWNER_NICK } from '../config.js';
import { isOwner, isAdmin } from '../functions/permissions.js';
import { getVIPCommands, isVIP, getVipExpiracao } from '../functions/vipDB.js';
import { getReligiao } from '../functions/religiaoDB.js';
import fs from 'node:fs';

// =========================================
// FUNÇÃO AUXILIAR
// =========================================
function getFotoMenu(nomeMenu) {
  const caminho = `./src/assets/menus/${nomeMenu}.jpg`;
  if (fs.existsSync(caminho)) return fs.readFileSync(caminho);
  return null;
}

// =========================================
// FUNÇÃO: Remove comandos VIP dos menus normais
// =========================================
function filtrarMenuVIP(texto) {
  const vips = getVIPCommands();
  if (vips.length === 0) return texto;

  const linhas = texto.split('\n');
  const filtradas = linhas.filter(linha => {
    return !vips.some(vip => linha.includes(`/${vip}`));
  });
  return filtradas.join('\n');
}

// =========================================
// MENU PRINCIPAL
// =========================================
export async function executeMenu(ctx) {
  const { reply, sender, pushName } = ctx;
  const hora = new Date().toLocaleTimeString('pt-BR');
  const numero = sender.split('@')[0].split(':')[0];
  const ehDono = isOwner(sender);

  let menuText =
    `╭━〔 🧸 𝐅𝐑𝐄𝐃𝐃𝐘 𝐁𝐎𝐓 🍯 〕━╮\n` +
    `│\n` +
    `│  🤎 Olá, @${numero}!\n` +
    `│\n` +
    `│  *Eu sou o Freddy Bot, seu assistente*\n` +
    `│  *virtual completo para WhatsApp!*\n` +
    `│\n` +
    `│  🤎 𝗦𝗨𝗔𝗦 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗖̧𝗢̃𝗘𝗦:\n` +
    `│  📱 *Número*: ${numero}\n` +
    `│  👑 *Dono*: ${OWNER_NICK}\n` +
    `│  👤 *Usuário*: ${pushName}\n` +
    `│  💎 *VIP*: ${isVIP(sender) ? 'Sim ✅' : 'Não ❌'}\n` +
    `│  💎 *Premium*: ${ehDono ? 'Sim ✅' : 'Não ❌'}\n` +
    `│  ⏰ *Hora*: ${hora}\n` +
    `│\n` +
    `╰━〔 👑 Dᴏɴᴏ: ${OWNER_NICK} 🐻 〕━╯\n` +
    `\n` +
    `╭━〔 📂 𝗠𝗘𝗡𝗨𝗦 📂 〕━╮\n` +
    `│  🛡️ ${PREFIX}menuadmin\n` +
    `│  🎮 ${PREFIX}menugame\n` +
    `│  🗡️ ${PREFIX}menurg\n` +
    `│  ⚡ ${PREFIX}menupokemon\n` +
    `│  📥 ${PREFIX}menubaixar\n` +
    `│  👥 ${PREFIX}menumembros\n` +
    `│  🕊️ ${PREFIX}menureligioso\n` +
    `│  💎 ${PREFIX}menuvip\n` +
    `│  👑 ${PREFIX}menudono\n` +
    `╰━〔 🧸 Freddy Bot 🍪 〕━╯`;

  const foto = getFotoMenu('menu');
  if (foto) return reply(menuText, { image: foto, mentions: [sender] });
  return reply(menuText, { mentions: [sender] });
}

// =========================================
// MENU RELIGIOSO (HUB)
// =========================================
export async function executeMenuReligioso(ctx) {
  const { reply, sender, pushName, isGroup, groupMetadata } = ctx;

  const numero = sender.split('@')[0].split(':')[0];
  const ehDono = isOwner(sender);
  const ehAdm = isGroup ? isAdmin(sender, groupMetadata) : false;
  const ehVip = isVIP(sender);
  const religiaoSalva = getReligiao(sender) || 'Não informada';

  const agora = new Date();
  const horaBrasilia = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const dataBrasilia = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const menuText = `🤎 ━━━━━━━━ FREDDY EVANGELIZA ━━━━━━━━ 🤎\n` +
    `\n` +
    `┌─── • 🕊️ PAZ DO SENHOR • ───┐\n` +
    `│\n` +
    `│  🙏 Olá, ${pushName}!\n` +
    `│\n` +
    `│  👤 Nome » ${pushName}\n` +
    `│  📱 Número » ${numero}\n` +
    `│  📖 Religião » ${religiaoSalva}\n` +
    `│\n` +
    `│  ────────── ✦ ──────────\n` +
    `│\n` +
    `│  💎 VIP » ${ehVip ? 'Sim ✅' : 'Não ❌'}\n` +
    `│  🛡️ ADM » ${ehAdm ? 'Sim ✅' : 'Não ❌'}\n` +
    `│  👑 Dono » ${ehDono ? 'Sim ✅' : 'Não ❌'}\n` +
    `│\n` +
    `│  ⏰ Hora » ${horaBrasilia}\n` +
    `│  📅 Data » ${dataBrasilia}\n` +
    `│\n` +
    `└──────────────────────┘\n` +
    `\n` +
    `✨ O que temos aqui?\n` +
    `> Um espaço dedicado à palavra de\n` +
    `> Deus, reflexões e momentos de paz.\n` +
    `\n` +
    `┌─ 📂 MENUS RELIGIOSOS ─┐\n` +
    `│  ⛪ ${PREFIX}menucatolico\n` +
    `│  (Mais menus em breve...)\n` +
    `└──────────────┘\n` +
    `\n` +
    `┌─ ⚙️ SEUS COMANDOS ─┐\n` +
    `│  📝 ${PREFIX}religiao <sua fé>\n` +
    `│  👤 ${PREFIX}religiao (ver perfil)\n` +
    `└──────────────┘\n` +
    `\n` +
    `✝️ "O Senhor é o meu pastor, nada me faltará."\n` +
    `   — Salmos 23:1\n` +
    `\n` +
    `🤎 ━━━━━━━━━━━━━━━━━━━━━━━━━ 🤎`;

  const foto = getFotoMenu('religioso');
  if (foto) return reply(menuText, { image: foto, mentions: [sender] });
  return reply(menuText, { mentions: [sender] });
}

// =========================================
// MENU CATÓLICO
// =========================================
export async function executeMenuCatolico(ctx) {
  const { reply, sender, pushName } = ctx;

  const menuText = `✝️ ━━━━━━━━ MENU CATÓLICO ━━━━━━━━ ✝️\n` +
    `\n` +
    `┌─── • 📿 FÉ CATÓLICA • ───┐\n` +
    `│\n` +
    `│  🙏 A paz de Cristo, ${pushName}!\n` +
    `│\n` +
    `│  Bem-vindo(a) ao espaço dedicado\n` +
    `│  à doutrina e tradição católica.\n` +
    `│  Aqui você encontra orações, santos\n` +
    `│  e ensinamentos da Igreja.\n` +
    `│\n` +
    `└──────────────────────┘\n` +
    `\n` +
    `✨ Orações Rápidas:\n` +
    `> *Pai Nosso:* "Pai nosso que estais nos céus,\n` +
    `> santificado seja o vosso nome..."\n` +
    `>\n` +
    `> *Ave Maria:* "Ave Maria, cheia de graça,\n` +
    `> o Senhor é convosco..."\n` +
    `\n` +
    `┌─ ⚙️ COMANDOS ─┐\n` +
    `│  ⛪ ${PREFIX}papa <nome>\n` +
    `│  📜 ${PREFIX}papa (ver lista)\n` +
    `│  🏛️ ${PREFIX}santuario <nome>\n` +
    `│  👤 ${PREFIX}bispo <nome>\n` +
    `│  🙏 ${PREFIX}padre <nome>\n` +
    `│  📅 ${PREFIX}santododia\n` +
    `└──────────────┘\n` +
    `\n` +
    `📿 _"A fé é o firme fundamento das coisas\n` +
    `que se esperam."_ \n` +
    `   — Hebreus 11:1\n` +
    `\n` +
    `✝️ ━━━━━━━━━━━━━━━━━━━━━━━━━ ✝️`;

  const foto = getFotoMenu('catolico');
  if (foto) return reply(menuText, { image: foto, mentions: [sender] });
  return reply(menuText, { mentions: [sender] });
}

// =========================================
// MENU VIP
// =========================================
export async function executeMenuVIP(ctx) {
  const { reply, sender, pushName } = ctx;
  const cmdVips = getVIPCommands();

  const ehVIP = isVIP(sender);
  const ehDono = isOwner(sender);

  if (!ehVIP && !ehDono) {
    return reply(
      `⛔ *ACESSO NEGADO*\n\n` +
      `Você não é um usuário VIP.\n` +
      `Para desbloquear comandos exclusivos, adquira o VIP com o dono do bot.`
    );
  }

  let menuText = `╭━〔💎 𝐌𝐄𝐍𝐔 𝐕𝐈𝐏 💎〕━╮\n` +
    `│\n` +
    `│  👤 Olá, ${pushName}!\n` +
    `│  💎 Status: Ativado ✅\n`;

  if (ehVIP) {
    const exp = new Date(getVipExpiracao(sender)).toLocaleDateString('pt-BR');
    menuText += `│  📅 Expira em: ${exp}\n`;
  } else {
    menuText += `│  👑 Você é o Dono\n`;
  }

  menuText += `│\n` +
    `│  𖹭 ⚡ 𝗙𝗘𝗥𝗥𝗔𝗠𝗘𝗡𝗧𝗔𝗦 𝗩𝗜𝗣  𖹭\n` +
    `│  ╰┈➤ 📊 ${PREFIX}vipinfo\n` +
    `│  ╰┈➤ 🔐 ${PREFIX}vipsenha <tam>\n` +
    `│  ╰┈➤ 📱 ${PREFIX}vipqr <texto>\n` +
    `│  ╰┈➤ 🔒 ${PREFIX}vipcifrar <texto>\n` +
    `│  ╰┈➤ 🔓 ${PREFIX}vipdecifrar <codigo>\n` +
    `│  ╰┈➤ 😃 ${PREFIX}vipemoji <emoji>\n` +
    `│\n`;

  if (cmdVips.length > 0) {
    menuText += `│  𖹭 🎁 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦 𝗘𝗫𝗧𝗥𝗔𝗦  𖹭\n`;
    for (const cmd of cmdVips) {
      menuText += `│  ╰┈➤ 💎 ${PREFIX}${cmd}\n`;
    }
    menuText += `│\n`;
  }

  menuText += `╰━━━━━━━〔 💎 Área Premium 💎 〕━━━━━━━╯`;

  const foto = getFotoMenu('vip');
  if (foto) return reply(menuText, { image: foto });
  return reply(menuText);
}

// =========================================
// MENU MEMBROS
// =========================================
export async function executeMenuMembros(ctx) {
  const { reply } = ctx;

  let menuText = `╭━━━〔 👥 𝗠𝗘𝗡𝗨 𝗠𝗘𝗠𝗕𝗥𝗢𝗦 〕━━━╮\n` +
    `│\n` +
    `│  𖹭 ⚙️ 𝗕𝗔𝗦𝗜𝗖𝗢𝗦  𖹭\n` +
    `│  ╰┈➤ 👤 ${PREFIX}perfil\n` +
    `│  ╰┈➤ 📊 ${PREFIX}meunivel\n` +
    `│  ╰┈➤ 🏅 ${PREFIX}meulevel\n` +
    `│  ╰┈➤ 🆔 ${PREFIX}id\n` +
    `│  ╰┈➤ 📊 ${PREFIX}info\n` +
    `│  ╰┈➤ ⏰ ${PREFIX}uptime\n` +
    `│\n` +
    `│  𖹭 😴 𝗔𝗙𝗞  𖹭\n` +
    `│  ╰┈➤ 📴 ${PREFIX}afk <motivo>\n` +
    `│  ╰┈➤ 📋 ${PREFIX}afklista\n` +
    `│  ╰┈➤ _(saia do AFK enviando msg/foto/fig)_\n` +
    `│\n` +
    `│  𖹭 🎨 𝗙𝗜𝗚𝗨𝗥𝗜𝗡𝗛𝗔𝗦  𖹭\n` +
    `│  ╰┈➤ 🖼️ ${PREFIX}s (marcar)\n` +
    `│  ╰┈➤ 🏞️ ${PREFIX}toimage (transformar em foto)\n` +
    `│  ╰┈➤ 🎞️ ${PREFIX}togif (transformar em gif)\n` +
    `│  ╰┈➤ 🏷️ ${PREFIX}take <nome>\n` +
    `│  ╰┈➤ 🎨 ${PREFIX}brat <texto>\n` +
    `│  ╰┈➤ 💚 ${PREFIX}bratverde <texto>\n` +
    `│  ╰┈➤ 🎬 ${PREFIX}bratvideo <texto>\n` +
    `│\n` +
    `│  𖹭 🔍 𝗣𝗘𝗦𝗤𝗨𝗜𝗦𝗔𝗦 𝗘 𝗠𝗜𝗗𝗜𝗔 𖹭\n` +
    `│  ╰┈➤ 🖼️ ${PREFIX}gimage <busca>\n` +
    `│  ╰┈➤ 📌 ${PREFIX}pinterest <busca>\n` +
    `│  ╰┈➤ 🔍 ${PREFIX}ytsearch <busca>\n` +
    `│  ╰┈➤ 🎧 ${PREFIX}soundcloud <link>\n` +
    `│  ╰┈➤ 🎬 ${PREFIX}threads <link>\n` +
    `│\n` +
    `│  𖹭 🛠️ 𝗨𝗧𝗜𝗟𝗜𝗗𝗔𝗗𝗘𝗦 𖹭\n` +
    `│  ╰┈➤ 🎵 ${PREFIX}letra <música>\n` +
    `│  ╰┈➤ 🔮 ${PREFIX}signo <signo>\n` +
    `│  ╰┈➤ 💰 ${PREFIX}moedas\n` +
    `│  ╰┈➤ 🏆 ${PREFIX}tabelacamp\n` +
    `│  ╰┈➤ 📱 ${PREFIX}playstore <app>\n` +
    `│  ╰┈➤ 📱 ${PREFIX}celular <modelo>\n` +
    `│  ╰┈➤ 🖼️ ${PREFIX}metadinha\n` +
    `│\n` +
    `│  𖹭 📅 𝗗𝗔𝗧𝗔 𝗘 𝗛𝗢𝗥𝗔  𖹭\n` +
    `│  ╰┈➤ 📅 ${PREFIX}data\n` +
    `│  ╰┈➤ ⏰ ${PREFIX}hora\n` +
    `│  ╰┈➤ 🎂 ${PREFIX}idade <dd/mm/aaaa>\n` +
    `│\n` +
    `│  𖹭 🧮 𝗖𝗔𝗟𝗖𝗨𝗟𝗔𝗗𝗢𝗥𝗔𝗦  𖹭\n` +
    `│  ╰┈➤ 🧮 ${PREFIX}calc <expr>\n` +
    `│  ╰┈➤ 🏋️ ${PREFIX}imc <peso> <altura>\n` +
    `│  ╰┈➤ 📊 ${PREFIX}porcentagem <v> <%>\n` +
    `│  ╰┈➤ 📐 ${PREFIX}regra3 <a> <b> <c>\n` +
    `│  ╰┈➤ 💰 ${PREFIX}juros <c> <%> <t>\n` +
    `│\n` +
    `│  𖹭 🔐 𝗚𝗘𝗥𝗔𝗗𝗢𝗥𝗘𝗦  𖹭\n` +
    `│  ╰┈➤ 🔐 ${PREFIX}senha <tam>\n` +
    `│  ╰┈➤ 🎲 ${PREFIX}sortear <min> <max>\n` +
    `│  ╰┈➤ 🎯 ${PREFIX}escolher <op1, op2...>\n` +
    `│\n` +
    `│  𖹭 📝 𝗧𝗘𝗫𝗧𝗢  𖹭\n` +
    `│  ╰┈➤ 📝 ${PREFIX}contar <texto>\n` +
    `│  ╰┈➤ 🔃 ${PREFIX}inverter <texto>\n` +
    `│  ╰┈➤ 🔠 ${PREFIX}maiusculo <texto>\n` +
    `│  ╰┈➤ 🔡 ${PREFIX}minusculo <texto>\n` +
    `│  ╰┈➤ 📡 ${PREFIX}morse <texto>\n` +
    `│  ╰┈➤ 💻 ${PREFIX}binario <texto>\n` +
    `│  ╰┈➤ 🔐 ${PREFIX}base64 <encode/decode> <txt>\n` +
    `│\n` +
    `│  𖹭 ✅ 𝗩𝗔𝗟𝗜𝗗𝗔𝗖̧𝗢̃𝗘𝗦  𖹭\n` +
    `│  ╰┈➤ ✅ ${PREFIX}validarcpf <cpf>\n` +
    `│\n` +
    `│  𖹭 🌤️ 𝗢𝗨𝗧𝗥𝗢𝗦  𖹭\n` +
    `│  ╰┈➤ 🌤️ ${PREFIX}clima <cidade>\n` +
    `│  ╰┈➤ 🔤 ${PREFIX}sigla <sigla>\n` +
    `│  ╰┈➤ 🎲 ${PREFIX}quem <pergunta>\n` +
    `│\n` +
    `╰━━━〔 👥 Área dos Membros 〕━━━╯`;

  menuText = filtrarMenuVIP(menuText);

  const foto = getFotoMenu('menumembros');
  if (foto) return reply(menuText, { image: foto });
  return reply(menuText);
}

// =========================================
// MENU ADMIN
// =========================================
export async function executeMenuAdmin(ctx) {
  const { reply, sender, groupMetadata } = ctx;

  if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) {
    return reply('❌ Apenas administradores podem ver este menu.');
  }

  let menuText = `╭━━━〔 🛡️ 𝗠𝗘𝗡𝗨 𝗔𝗗𝗠𝗜𝗡 〕━━━╮\n` +
    `│\n` +
    `│  𖹭 👮 𝗠𝗢𝗗𝗘𝗥𝗔𝗖̧𝗔̃𝗢 𖹭\n` +
    `│  ╰┈➤ ⬆️ ${PREFIX}promover @user\n` +
    `│  ╰┈➤ ⬇️ ${PREFIX}rebaixar @user\n` +
    `│  ╰┈➤ 🗑️ ${PREFIX}apagar (resp msg)\n` +
    `│  ╰┈➤ 📢 ${PREFIX}todos <msg>\n` +
    `│  ╰┈➤ 👻 ${PREFIX}hidetag <msg>\n` +
    `│  ╰┈➤ 🔨 ${PREFIX}ban @user\n` +
    `│  ╰┈➤ 🔇 ${PREFIX}mute @user\n` +
    `│  ╰┈➤ 🔊 ${PREFIX}desmute @user\n` +
    `│  ╰┈➤ 📣 ${PREFIX}admins\n` +
    `│  ╰┈➤ 🔓 ${PREFIX}abrir\n` +
    `│  ╰┈➤ 🔒 ${PREFIX}fechar\n` +
    `│\n` +
    `│  𖹭 ⚠️ 𝗔𝗗𝗩𝗘𝗥𝗧𝗘̂𝗡𝗖𝗜𝗔𝗦 𖹭\n` +
    `│  ╰┈➤ ⚠️ ${PREFIX}advertir @user\n` +
    `│  ╰┈➤ 🗑️ ${PREFIX}rmwarn @user\n` +
    `│  ╰┈➤ 🧹 ${PREFIX}limparwarns @user\n` +
    `│  ╰┈➤ 📋 ${PREFIX}warns @user\n` +
    `│  ╰┈➤ 📜 ${PREFIX}listarwarns\n` +
    `│\n` +
    `│  𖹭 🛡️ 𝗣𝗥𝗢𝗧𝗘𝗖̧𝗔̃𝗢  𖹭\n` +
    `│  ╰┈➤ 🚫 ${PREFIX}antispam on/off\n` +
    `│  ╰┈➤ 🖼️ ${PREFIX}antimidia <tipo> on/off\n` +
    `│  ╰┈➤ ⛔ ${PREFIX}blacklist add/rem/lista\n` +
    `│  ╰┈➤ 🚫 ${PREFIX}antipalavrao on/off\n` +
    `│  ╰┈➤ 🕵️ ${PREFIX}antifake on/off\n` +
    `│  ╰┈➤ 🔗 ${PREFIX}antilink on/off\n` +
    `│  ╰┈➤ 📞 ${PREFIX}anticall on/off\n` +
    `│  ╰┈➤ 🤖 ${PREFIX}antibot on/off\n` +
    `│  ╰┈➤ 💸 ${PREFIX}antipayment on/off\n` + // <-- NOVO COMANDO AQUI
    `│\n` +
    `│  𖹭 🔁 𝗔𝗨𝗧𝗢𝗠𝗔𝗖̧𝗔̃𝗢 𖹭\n` +
    `│  ╰┈➤ 🚪 ${PREFIX}despedida on/off\n` +
    `│  ╰┈➤ ✏️ ${PREFIX}setdespedida <texto>\n` +
    `│  ╰┈➤ 🔍 ${PREFIX}addfiltro <gatilho> | <resp>\n` +
    `│  ╰┈➤ 🗑️ ${PREFIX}delfiltro <nº>\n` +
    `│  ╰┈➤ 📋 ${PREFIX}filtros\n` +
    `│  ╰┈➤ 🏷️ ${PREFIX}antimarcacao on/off\n` +
    `│\n` +
    `│  𖹭 ⚙️ 𝗚𝗘𝗦𝗧𝗔̃𝗢  𖹭\n` +
    `│  ╰┈➤ ⏰ ${PREFIX}autofechar 22:00 06:00\n` +
    `│  ╰┈➤ 📊 ${PREFIX}atividade\n` +
    `│  ╰┈➤ 💤 ${PREFIX}inativos <dias>\n` +
    `│  ╰┈➤ 🧹 ${PREFIX}rminativos <dias> confirmar\n` +
    `│  ╰┈➤ 📜 ${PREFIX}setregras / ${PREFIX}regras\n` +
    `│  ╰┈➤ 🗑️ ${PREFIX}delregras\n` +
    `│\n` +
    `│  𖹭 ⚙️ 𝗖𝗢𝗡𝗙𝗜𝗚𝗨𝗥𝗔𝗖̧𝗢̃𝗘𝗦 𖹭\n` +
    `│  ╰┈➤ ✏️ ${PREFIX}setnomegp\n` +
    `│  ╰┈➤ 🖼️ ${PREFIX}setfotogp\n` +
    `│  ╰┈➤ 👑 ${PREFIX}botadm on/off\n` +
    `│  ╰┈➤ 📈 ${PREFIX}levelmsg on/off\n` +
    `│\n` +
    `│  𖹭 🧠 𝗠𝗢𝗗𝗢 𝗜𝗔 𖹭\n` +
    `│  ╰┈➤ 🧠 ${PREFIX}modoia 1 → Responde perguntas\n` +
    `│  ╰┈➤ ⚙️ ${PREFIX}modoia 2 → Executa comandos\n` +
    `│  ╰┈➤ 🛑 ${PREFIX}modoia off → Desativar\n` +
    `│\n` +
    `│  𖹭 🎉 𝗕𝗘𝗠-𝗩𝗜𝗡𝗗𝗢 𖹭\n` +
    `│  ╰┈➤ 🎉 ${PREFIX}bemvindo on/off\n` +
    `│  ╰┈➤ ✏️ ${PREFIX}setlegenda\n` +
    `│  ╰┈➤ 🖼️ ${PREFIX}setfotobv\n` +
    `│\n` +
    `│  𖹭 🤝 𝗣𝗔𝗥𝗖𝗘𝗥𝗜𝗔 𖹭\n` +
    `│  ╰┈➤ 🤝 ${PREFIX}modoparceria on/off\n` +
    `│  ╰┈➤ ➕ ${PREFIX}addparceria\n` +
    `│  ╰┈➤ ➖ ${PREFIX}delparceria\n` +
    `│  ╰┈➤ 📋 ${PREFIX}lista-parceria\n` +
    `│\n` +
    `│  𖹭 🎁 𝗦𝗢𝗥𝗧𝗘𝗜𝗢 𖹭\n` +
    `│  ╰┈➤ 🎁 ${PREFIX}sorteio <prêmio>\n` +
    `│  ╰┈➤ 🎟️ ${PREFIX}sorteio entrar\n` +
    `│  ╰┈➤ 🎯 ${PREFIX}sorteio sortear\n` +
    `│\n` +
    `╰━━━〔 🛡️ Painel de Controle 〕━━━╯`;

  menuText = filtrarMenuVIP(menuText);

  const foto = getFotoMenu('admin');
  if (foto) return reply(menuText, { image: foto });
  return reply(menuText);
}

// =========================================
// MENU POKÉMON (Atualizado com Raids)
// =========================================
export async function executeMenuPokemon(ctx) {
  const { reply, sender } = ctx;

  let menuText = `╭━━━〔 ⚡ 𝗠𝗘𝗡𝗨 𝗣𝗢𝗞𝗘𝗠𝗢𝗡 〕━━━╮\n` +
    `│\n` +
    `│  𖹭 🎒 𝗦𝗨𝗔 𝗖𝗢𝗟𝗘𝗖̧𝗔̃𝗢 𖹭\n` +
    `│  ╰┈➤ 🎮 ${PREFIX}pokemon (Menu Principal)\n` +
    `│  ╰┈➤ 🐾 ${PREFIX}meuspokemons\n` +
    `│  ╰┈➤ 🔄 ${PREFIX}trocar <nº>\n` +
    `│  ╰┈➤ 🍖 ${PREFIX}alimentar <item>\n` +
    `│\n` +
    `│  𖹭 ⚔️ 𝗕𝗔𝗧𝗔𝗟𝗛𝗔𝗦 𖹭\n` +
    `│  ╰┈➤ 🆚 ${PREFIX}batalhapokemon @user\n` +
    `│  ╰┈➤ 💥 ${PREFIX}ataque1 / ataque2 / ataque3\n` +
    `│\n` +
    `│  𖹭 🔥 𝗥𝗔𝗜𝗗𝗦 𖹭\n` +
    `│  ╰┈➤ 📖 ${PREFIX}raid ajuda\n` +
    `│  ╰┈➤ ⚔️ ${PREFIX}raid entrar [n1 n2]\n` +
    `│  ╰┈➤ 🚪 ${PREFIX}raid sair\n` +
    `│  ╰┈➤ 🎯 ${PREFIX}raid capturar\n` +
    `│  ╰┈➤ 🎫 ${PREFIX}passe\n` +
    `│  ╰┈➤ 🛒 ${PREFIX}comprarpasse [qtd]\n` +
    `│\n` +
    `│  𖹭 🛒 𝗟𝗢𝗝𝗔𝗦 𖹭\n` +
    `│  ╰┈➤ 🏪 ${PREFIX}lojapokemon\n` +
    `│  ╰┈➤ 🔴 ${PREFIX}lojapokebola\n` +
    `│  ╰┈➤ 💰 ${PREFIX}comprar <item>\n` +
    `│\n` +
    `│  𖹭 🕸️ 𝗖𝗔𝗣𝗧𝗨𝗥𝗔 𖹭\n` +
    `│  ╰┈➤ 🔍 ${PREFIX}capturar <nome>\n` +
    `│\n` +
    `│  𖹭 👑 𝗔𝗗𝗠 / 𝗗𝗢𝗡𝗢 𖹭\n` +
    `│  ╰┈➤ ✅ ${PREFIX}ativarspawn\n` +
    `│  ╰┈➤ 🛑 ${PREFIX}desativarspawn\n` +
    `│  ╰┈➤ 🚀 ${PREFIX}spawn (Forçar Spawn)\n` +
    `│  ╰┈➤ 🔥 ${PREFIX}ativarraid\n` +
    `│  ╰┈➤ 🔕 ${PREFIX}desativarraid\n` +
    `│  ╰┈➤ ⚡ ${PREFIX}forcarraid [1-5]\n` +
    `│\n` +
    `╰━━━〔 ⚡ Mundo Pokémon 🔴 〕━━━╯`;

  menuText = filtrarMenuVIP(menuText);

  const foto = getFotoMenu('menupokemon');
  if (foto) return reply(menuText, { image: foto, mentions: [sender] });
  return reply(menuText, { mentions: [sender] });
}

// =========================================
// MENU RPG
// =========================================
export async function executeMenuRPG(ctx) {
  const { reply } = ctx;

  let menuText = `╭━━━〔 🗡️ 𝗠𝗘𝗡𝗨 𝗥𝗣𝗚 〕━━━╮\n` +
    `│\n` +
    `│  𖹭 🎓 𝗡𝗜́𝗩𝗘𝗟 𖹭\n` +
    `│  ╰┈➤ 📊 ${PREFIX}meunivel\n` +
    `│\n` +
    `│  𖹭 💰 𝗘𝗖𝗢𝗡𝗢𝗠𝗜𝗔 𖹭\n` +
    `│  ╰┈➤ 👤 ${PREFIX}perfilrpg\n` +
    `│  ╰┈➤ 🏦 ${PREFIX}banco\n` +
    `│  ╰┈➤ 💸 ${PREFIX}pix @user\n` +
    `│\n` +
    `│  𖹭 🎲 𝗚𝗔𝗡𝗛𝗔𝗥 𝗗𝗜𝗡𝗛𝗘𝗜𝗥𝗢 𖹭\n` +
    `│  ╰┈➤ 💼 ${PREFIX}trabalhar\n` +
    `│  ╰┈➤ 📋 ${PREFIX}empregos\n` +
    `│  ╰┈➤ 🎰 ${PREFIX}apostar\n` +
    `│  ╰┈➤ 📈 ${PREFIX}investir\n` +
    `│  ╰┈➤ 🥷 ${PREFIX}roubar @user\n` +
    `│\n` +
    `│  𖹭 🎰 𝗘𝗖𝗢𝗡𝗢𝗠𝗜𝗔 𝗔𝗩𝗔𝗡𝗖̧𝗔𝗗𝗔 𖹭\n` +
    `│  ╰┈➤ 🎟️ ${PREFIX}raspadinha <v>\n` +
    `│  ╰┈➤ 🎰 ${PREFIX}cassino <v>\n` +
    `│  ╰┈➤ ⚔️ ${PREFIX}duelo @user <v>\n` +
    `│  ╰┈➤ 🎁 ${PREFIX}presentear @user <v>\n` +
    `│  ╰┈➤ 🏆 ${PREFIX}top\n` +
    `│  ╰┈➤ 🏦 ${PREFIX}topbanco\n` +
    `│\n` +
    `│  𖹭 💊 𝗣𝗢𝗖̧𝗢̃𝗘𝗦 𖹭\n` +
    `│  ╰┈➤ 💊 ${PREFIX}lojapocoes\n` +
    `│  ╰┈➤ 🛒 ${PREFIX}comprarpocao\n` +
    `│  ╰┈➤ ✨ ${PREFIX}meusbuffs\n` +
    `│\n` +
    `│  𖹭 🏦 𝗘𝗠𝗣𝗥𝗘́𝗦𝗧𝗜𝗠𝗢 𖹭\n` +
    `│  ╰┈➤ 💰 ${PREFIX}emprestimo\n` +
    `│  ╰┈➤ ✅ ${PREFIX}pagaremprestimo\n` +
    `│\n` +
    `│  𖹭 🏠 𝗖𝗔𝗦𝗔𝗦 𖹭\n` +
    `│  ╰┈➤ 🏠 ${PREFIX}casas\n` +
    `│  ╰┈➤ 🛒 ${PREFIX}comprarcasa\n` +
    `│\n` +
    `│  𖹭 🐾 𝗣𝗘𝗧𝗦 𖹭\n` +
    `│  ╰┈➤ 🐾 ${PREFIX}adotar\n` +
    `│  ╰┈➤ 📋 ${PREFIX}pets\n` +
    `│  ╰┈➤ 🔄 ${PREFIX}trocarpet\n` +
    `│  ╰┈➤ ⚔️ ${PREFIX}batalhapet\n` +
    `│\n` +
    `│  𖹭 🌾 𝗙𝗔𝗭𝗘𝗡𝗗𝗔 𖹭\n` +
    `│  ╰┈➤ 🌾 ${PREFIX}fazendas\n` +
    `│  ╰┈➤ 🛒 ${PREFIX}comprarfazenda\n` +
    `│  ╰┈➤ 🏡 ${PREFIX}minhafazenda\n` +
    `│  ╰┈➤ 🐄 ${PREFIX}lojaanimais\n` +
    `│  ╰┈➤ 🐾 ${PREFIX}compraranimal\n` +
    `│  ╰┈➤ 🔧 ${PREFIX}melhorias\n` +
    `│  ╰┈➤ ⬆️ ${PREFIX}comprarmelhoria\n` +
    `│  ╰┈➤ 💰 ${PREFIX}coletar\n` +
    `│\n` +
    `│  𖹭 🏙️ 𝗖𝗜𝗗𝗔𝗗𝗘 𖹭\n` +
    `│  ╰┈➤ 🏙️ ${PREFIX}cidade\n` +
    `│  ╰┈➤ 🏗️ ${PREFIX}criarcidade\n` +
    `│  ╰┈➤ 🔨 ${PREFIX}construir\n` +
    `│  ╰┈➤ 💵 ${PREFIX}coletarimpostos\n` +
    `│  ╰┈➤ ⬆️ ${PREFIX}melhorarestrutura\n` +
    `│  ╰┈➤ 🗑️ ${PREFIX}demolir\n` +
    `│  ╰┈➤ 💼 ${PREFIX}proposta\n` +
    `│  ╰┈➤ ✅ ${PREFIX}aceitarproposta\n` +
    `│  ╰┈➤ ❌ ${PREFIX}recusarproposta\n` +
    `│  ╰┈➤ 🏆 ${PREFIX}cidade ranking\n` +
    `│\n` +
    `│  𖹭 🎣 𝗣𝗘𝗦𝗖𝗔 𖹭\n` +
    `│  ╰┈➤ 🎣 ${PREFIX}pescar\n` +
    `│  ╰┈➤ 🐠 ${PREFIX}aquario\n` +
    `│  ╰┈➤ 💰 ${PREFIX}venderpeixes\n` +
    `│  ╰┈➤ 🪱 ${PREFIX}comprariscas\n` +
    `│\n` +
    `│  𖹭 🏰 𝗖𝗟𝗔̃𝗘𝗦 𖹭\n` +
    `│  ╰┈➤ 🏰 ${PREFIX}criarcla\n` +
    `│  ╰┈➤ ➕ ${PREFIX}entrarcla\n` +
    `│  ╰┈➤ ➖ ${PREFIX}saircla\n` +
    `│  ╰┈➤ 📋 ${PREFIX}meucla\n` +
    `│  ╰┈➤ 🏆 ${PREFIX}rankingclas\n` +
    `│\n` +
    `│  𖹭 💍 𝗖𝗔𝗦𝗔𝗠𝗘𝗡𝗧𝗢 𖹭\n` +
    `│  ╰┈➤ 💍 ${PREFIX}casar @user\n` +
    `│  ╰┈➤ 💔 ${PREFIX}divorciar\n` +
    `│  ╰┈➤ 📋 ${PREFIX}meucasamento\n` +
    `│\n` +
    `│  𖹭 🎁 𝗕𝗢̂𝗡𝗨𝗦 𖹭\n` +
    `│  ╰┈➤ 🎁 125 coins/dia\n` +
    `│\n` +
    `╰━━━〔 🗡️ Aventura RPG 〕━━━╯`;

  menuText = filtrarMenuVIP(menuText);

  const foto = getFotoMenu('rpg');
  if (foto) return reply(menuText, { image: foto });
  return reply(menuText);
}

// =========================================
// MENU BAIXAR
// =========================================
export async function executeMenuBaixar(ctx) {
  const { reply } = ctx;

  let menuText = `╭━━━〔 📥 𝗠𝗘𝗡𝗨 𝗕𝗔𝗜𝗫𝗔𝗥 〕━━━╮\n` +
    `│\n` +
    `│  𖹭 🎵 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 𖹭\n` +
    `│  ╰┈➤ 🎵 ${PREFIX}ytmp3 <link>\n` +
    `│  ╰┈➤ 🎥 ${PREFIX}ytmp4 <link>\n` +
    `│  ╰┈➤ 🎬 ${PREFIX}play-video <busca>\n` +
    `│  ╰┈➤ ▶️ ${PREFIX}play <busca>\n` +
    `│\n` +
    `│  𖹭 🔍 𝗣𝗘𝗦𝗤𝗨𝗜𝗦𝗔𝗦 𖹭\n` +
    `│  ╰┈➤ 📌 ${PREFIX}pinterest <busca>\n` +
    `│  ╰┈➤ 🐾 ${PREFIX}animal\n` +
    `│\n` +
    `│  𖹭 👻 𝗦𝗡𝗔𝗣𝗖𝗛𝗔𝗧 𖹭\n` +
    `│  ╰┈➤ 👻 ${PREFIX}snapchat <link>\n` +
    `│\n` +
    `│  𖹭 📂 𝗚𝗢𝗢𝗚𝗟𝗘 𝗗𝗥𝗜𝗩𝗘 𖹭\n` +
    `│  ╰┈➤ 📂 ${PREFIX}gdrive <link>\n` +
    `│\n` +
    `│  𖹭 🟠 𝗥𝗘𝗗𝗗𝗜𝗧 𖹭\n` +
    `│  ╰┈➤ 🟠 ${PREFIX}reddit <link>\n` +
    `│\n` +
    `│  ⚠️ Todos precisam de link!\n` +
    `│\n` +
    `╰━━━〔 📥 Downloads 〕━━━╯`;

  menuText = filtrarMenuVIP(menuText);

  const foto = getFotoMenu('baixar');
  if (foto) return reply(menuText, { image: foto });
  return reply(menuText);
                                    }
