import { PREFIX, OWNER_NUMBER } from '../config.js';
import { isAdmin, isOwner } from '../functions/permissions.js';
import { getText } from '../functions/helpers.js';
import { soDigitos, identificadores } from './protecao.js';

// =========================================
// AUXILIARES
// =========================================
function temPermissao(ctx) {
  return isAdmin(ctx.sender, ctx.groupMetadata) || isOwner(ctx.sender);
}

function checar(ctx) {
  if (!ctx.isGroup) return '❌ Este comando só funciona em grupos.';
  if (!temPermissao(ctx)) return '❌ Apenas administradores podem usar este comando.';
  return null;
}

function infoContexto(msg) {
  return msg.message?.extendedTextMessage?.contextInfo;
}

// Alvo por menção ou por resposta a uma mensagem
function acharAlvo(ctx) {
  const info = infoContexto(ctx.msg);
  const jid = info?.mentionedJid?.[0] || info?.participant;
  if (!jid) return null;
  const ids = identificadores(jid);
  const participante = ctx.groupMetadata?.participants?.find(p =>
    identificadores(p).some(i => ids.includes(i))
  );
  return { jid, participante };
}

function idsDoBot(client) {
  return [soDigitos(client.user?.id), soDigitos(client.user?.lid)].filter(Boolean);
}

// Texto da própria mensagem (preserva quebras de linha) ou da mensagem respondida
function textoDoComando(msg) {
  let texto = getText(msg).replace(/^\S+\s*/, '').trim();
  if (!texto) {
    const citada = infoContexto(msg)?.quotedMessage;
    texto = (citada?.conversation || citada?.extendedTextMessage?.text || '').trim();
  }
  return texto;
}

// =========================================
// 👑 SISTEMA 9: CARGOS E ATALHOS
// =========================================
export async function executePromover(ctx) {
  const { reply, client, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const alvo = acharAlvo(ctx);
  if (!alvo) {
    return reply(`⬆️ *PROMOVER A ADMIN*\n\nUse: ${PREFIX}promover @user\nOu responda a uma mensagem com ${PREFIX}promover`);
  }
  if (!alvo.participante) return reply('❌ Esse usuário não está no grupo.');
  if (alvo.participante.admin) return reply('⚠️ Esse usuário já é admin.');

  try {
    await client.groupParticipantsUpdate(msg.key.remoteJid, [alvo.participante.id], 'promote');
    return reply(
      `⬆️ *NOVO ADMIN*\n\n👤 @${alvo.participante.id.split('@')[0]} agora é administrador.`,
      { mentions: [alvo.participante.id] }
    );
  } catch (e) {
    return reply('❌ Não consegui promover. Verifique se sou admin do grupo.');
  }
}

export async function executeRebaixar(ctx) {
  const { reply, client, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const alvo = acharAlvo(ctx);
  if (!alvo) {
    return reply(`⬇️ *REBAIXAR ADMIN*\n\nUse: ${PREFIX}rebaixar @user\nOu responda a uma mensagem com ${PREFIX}rebaixar`);
  }

  const p = alvo.participante;
  if (!p) return reply('❌ Esse usuário não está no grupo.');
  if (!p.admin) return reply('⚠️ Esse usuário não é admin.');
  if (p.admin === 'superadmin') return reply('❌ Não é possível rebaixar o criador do grupo.');

  const ids = identificadores(p);
  if (ids.some(i => idsDoBot(client).includes(i))) return reply('❌ Não vou me rebaixar. 😅');
  if (ids.includes(soDigitos(OWNER_NUMBER)) && !isOwner(ctx.sender)) {
    return reply('❌ Não posso rebaixar o dono do bot.');
  }

  try {
    await client.groupParticipantsUpdate(msg.key.remoteJid, [p.id], 'demote');
    return reply(
      `⬇️ *ADMIN REBAIXADO*\n\n👤 @${p.id.split('@')[0]} não é mais administrador.`,
      { mentions: [p.id] }
    );
  } catch (e) {
    return reply('❌ Não consegui rebaixar. Verifique se sou admin do grupo.');
  }
}

export async function executeApagar(ctx) {
  const { reply, client, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const info = infoContexto(msg);
  if (!info?.stanzaId) {
    return reply(`🗑️ *APAGAR MENSAGEM*\n\nResponda à mensagem que deseja apagar com ${PREFIX}apagar`);
  }

  const jid = msg.key.remoteJid;
  const autor = info.participant || '';
  const ehDoBot = idsDoBot(client).includes(soDigitos(autor));

  try {
    await client.sendMessage(jid, {
      delete: { remoteJid: jid, fromMe: ehDoBot, id: info.stanzaId, participant: autor }
    });
  } catch (e) {
    return reply('❌ Não consegui apagar. Verifique se sou admin do grupo.');
  }

  // Apaga também o comando para não poluir o grupo
  try { await client.sendMessage(jid, { delete: msg.key }); } catch (e) {}
  return null;
}

// Evita marcar todos em sequência (spam de notificação)
const ultimaMarcacao = new Map();
const INTERVALO_MARCACAO = 20 * 1000;

function limiteMarcacao(grupoJid) {
  const agora = Date.now();
  const restante = INTERVALO_MARCACAO - (agora - (ultimaMarcacao.get(grupoJid) || 0));
  if (restante > 0) return Math.ceil(restante / 1000);
  ultimaMarcacao.set(grupoJid, agora);
  return 0;
}

// /todos <mensagem> → lista visível com @ de todo mundo
export async function executeTodos(ctx) {
  const { reply, client, msg, groupMetadata } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const jid = msg.key.remoteJid;
  const membros = (groupMetadata?.participants || []).map(p => p.id);
  if (membros.length === 0) return reply('❌ Não consegui obter a lista de membros.');

  const espera = limiteMarcacao(jid);
  if (espera) return reply(`⏳ Aguarde *${espera}s* para marcar todos de novo.`);

  const texto = textoDoComando(msg) || 'Atenção, pessoal!';
  const lista = membros.map(m => `@${m.split('@')[0]}`).join(' ');

  await client.sendMessage(jid, {
    text: `📢 *ATENÇÃO, GALERA!*\n\n${texto}\n\n${lista}`,
    mentions: membros
  }, { quoted: msg });
  return null;
}

// /hidetag <mensagem> → só o texto aparece, mas todos são notificados
export async function executeHidetag(ctx) {
  const { reply, client, msg, groupMetadata } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const jid = msg.key.remoteJid;
  const membros = (groupMetadata?.participants || []).map(p => p.id);
  if (membros.length === 0) return reply('❌ Não consegui obter a lista de membros.');

  const texto = textoDoComando(msg);
  if (!texto) {
    return reply(
      `👻 *HIDETAG*\n\n` +
      `Use: ${PREFIX}hidetag <mensagem>\n` +
      `Ou responda a uma mensagem com ${PREFIX}hidetag\n\n` +
      `Todos são notificados, mas as marcações ficam escondidas.`
    );
  }

  const espera = limiteMarcacao(jid);
  if (espera) return reply(`⏳ Aguarde *${espera}s* para marcar todos de novo.`);

  await client.sendMessage(jid, { text: texto, mentions: membros });
  return null;
}
