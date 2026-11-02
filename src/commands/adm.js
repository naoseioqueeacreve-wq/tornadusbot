import { isAdmin, isOwner } from '../functions/permissions.js';
import {
  getModoParceria,
  setModoParceria,
  adicionarParceria,
  removerParceria,
  listarParceiros
} from '../functions/parceria.js';

// =========================================
// FUNÇÃO AUXILIAR: Verifica se é ADM ou dono
// =========================================
function temPermissao(ctx) {
  const { sender, groupMetadata } = ctx;
  return isAdmin(sender, groupMetadata) || isOwner(sender);
}

// =========================================
// COMANDO: !modoparceria on/off
// =========================================
export async function executeModoParceria(ctx) {
  const { reply, sender, msg, q, isGroup } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem usar este comando.');

  const grupoJid = msg.key.remoteJid;
  const arg = q.trim().toLowerCase();
  const estadoAtual = getModoParceria(grupoJid);

  if (arg === 'on') {
    setModoParceria(grupoJid, true);
    return reply(
      `✅ *MODO PARCERIA ATIVADO*\n\n` +
      `🔒 A partir de agora, apenas membros com parceria podem enviar links de grupos.\n\n` +
      `💡 Para liberar alguém: !addparceria @pessoa <limite>`
    );
  }

  if (arg === 'off') {
    setModoParceria(grupoJid, false);
    return reply('🔓 *MODO PARCERIA DESATIVADO*\n\nAgora todos podem enviar links de grupos.');
  }

  return reply(
    `⚙️ *MODO PARCERIA*\n\n` +
    `Status atual: ${estadoAtual ? '🔒 ATIVADO' : '🔓 DESATIVADO'}\n\n` +
    `Use:\n` +
    `• !modoparceria on — Ativar\n` +
    `• !modoparceria off — Desativar`
  );
}

// =========================================
// COMANDO: !addparceria @pessoa <limite>
// =========================================
export async function executeAddParceria(ctx) {
  const { reply, sender, msg, q, isGroup } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem usar este comando.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply(
      `📋 *COMO USAR:*\n\n` +
      `!addparceria @pessoa <limite por dia>\n\n` +
      `💡 Exemplo: !addparceria @joao 5\n` +
      `Isso significa: João pode enviar 5 links de grupo por dia.`
    );
  }

  const alvo = mentions[0];
  const partes = q.trim().split(/\s+/);
  const limite = parseInt(partes[1]);

  if (!limite || limite <= 0) {
    return reply('❌ Você precisa definir um limite por dia (número maior que 0).');
  }

  const grupoJid = msg.key.remoteJid;
  adicionarParceria(grupoJid, alvo, limite);

  return reply(
    `✅ *PARCERIA ADICIONADA*\n\n` +
    `👤 Usuário: @${alvo.split('@')[0]}\n` +
    `📊 Limite por dia: ${limite} link(s)\n\n` +
    `Agora essa pessoa pode enviar links de grupos.`,
    { mentions: [alvo] }
  );
}

// =========================================
// COMANDO: !delparceria @pessoa
// =========================================
export async function executeDelParceria(ctx) {
  const { reply, msg, isGroup } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem usar este comando.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply('❌ Marque a pessoa! Exemplo: !delparceria @joao');
  }

  const alvo = mentions[0];
  const grupoJid = msg.key.remoteJid;

  const removido = removerParceria(grupoJid, alvo);

  if (!removido) {
    return reply(`❌ @${alvo.split('@')[0]} não tem parceria neste grupo.`, { mentions: [alvo] });
  }

  return reply(
    `🗑️ *PARCERIA REMOVIDA*\n\n` +
    `👤 Usuário: @${alvo.split('@')[0]}`,
    { mentions: [alvo] }
  );
}

// =========================================
// COMANDO: !lista-parceria
// =========================================
export async function executeListaParceria(ctx) {
  const { reply, msg, isGroup } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem usar este comando.');

  const grupoJid = msg.key.remoteJid;
  const lista = listarParceiros(grupoJid);
  const modoAtivo = getModoParceria(grupoJid);

  if (lista.length === 0) {
    return reply(
      `📋 *LISTA DE PARCERIAS*\n\n` +
      `🔒 Modo parceria: ${modoAtivo ? 'ATIVADO' : 'DESATIVADO'}\n\n` +
      `❌ Nenhum parceiro cadastrado neste grupo.\n\n` +
      `💡 Use: !addparceria @pessoa <limite>`
    );
  }

  let texto = `📋 *LISTA DE PARCERIAS*\n\n`;
  texto += `🔒 Modo parceria: ${modoAtivo ? 'ATIVADO' : 'DESATIVADO'}\n\n`;

  lista.forEach((p, i) => {
    texto += `${i + 1}. @${p.jid.split('@')[0]}\n`;
    texto += `   📊 Enviados hoje: ${p.usadoHoje}/${p.limite}\n\n`;
  });

  return reply(texto, { mentions: lista.map(p => p.jid) });
}

// =========================================
// COMANDO: !ban @pessoa
// =========================================
export async function executeBan(ctx) {
  const { reply, client, msg, isGroup, groupMetadata } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem usar este comando.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply('❌ Marque a pessoa! Exemplo: !ban @joao');
  }

  const alvo = mentions[0];
  const grupoJid = msg.key.remoteJid;

  // Verifica se o alvo é admin
  const alvoAdmin = groupMetadata.participants.find(p => p.id === alvo);
  if (alvoAdmin?.admin) {
    return reply('❌ Não posso banir um administrador do grupo.');
  }

  // Verifica se o alvo é o dono
  if (isOwner(alvo)) {
    return reply('❌ Não posso banir o dono do bot.');
  }

  try {
    await client.groupParticipantsUpdate(grupoJid, [alvo], 'remove');

    return reply(
      `🚫 *BANIDO*\n\n` +
      `👤 Usuário: @${alvo.split('@')[0]}\n` +
      `📌 Removido do grupo.`,
      { mentions: [alvo] }
    );
  } catch (error) {
    console.error('[BAN] Erro:', error.message);
    return reply('❌ Erro ao remover. Verifique se eu sou administrador do grupo.');
  }
}

// =========================================
// COMANDO: !setfotogp
// =========================================
export async function executeSetFotoGP(ctx) {
  const { reply, client, msg, isGroup } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem usar este comando.');

  const grupoJid = msg.key.remoteJid;

  // Verifica se tem foto marcada
  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imageMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;

  if (!imageMsg) {
    return reply(
      `🖼️ *COMO USAR:*\n\n` +
      `1. Envie uma foto\n` +
      `2. Marque a foto\n` +
      `3. Digite: !setfotogp\n\n` +
      `💡 A foto será definida como foto do grupo.`
    );
  }

  try {
    const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
    const stream = await downloadContentFromMessage(imageMsg, 'image');

    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    await client.updateProfilePicture(grupoJid, buffer);

    return reply('✅ *FOTO DO GRUPO ALTERADA!*');
  } catch (error) {
    console.error('[SETFOTOGP] Erro:', error.message);
    return reply('❌ Erro ao alterar. Verifique se eu sou administrador do grupo.');
  }
}

// =========================================
// COMANDO: !setnomegp <nome>
// =========================================
export async function executeSetNomeGP(ctx) {
  const { reply, client, msg, isGroup, q } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem usar este comando.');

  if (!q.trim()) {
    return reply('❌ Use: !setnomegp <nome do grupo>\nExemplo: !setnomegp Família 2025');
  }

  const grupoJid = msg.key.remoteJid;
  const novoNome = q.trim();

  try {
    await client.groupUpdateSubject(grupoJid, novoNome);
    return reply(`✅ *NOME DO GRUPO ALTERADO!*\n\n📌 Novo nome: *${novoNome}*`);
  } catch (error) {
    console.error('[SETNOMEGP] Erro:', error.message);
    return reply('❌ Erro ao alterar. Verifique se eu sou administrador do grupo.');
  }
}
