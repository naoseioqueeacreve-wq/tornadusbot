import { PREFIX, BOT_NAME, API_KEY } from '../config.js';
import { getUsuario, salvarUsuario, lerDB } from '../functions/rpg.js';
import { enviarMidia } from '../functions/midia.js';

// =========================================
// 💰 ECONOMIA
// =========================================

export async function executeRaspadinha(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const valor = parseInt(q.trim()) || 500;
  if (valor < 100) return reply(`🎰 Aposta mínima: 100 coins`);
  if (valor > user.coins) return reply(`❌ Saldo insuficiente! Você tem ${user.coins}`);

  user.coins -= valor;
  const chance = Math.random();
  let premio = 0;
  if (chance < 0.01) premio = valor * 20;
  else if (chance < 0.05) premio = valor * 5;
  else if (chance < 0.15) premio = valor * 2;
  else if (chance < 0.30) premio = valor;

  user.coins += premio;
  salvarUsuario(sender, user);

  return reply(
    `🎟️ *RASPADINHA*\n\n` +
    `┌─────────────┐\n│ ${premio > 0 ? '💎 💎 💎' : '❌ ❌ ❌'} │\n└─────────────┘\n\n` +
    `${premio > 0 ? '🎉 *GANHOU!*' : '😢 *PERDEU!*'}\n` +
    (premio > 0 ? `💰 Ganhou: *${premio.toLocaleString('pt-BR')}*` : `💸 Perdeu: *${valor.toLocaleString('pt-BR')}*`) +
    `\n\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

export async function executeCassino(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const valor = parseInt(q.trim()) || 100;
  if (valor < 50) return reply('🎰 Aposta mínima: 50 coins');
  if (valor > user.coins) return reply(`❌ Saldo insuficiente! Você tem ${user.coins}`);

  user.coins -= valor;
  const emojis = ['🍒', '🍋', '🍊', '💎', '7️⃣', '⭐'];
  const a = emojis[Math.floor(Math.random() * emojis.length)];
  const b = emojis[Math.floor(Math.random() * emojis.length)];
  const c = emojis[Math.floor(Math.random() * emojis.length)];

  let multi = 0, msg = '';
  if (a === b && b === c) {
    if (a === '7️⃣') { multi = 20; msg = '🎰 JACKPOT!!! 🎰'; }
    else if (a === '💎') { multi = 10; msg = '💎 DIAMANTES! 💎'; }
    else { multi = 5; msg = '🔥 TRÊS IGUAIS! 🔥'; }
  } else if (a === b || b === c || a === c) { multi = 2; msg = '✨ Dois iguais!'; }
  else msg = '😢 Não foi dessa vez...';

  const premio = valor * multi;
  user.coins += premio;
  salvarUsuario(sender, user);

  return reply(
    `🎰 *CASSINO*\n\n┏━━━━━━━━━┓\n┃  ${a} ${b} ${c}  ┃\n┗━━━━━━━━━┛\n\n${msg}\n` +
    (premio > 0 ? `💰 Ganhou: *${premio.toLocaleString('pt-BR')}*` : `💸 Perdeu: *${valor.toLocaleString('pt-BR')}*`) +
    `\n\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

export async function executeDuelo(ctx) {
  const { reply, sender, msg, pushName, q } = ctx;
  const user = getUsuario(sender);
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`⚔️ Use: ${PREFIX}duelo @user <valor>`);

  const oponente = mentions[0];
  if (oponente === sender) return reply('❌ Não pode duelar consigo mesmo!');

  const partes = q.trim().split(/\s+/);
  const valor = parseInt(partes[1]) || 100;
  if (valor < 100) return reply('⚔️ Aposta mínima: 100 coins');
  if (user.coins < valor) return reply(`❌ Você precisa de ${valor} coins!`);

  const userO = getUsuario(oponente);
  if (userO.coins < valor) return reply('❌ O oponente não tem coins suficientes!');

  const vencedor = Math.random() < 0.5 ? 'p1' : 'p2';
  if (vencedor === 'p1') {
    user.coins += valor; userO.coins -= valor;
  } else {
    user.coins -= valor; userO.coins += valor;
  }
  salvarUsuario(sender, user);
  salvarUsuario(oponente, userO);

  const barraP1 = '█'.repeat(Math.floor(Math.random() * 5) + 5);
  const barraP2 = '█'.repeat(Math.floor(Math.random() * 5) + 5);

  return reply(
    `⚔️ *DUELO*\n\n👤 ${pushName}: ${barraP1}\n🎯 Oponente: ${barraP2}\n\n` +
    `🏆 *VENCEDOR:* ${vencedor === 'p1' ? pushName : 'Oponente'}\n💰 Prêmio: ${valor.toLocaleString('pt-BR')}\n\n` +
    `💼 Seu saldo: ${user.coins.toLocaleString('pt-BR')}`,
    { mentions: [oponente] }
  );
}

export async function executePresentear(ctx) {
  const { reply, sender, msg, pushName, q } = ctx;
  const user = getUsuario(sender);
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`🎁 Use: ${PREFIX}presentear @user <valor>`);

  const alvo = mentions[0];
  if (alvo === sender) return reply('❌ Não pode presentear a si mesmo!');

  const partes = q.trim().split(/\s+/);
  const valor = parseInt(partes[1]) || 0;
  if (valor < 10) return reply('🎁 Valor mínimo: 10 coins');
  if (valor > user.coins) return reply(`❌ Você tem só ${user.coins} coins!`);

  user.coins -= valor;
  const userA = getUsuario(alvo);
  userA.coins += valor;
  salvarUsuario(sender, user);
  salvarUsuario(alvo, userA);

  return reply(
    `🎁 *PRESENTE ENVIADO!*\n\n${pushName} deu *${valor.toLocaleString('pt-BR')} coins* para o amigo!\n\n💼 Seu saldo: ${user.coins.toLocaleString('pt-BR')}`,
    { mentions: [alvo] }
  );
}

export async function executeTop(ctx) {
  const { reply } = ctx;
  const db = lerDB();
  const usuarios = db.usuarios || {};

  const lista = Object.entries(usuarios)
    .map(([jid, u]) => ({ jid, coins: u.coins || 0 }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 10);

  if (lista.length === 0) return reply('❌ Nenhum usuário registrado!');

  let texto = `🏆 *TOP 10 — MAIS RICOS*\n\n`;
  lista.forEach((u, i) => {
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    texto += `${medalha} @${u.jid.split('@')[0]} — ${u.coins.toLocaleString('pt-BR')} coins\n`;
  });
  return reply(texto, { mentions: lista.map(u => u.jid) });
}

export async function executeTopMoney(ctx) {
  const { reply } = ctx;
  const db = lerDB();
  const usuarios = db.usuarios || {};

  const lista = Object.entries(usuarios)
    .map(([jid, u]) => ({ jid, banco: u.banco || 0 }))
    .sort((a, b) => b.banco - a.banco)
    .slice(0, 10);

  if (lista.length === 0) return reply('❌ Nenhum usuário registrado!');

  let texto = `🏦 *TOP 10 — BANCO*\n\n`;
  lista.forEach((u, i) => {
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    texto += `${medalha} @${u.jid.split('@')[0]} — ${u.banco.toLocaleString('pt-BR')} coins\n`;
  });
  return reply(texto, { mentions: lista.map(u => u.jid) });
}

// =========================================
// 🛠️ UTILIDADES
// =========================================
export async function executeCalc(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`🧮 Use: ${PREFIX}calc <expressão>\n💡 Exemplo: ${PREFIX}calc 5*8+10`);

  const expressao = q.replace(/[^0-9+\-*/().%\s]/g, '');
  try {
    const resultado = eval(expressao);
    if (typeof resultado !== 'number' || !isFinite(resultado)) return reply('❌ Expressão inválida!');
    return reply(`🧮 *CALCULADORA*\n\n📝 ${expressao}\n🟰 *${resultado}*`);
  } catch (e) {
    return reply('❌ Erro no cálculo.');
  }
}

export async function executeClima(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`🌤️ Use: ${PREFIX}clima <cidade>`);

  try {
    const url = `https://api.bronxyshost.com.br/api-bronxys/clima?cidade=${encodeURIComponent(q)}&apikey=${API_KEY}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(15000)
    });
    const data = await resp.json();

    const cidade = data?.cidade || data?.name || q;
    const temp = data?.temperatura || data?.temp || data?.main?.temp;
    const desc = data?.descricao || data?.description || data?.weather?.[0]?.description;
    const umid = data?.umidade || data?.humidity || data?.main?.humidity;
    const vento = data?.vento || data?.wind || data?.wind?.speed;

    if (!temp) return reply('❌ Não consegui obter o clima.');

    return reply(
      `🌤️ *CLIMA — ${cidade.toUpperCase()}*\n\n` +
      `🌡️ Temperatura: ${temp}°C\n☁️ Condição: ${desc || 'N/A'}\n💧 Umidade: ${umid || 'N/A'}%\n💨 Vento: ${vento || 'N/A'} km/h`
    );
  } catch (e) {
    return reply('❌ Erro ao buscar clima.');
  }
}

export async function executeCor(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`🎨 Use: ${PREFIX}cor <nome>`);

  const cores = {
    vermelho: { hex: '#FF0000', emoji: '🔴' }, azul: { hex: '#0000FF', emoji: '🔵' },
    verde: { hex: '#00FF00', emoji: '🟢' }, amarelo: { hex: '#FFFF00', emoji: '🟡' },
    laranja: { hex: '#FFA500', emoji: '🟠' }, roxo: { hex: '#800080', emoji: '🟣' },
    rosa: { hex: '#FFC0CB', emoji: '🌸' }, preto: { hex: '#000000', emoji: '⚫' },
    branco: { hex: '#FFFFFF', emoji: '⚪' }, cinza: { hex: '#808080', emoji: '🔘' },
    marrom: { hex: '#A52A2A', emoji: '🟤' }, dourado: { hex: '#FFD700', emoji: '🟡' }
  };

  const nome = q.trim().toLowerCase();
  const cor = cores[nome];
  if (!cor) return reply(`🎨 Não conheço. Tente: ${Object.keys(cores).join(', ')}`);
  return reply(`🎨 *${nome.toUpperCase()}*\n\n${cor.emoji} HEX: \`${cor.hex}\``);
}

export async function executeSigla(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`🔤 Use: ${PREFIX}sigla <sigla>`);

  const sigla = q.trim().toUpperCase();
  const significados = {
    'PQP': 'Que Pena, Parceiro!', 'VDD': 'Verdade', 'KKK': 'Rindo muito',
    'SQN': 'Só Que Não', 'FDS': 'Fim De Semana', 'TMJ': 'Tamo Junto',
    'BJK': 'Beijo', 'ABS': 'Abraços', 'PDP': 'Pode Pá', 'SLK': 'É Sério Isso',
    'MLK': 'Muleke', 'VSF': 'Vai Semear Flores'
  };
  const significado = significados[sigla] || 'Não conheço essa sigla 🤔';
  return reply(`🔤 *${sigla}*\n\n📖 ${significado}`);
}

// =========================================
// 😂 BRINCADEIRAS
// =========================================

// =========================================
// 11. GAY
// =========================================
export async function executeGay(ctx) {
  const { reply, msg, sender, client } = ctx;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const alvo = mentions[0] || sender;
  const nomeAlvo = alvo.split('@')[0];

  try {
    await client.sendMessage(msg.key.remoteJid, {
      react: { text: '⏳', key: msg.key }
    });
  } catch (e) {}

  await reply(`🌈 *Analisando o nível de gay...* @${nomeAlvo} aguarde!`);

  const PORCENTAGEM = Math.floor(Math.random() * 110);

  let RESULTADO, EMOJI;
  if (PORCENTAGEM <= 10) { RESULTADO = 'Héterotop raiz! Macho alfa! 💪'; EMOJI = '👊'; }
  else if (PORCENTAGEM <= 20) { RESULTADO = 'Tem uns traços suspeitos, mas ainda é hétero! 🤨'; EMOJI = '🤔'; }
  else if (PORCENTAGEM <= 30) { RESULTADO = 'Meio boiola, mas disfarça bem! 😏'; EMOJI = '😏'; }
  else if (PORCENTAGEM <= 40) { RESULTADO = 'Tenho minhas dúvidas, viu... 👀'; EMOJI = '🔍'; }
  else if (PORCENTAGEM <= 49) { RESULTADO = 'Você é, né? Admita! 😏'; EMOJI = '💅'; }
  else if (PORCENTAGEM === 50) { RESULTADO = 'Você é ou não é??? Decida-se! 😳'; EMOJI = '❓'; }
  else if (PORCENTAGEM <= 70) { RESULTADO = 'É baitola sim, pode assumir! 🏳️‍🌈'; EMOJI = '🌈'; }
  else if (PORCENTAGEM <= 90) { RESULTADO = 'Baitolão assumido! Arrasou! 💅'; EMOJI = '💅'; }
  else if (PORCENTAGEM <= 100) { RESULTADO = 'A RAINHA DO GRUPO! Coroa ela! 👑'; EMOJI = '👑'; }
  else { RESULTADO = 'NÍVEL MÁXIMO ALCANÇADO! LENDÁRIA(O)! 🌟'; EMOJI = '🌟'; }

  const legenda =
    `╭━━━〔 🌈 𝗧𝗘𝗦𝗧𝗘 𝗚𝗔𝗬 〕━━━╮\n` +
    `┃\n` +
    `┃ 👤 @${nomeAlvo}\n` +
    `┃\n` +
    `┃ ${EMOJI} Você é *${PORCENTAGEM}%* gay!\n` +
    `┃\n` +
    `┃ 📝 ${RESULTADO}\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`;

  await enviarMidia(client, msg.key.remoteJid, 'gay', legenda, [alvo], msg);
}

// =========================================
// 12. CORNO — PORCENTAGEM ALEATÓRIA 1-100
// =========================================
export async function executeCorno(ctx) {
  const { reply, msg, sender, pushName, client } = ctx;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const alvo = mentions[0] || sender;
  const nome = mentions[0] ? `@${alvo.split('@')[0]}` : pushName;

  // 🎯 Porcentagem aleatória de 1 a 100
  const porcentagem = Math.floor(Math.random() * 100) + 1;

  // 📊 Barra visual
  const barraCheia = Math.floor(porcentagem / 10);
  const barraVazia = 10 - barraCheia;
  const barra = '🟥'.repeat(barraCheia) + '⬛'.repeat(barraVazia);

  // 📝 Texto do resultado por faixa
  let resultado, emoji;
  if (porcentagem <= 10) { resultado = 'Anjo! Ninguém te traiu nunca!'; emoji = '✨'; }
  else if (porcentagem <= 20) { resultado = 'Ufa! Tá safe no amor!'; emoji = '😇'; }
  else if (porcentagem <= 30) { resultado = 'Olho vivo, hein...'; emoji = '😅'; }
  else if (porcentagem <= 40) { resultado = 'Fica de olho na(o) parceira(o)...'; emoji = '👀'; }
  else if (porcentagem <= 50) { resultado = 'Hmm... tá meio suspeito!'; emoji = '🤔'; }
  else if (porcentagem <= 60) { resultado = 'Melhor ir checando o celular...'; emoji = '😬'; }
  else if (porcentagem <= 70) { resultado = 'Tá ficando complicado!'; emoji = '🐂'; }
  else if (porcentagem <= 80) { resultado = 'CORNO CONFIRMADO!'; emoji = '🐂'; }
  else if (porcentagem <= 90) { resultado = 'CORNO MANSO! Respeita!'; emoji = '👑'; }
  else { resultado = 'REI DA CORNALIDADE! LENDÁRIO!'; emoji = '🏆'; }

  const legenda =
    `╔═══════════════════╗\n` +
    `   🐂 *T E S T E   D O   C O R N O* 🐂\n` +
    `╚═══════════════════╝\n` +
    `\n` +
    `╭─────────────────────╮\n` +
    `│ 👤 Analisando: ${nome}\n` +
    `╰─────────────────────╯\n` +
    `\n` +
    `╭─「 📊 *NÍVEL* 」\n` +
    `│\n` +
    `│ ${barra}\n` +
    `│ 🎯 *${porcentagem}%* corno(a)\n` +
    `│\n` +
    `╰─────────────────────╯\n` +
    `\n` +
    `   ${emoji} *${resultado}* ${emoji}\n` +
    `\n` +
    `╔═══════════════════╗\n` +
    `  🐂 *Feito por ${BOT_NAME}* 🐂\n` +
    `╚═══════════════════╝`;

  await enviarMidia(client, msg.key.remoteJid, 'corno', legenda, [alvo], msg);
}

// =========================================
// 13. BEIJO
// =========================================
export async function executeBeijo(ctx) {
  const { reply, msg, pushName, client } = ctx;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentions.length === 0) return reply(`😘 Use: ${PREFIX}beijo @pessoa`);

  const alvo = mentions[0];
  const nome = `@${alvo.split('@')[0]}`;

  const beijos = ['💋', '😘', '😽', '💏', '😚', '💖'];
  const emoji = beijos[Math.floor(Math.random() * beijos.length)];

  const legenda =
    `╭━━━〔 ${emoji} 𝗕𝗘𝗜𝗝𝗢 〕━━━╮\n` +
    `┃\n` +
    `┃ ${pushName} deu um beijo em\n` +
    `┃    ${nome}!\n` +
    `┃\n` +
    `┃ 💕 Que fofo!\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`;

  await enviarMidia(client, msg.key.remoteJid, 'beijo', legenda, [alvo], msg);
}
