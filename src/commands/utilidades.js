import { PREFIX, BOT_NAME, OWNER_NICK } from '../config.js';
import { getUsuario } from '../functions/rpg.js';

// =========================================
// 1. /id
// =========================================
export async function executeId(ctx) {
  const { reply, sender, msg, isGroup } = ctx;
  const jid = msg.key.remoteJid;

  let texto = `🆔 *SEUS IDs*\n\n👤 Seu ID: \`${sender}\`\n\n`;
  if (isGroup) texto += `👥 ID do grupo: \`${jid}\`\n\n`;
  texto += `💡 Útil para configurar o bot!`;
  return reply(texto);
}

// =========================================
// 2. /info
// =========================================
export async function executeInfo(ctx) {
  const { reply } = ctx;

  const uptime = process.uptime();
  const dias = Math.floor(uptime / 86400);
  const horas = Math.floor((uptime % 86400) / 3600);
  const minutos = Math.floor((uptime % 3600) / 60);
  const memoriaUsada = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

  return reply(
    `🤖 *INFORMAÇÕES DO BOT*\n\n` +
    `📌 Nome: ${BOT_NAME}\n` +
    `👑 Dono: ${OWNER_NICK}\n` +
    `🔣 Prefixo: ${PREFIX}\n` +
    `⏰ Online há: ${dias}d ${horas}h ${minutos}min\n` +
    `💾 Memória: ${memoriaUsada} MB\n` +
    `⚙️ Node.js: ${process.version}\n\n` +
    `💡 Use ${PREFIX}menu para ver os comandos.`
  );
}

// =========================================
// 3. /uptime
// =========================================
export async function executeUptime(ctx) {
  const { reply } = ctx;
  const uptime = process.uptime();
  const dias = Math.floor(uptime / 86400);
  const horas = Math.floor((uptime % 86400) / 3600);
  const minutos = Math.floor((uptime % 3600) / 60);
  const segundos = Math.floor(uptime % 60);

  return reply(
    `⏰ *UPTIME*\n\n📅 ${dias} dia(s)\n🕐 ${horas} hora(s)\n⏱️ ${minutos} minuto(s)\n⏲️ ${segundos} segundo(s)`
  );
}

// =========================================
// 4. /reportar <texto>
// =========================================
export async function executeReportar(ctx) {
  const { reply, sender, q, pushName, msg, client } = ctx;
  const jid = msg.key.remoteJid;

  if (!q.trim()) {
    return reply(`📢 *REPORTAR*\n\nUse: ${PREFIX}reportar <descrição>\n💡 Exemplo: ${PREFIX}reportar o /menu não funciona`);
  }

  const { OWNER_NUMBER } = await import('../config.js');
  const ownerJid = `${OWNER_NUMBER}@s.whatsapp.net`;

  const texto = `📢 *NOVO REPORT*\n\n👤 De: ${pushName}\n📞 ID: ${sender}\n📱 Chat: ${jid}\n\n📝 *Mensagem:*\n${q}`;

  try {
    await client.sendMessage(ownerJid, { text: texto });
    return reply('✅ *Report enviado!*\n\nO dono foi notificado. Obrigado! 🚀');
  } catch (e) {
    return reply('❌ Erro ao enviar report.');
  }
}

// =========================================
// 5. /convite
// =========================================
export async function executeConvite(ctx) {
  const { reply, client, msg, isGroup, sender, groupMetadata } = ctx;
  const { isAdmin, isOwner } = await import('../functions/permissions.js');

  if (!isGroup) return reply('❌ Só funciona em grupos.');
  if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) {
    return reply('❌ Apenas administradores podem pegar o link.');
  }

  try {
    const codigo = await client.groupInviteCode(msg.key.remoteJid);
    return reply(`🔗 *LINK DO GRUPO*\n\nhttps://chat.whatsapp.com/${codigo}\n\n⚠️ Compartilhe com cuidado!`);
  } catch (e) {
    return reply('❌ Erro ao gerar link. Verifique se sou admin.');
  }
}

// =========================================
// 6. /meusdados
// =========================================
export async function executeMeusDados(ctx) {
  const { reply, sender, pushName } = ctx;
  const user = getUsuario(sender);

  const totalMensagens = user.dados?.mensagens || 0;
  const totalComandos = user.dados?.comandos || 0;
  const totalFigurinhas = user.dados?.figurinhas || 0;

  return reply(
    `📊 *SUAS ESTATÍSTICAS*\n\n` +
    `👤 Nome: ${pushName}\n` +
    `💰 Coins: ${user.coins.toLocaleString('pt-BR')}\n` +
    `🏦 Banco: ${user.banco.toLocaleString('pt-BR')}/5000\n` +
    `📈 Nível: ${user.nivelEmprego || 1}\n\n` +
    `📱 *ATIVIDADE:*\n` +
    `💬 Mensagens: ${totalMensagens}\n` +
    `⚙️ Comandos: ${totalComandos}\n` +
    `🎨 Figurinhas: ${totalFigurinhas}`
  );
}

// =========================================
// 7. /dado
// =========================================
export async function executeDado(ctx) {
  const { reply, q } = ctx;
  const lados = parseInt(q.trim()) || 6;
  if (lados < 2 || lados > 100) return reply('❌ Use: /dado <lados>\n💡 Entre 2 e 100.');

  const resultado = Math.floor(Math.random() * lados) + 1;
  const emoji = resultado === lados ? '🎉' : resultado === 1 ? '😢' : '🎲';

  return reply(`🎲 *DADO DE ${lados} LADOS*\n\n${emoji} Caiu: *${resultado}*`);
}

// =========================================
// 8. /moeda
// =========================================
export async function executeMoeda(ctx) {
  const { reply } = ctx;
  const resultado = Math.random() < 0.5 ? 'CARA' : 'COROA';
  const emoji = resultado === 'CARA' ? '🪙' : '👑';
  return reply(`🪙 *MOEDA*\n\n${emoji} Caiu: *${resultado}*`);
}

// =========================================
// 9. /sorte
// =========================================
export async function executeSorte(ctx) {
  const { reply, q } = ctx;
  const partes = q.trim().split(/\s+/);
  const min = parseInt(partes[0]) || 1;
  const max = parseInt(partes[1]) || 100;

  if (min >= max) return reply('❌ Use: /sorte <mín> <máx>\n💡 Exemplo: /sorte 1 100');

  const resultado = Math.floor(Math.random() * (max - min + 1)) + min;
  return reply(`🎯 *SORTE*\n\n📊 Entre ${min} e ${max}\n🎲 Sorteado: *${resultado}*`);
}

// =========================================
// 10. /simounao
// =========================================
export async function executeSimOuNao(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`🎱 Use: ${PREFIX}simounao <pergunta>`);

  const respostas = [
    '✅ SIM!', '❌ NÃO!', '🤔 Talvez...', '😏 Com certeza!',
    '🙅 De jeito nenhum!', '🎯 Acho que sim!', '💭 Depende...',
    '🌟 Sem dúvidas!', '😬 Melhor não contar com isso!', '🔮 O destino dirá!'
  ];

  const resposta = respostas[Math.floor(Math.random() * respostas.length)];
  return reply(`🎱 *BOLA MÁGICA*\n\n❓ ${q}\n\n✨ Resposta: *${resposta}*`);
}

// =========================================
// 11. /piada
// =========================================
const PIADAS = [
  'Por que o programador foi ao médico? Porque estava com um bug! 💻',
  'O que o pato disse para a pata? Vem quá! 🦆',
  'Por que o livro de matemática se suicidou? Porque tinha muitos problemas! 📚',
  'Como se despede de um químico? Ácido! 🧪',
  'Por que o elétron nunca se perde? Porque ele tem bom contato! ⚡',
  'O que o zero disse para o oito? Que cinto bonito! 🎽',
  'O que o tomate foi fazer no banco? Tirar o extrato! 🍅',
  'Qual é o cúmulo da paciência? Esperar o sol nascer pra ver o nascer do sol! ☀️'
];

export async function executePiada(ctx) {
  const { reply } = ctx;
  const piada = PIADAS[Math.floor(Math.random() * PIADAS.length)];
  return reply(`😂 *PIADA*\n\n${piada}`);
}

// =========================================
// 12. /curiosidade
// =========================================
const CURIOSIDADES = [
  '🐙 O polvo tem 3 corações e sangue azul!',
  '🍯 O mel nunca estraga. Já acharam mel comestível em tumbas egípcias de 3000 anos!',
  '🌊 Cerca de 71% da superfície da Terra é coberta por água.',
  '🐌 Um caracol pode dormir por até 3 anos!',
  '🍌 Bananas são levemente radioativas.',
  '🦈 Tubarões existem há mais tempo que as árvores!',
  '🌙 A Lua está se afastando da Terra 3,8cm por ano.',
  '🐝 As abelhas podem reconhecer rostos humanos.',
  '⚡ Um raio é 5x mais quente que a superfície do Sol!',
  '🧠 O cérebro humano tem cerca de 86 bilhões de neurônios.',
  '🐘 Elefantes são os únicos animais que não conseguem pular.',
  '☕ O café é a 2ª bebida mais consumida do mundo, atrás da água.'
];

export async function executeCuriosidade(ctx) {
  const { reply } = ctx;
  const curiosidade = CURIOSIDADES[Math.floor(Math.random() * CURIOSIDADES.length)];
  return reply(`💡 *CURIOSIDADE*\n\n${curiosidade}`);
}
