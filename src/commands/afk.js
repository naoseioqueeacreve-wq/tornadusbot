import { setAFK, getAFK, listarAFK, formatarTempoAFK } from '../functions/afkDB.js';

export async function executeAfk(ctx) {
  const { reply, sender, q, pushName, msg } = ctx;
  const motivo = q?.trim() || 'Sem motivo informado';
  const afkAtual = getAFK(sender);

  // 🔍 Tenta pegar o LID (@lid) e o número real direto da mensagem (Baileys v6+)
  // O WhatsApp envia no 'participantAlt' ou 'remoteJidAlt' o ID alternativo
  const senderAlt = 
    msg?.key?.participantAlt || 
    msg?.key?.remoteJidAlt || 
    msg?.key?.senderLid || 
    msg?.key?.senderPn || 
    null;

  // Salva o número real E o LID associado a ele
  setAFK(sender, motivo, senderAlt);

  if (afkAtual) {
    return reply(
      `📴 *AFK ATUALIZADO*\n\n` +
      `👤 *${pushName}*\n` +
      `📝 Novo motivo: ${motivo}\n` +
      `⏱️ Já estava ausente há: *${formatarTempoAFK(afkAtual.timestamp)}*\n\n` +
      `_Envie qualquer mensagem, figurinha ou foto para sair do AFK._`
    );
  }

  return reply(
    `📴 *MODO AFK ATIVADO*\n\n` +
    `👤 *${pushName}*\n` +
    `📝 Motivo: ${motivo}\n\n` +
    `💡 _Quando alguém te marcar ou responder sua mensagem, avisarei que você está ausente._\n\n` +
    `_Envie qualquer mensagem, figurinha ou foto para sair do AFK._`
  );
}

export async function executeAfkLista(ctx) {
  const { reply } = ctx;
  const lista = listarAFK();

  if (lista.length === 0) {
    return reply('📴 *NENHUM USUÁRIO AFK*\n\nTodos estão ativos no momento! 🎉');
  }

  // Remove duplicatas visuais (caso o mesmo usuário tenha salvado o número e o LID)
  const unicos = [];
  const timestamps = new Set();

  for (const u of lista) {
    if (!timestamps.has(u.timestamp)) {
      timestamps.add(u.timestamp);
      unicos.push(u);
    }
  }

  unicos.sort((a, b) => a.timestamp - b.timestamp);

  let texto = `📴 *LISTA AFK* (${unicos.length})\n\n`;
  const mentions = [];

  for (const u of unicos) {
    const num = u.jid.split('@')[0].split(':')[0];
    const tempo = formatarTempoAFK(u.timestamp);
    texto += `👤 @${num}\n`;
    texto += `📝 ${u.motivo}\n`;
    texto += `⏱️ Ausente há: *${tempo}*\n\n`;
    mentions.push(u.jid);
  }

  texto += `_💡 Envie msg/figurinha/foto para sair do AFK._`;

  return reply(texto.trim(), { mentions });
}
