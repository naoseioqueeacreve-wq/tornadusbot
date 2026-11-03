import { isAdmin, isOwner } from '../functions/permissions.js';
import {
  getGrupo,
  setAntiPalavrao,
  addPalavra,
  delPalavra,
  setBemVindo,
  setLegendaBV,
  setFotoBV,
  setBotSoAdmins,
  setAntiFake,
  setAntiBot, // <-- IMPORT ADICIONADO AQUI
  mutarUsuario,
  desmutarUsuario,
  adicionarWarn,
  removerWarn,
  limparWarns,
  getWarns,
  listarWarns
} from '../functions/adminDB.js';
import fs from 'node:fs';
import path from 'node:path';

function temPermissao(ctx) {
  const { sender, groupMetadata } = ctx;
  return isAdmin(sender, groupMetadata) || isOwner(sender);
}

// =========================================
// COMANDO: !antibot on/off
// =========================================
export async function executeAntiBot(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const arg = q.trim().toLowerCase();
  const jid = msg.key.remoteJid;

  if (arg === 'on') {
    setAntiBot(jid, true);
    return reply('🚩 *ANTIBOT ATIVADO*\n\nO bot agora vai remover outros bots que mandarem mensagem aqui.');
  }
  if (arg === 'off') {
    setAntiBot(jid, false);
    return reply('🔕 *ANTIBOT DESATIVADO*\n\nO bot não vai mais remover outros bots.');
  }

  const g = getGrupo(jid);
  return reply(
    `⚙️ *CONFIGURAR ANTIBOT*\n\n` +
    `Status atual: ${g.antiBot ? '✅ ATIVADO' : '❌ DESATIVADO'}\n\n` +
    `Use:\n*/antibot on* - Para ativar\n*/antibot off* - Para desativar`
  );
}

// =========================================
// ANTI-PALAVRÃO
// =========================================
export async function executeAntiPalavrao(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const arg = q.trim().toLowerCase();
  const jid = msg.key.remoteJid;

  if (arg === 'on') {
    setAntiPalavrao(jid, true);
    return reply('✅ *ANTI-PALAVRÃO ATIVADO*');
  }
  if (arg === 'off') {
    setAntiPalavrao(jid, false);
    return reply('🔓 *ANTI-PALAVRÃO DESATIVADO*');
  }

  const g = getGrupo(jid);
  return reply(
    `⚙️ *ANTI-PALAVRÃO*\n\n` +
    `Status: ${g.antiPalavrao ? '🔒 ATIVADO' : '🔓 DESATIVADO'}\n` +
    `Palavras: ${g.palavrasProibidas.length}`
  );
}

export async function executeAddPalavra(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');
  if (!q.trim()) return reply('❌ Use: !addpalavra <palavra>');

  const add = addPalavra(msg.key.remoteJid, q.trim());
  return reply(add ? `✅ Palavra *${q.trim()}* adicionada.` : `⚠️ Já está na lista.`);
}

export async function executeDelPalavra(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');
  if (!q.trim()) return reply('❌ Use: !delpalavra <palavra>');

  const del = delPalavra(msg.key.remoteJid, q.trim());
  return reply(del ? `🗑️ Palavra *${q.trim()}* removida.` : `⚠️ Não está na lista.`);
}

export async function executeListaPalavras(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const g = getGrupo(msg.key.remoteJid);
  if (g.palavrasProibidas.length === 0) return reply('📋 Lista vazia.');

  let texto = `📋 *PALAVRAS PROIBIDAS*\n\n`;
  g.palavrasProibidas.forEach((p, i) => { texto += `${i + 1}. ${p}\n`; });
  return reply(texto);
}

// =========================================
// BEM-VINDO
// =========================================
export async function executeBemVindo(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const arg = q.trim().toLowerCase();
  const jid = msg.key.remoteJid;

  if (arg === 'on') {
    setBemVindo(jid, true);
    return reply('✅ *BEM-VINDO ATIVADO*');
  }
  if (arg === 'off') {
    setBemVindo(jid, false);
    return reply('🔓 *BEM-VINDO DESATIVADO*');
  }

  const g = getGrupo(jid);
  return reply(
    `⚙️ *BEM-VINDO*\n\n` +
    `Status: ${g.bemVindo ? '✅ ATIVADO' : '❌ DESATIVADO'}\n` +
    `Legenda: ${g.legendaBV}`
  );
}

export async function executeSetLegenda(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');
  if (!q.trim()) return reply(`❌ Use: !setlegenda <texto>\n💡 {nome} e {grupo}`);

  setLegendaBV(msg.key.remoteJid, q.trim());
  return reply(`✅ Legenda definida.`);
}

export async function executeSetFotoBV(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const img = quoted?.imageMessage || msg.message?.imageMessage;

  if (!img) return reply('❌ Marque uma foto com o comando.');

  try {
    const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
    const stream = await downloadContentFromMessage(img, 'image');

    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const dir = './src/assets/bemvindo';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const caminho = path.join(dir, `${msg.key.remoteJid.replace(/[^0-9]/g, '')}.jpg`);
    fs.writeFileSync(caminho, buffer);
    setFotoBV(msg.key.remoteJid, caminho);

    return reply('✅ Foto de boas-vindas definida!');
  } catch (e) {
    return reply('❌ Erro ao salvar a foto.');
  }
}

// =========================================
// ABRIR / FECHAR
// =========================================
export async function executeAbrir(ctx) {
  const { reply, client, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  try {
    await client.groupSettingUpdate(msg.key.remoteJid, 'not_announcement');
    return reply('🔓 *GRUPO ABERTO*');
  } catch (e) {
    return reply('❌ Erro. Verifique se sou admin.');
  }
}

export async function executeFechar(ctx) {
  const { reply, client, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  try {
    await client.groupSettingUpdate(msg.key.remoteJid, 'announcement');
    return reply('🔒 *GRUPO FECHADO*');
  } catch (e) {
    return reply('❌ Erro. Verifique se sou admin.');
  }
}

// =========================================
// CHAMAR ADMINS
// =========================================
export async function executeChamarAdmins(ctx) {
  const { reply, isGroup, groupMetadata, pushName } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');

  const admins = groupMetadata.participants
    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
    .map(p => p.id);

  if (admins.length === 0) return reply('❌ Nenhum admin.');

  const mentionsTexto = admins.map(a => `@${a.split('@')[0]}`).join(' ');
  return reply(
    `🚨 *CHAMANDO ADMINS*\n\n👤 Por: ${pushName}\n📣 ${mentionsTexto}`,
    { mentions: admins }
  );
}

// =========================================
// MUTE
// =========================================
export async function executeMute(ctx) {
  const { reply, msg, isGroup, groupMetadata } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply('❌ Marque alguém! Ex: !mute @user');

  const alvo = mentions[0];
  const participante = groupMetadata.participants.find(p => p.id === alvo);

  if (participante?.admin) return reply('❌ Não posso mutar um admin.');
  if (isOwner(alvo)) return reply('❌ Não posso mutar o dono do bot.');

  mutarUsuario(msg.key.remoteJid, alvo);
  return reply(
    `🔇 *USUÁRIO MUTADO*\n\n👤 @${alvo.split('@')[0]}\n⚠️ Comandos = BAN.`,
    { mentions: [alvo] }
  );
}

export async function executeDesmute(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply('❌ Marque alguém! Ex: !desmute @user');

  const alvo = mentions[0];
  desmutarUsuario(msg.key.remoteJid, alvo);
  return reply(`🔊 @${alvo.split('@')[0]} desmutado.`, { mentions: [alvo] });
}

// =========================================
// SORTEIO
// =========================================
export const sorteiosAtivos = {};

export async function executeSorteio(ctx) {
  const { reply, msg, q, isGroup, sender } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const jid = msg.key.remoteJid;

  if (q.trim().toLowerCase() === 'entrar') {
    if (!sorteiosAtivos[jid]) return reply('❌ Nenhum sorteio ativo.');
    if (sorteiosAtivos[jid].participantes.includes(sender)) {
      return reply('⚠️ Já está participando!');
    }
    sorteiosAtivos[jid].participantes.push(sender);
    return reply(`✅ Entrou! Total: ${sorteiosAtivos[jid].participantes.length}`);
  }

  if (q.trim().toLowerCase() === 'sortear') {
    if (!sorteiosAtivos[jid]) return reply('❌ Nenhum sorteio ativo.');
    const lista = sorteiosAtivos[jid].participantes;
    if (lista.length === 0) return reply('❌ Ninguém participou.');

    const vencedor = lista[Math.floor(Math.random() * lista.length)];
    const premio = sorteiosAtivos[jid].premio;
    delete sorteiosAtivos[jid];

    return reply(
      `🎉 *SORTEIO FINALIZADO!*\n\n🎁 ${premio}\n🏆 @${vencedor.split('@')[0]}`,
      { mentions: [vencedor] }
    );
  }

  if (!q.trim()) return reply(`❌ Use: !sorteio <prêmio>`);

  sorteiosAtivos[jid] = { premio: q.trim(), participantes: [], criadoPor: sender };
  return reply(
    `🎉 *SORTEIO INICIADO!*\n\n🎁 Prêmio: ${q.trim()}\n💡 !sorteio entrar\n🎯 !sorteio sortear`
  );
}

// =========================================
// BOT SÓ ADMINS
// =========================================
export async function executeBotAdm(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const arg = q.trim().toLowerCase();
  const jid = msg.key.remoteJid;

  if (arg === 'on') {
    setBotSoAdmins(jid, true);
    return reply('🔒 *BOT SÓ PARA ADMINS ATIVADO*');
  }
  if (arg === 'off') {
    setBotSoAdmins(jid, false);
    return reply('🔓 *BOT LIBERADO*');
  }

  const g = getGrupo(jid);
  return reply(`⚙️ Status: ${g.botSoAdmins ? '🔒 ATIVADO' : '🔓 DESATIVADO'}`);
}

// =========================================
// ANTI-FAKE
// =========================================
export async function executeAntiFake(ctx) {
  const { reply, msg, q, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const arg = q.trim().toLowerCase();
  const jid = msg.key.remoteJid;

  if (arg === 'on') {
    setAntiFake(jid, true);
    return reply('✅ *ANTI-FAKE ATIVADO*');
  }
  if (arg === 'off') {
    setAntiFake(jid, false);
    return reply('🔓 *ANTI-FAKE DESATIVADO*');
  }

  const g = getGrupo(jid);
  return reply(`⚙️ Status: ${g.antiFake ? '✅ ATIVADO' : '❌ DESATIVADO'}`);
}

// =========================================
// ADVERTÊNCIAS (WARNS)
// =========================================
export async function executeAdvertir(ctx) {
  const { reply, client, msg, q, isGroup, groupMetadata, pushName } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply(`⚠️ Use: !advertir @user <motivo>`);
  }

  const alvo = mentions[0];
  const jid = msg.key.remoteJid;

  const participante = groupMetadata.participants.find(p => p.id === alvo);
  if (participante?.admin) return reply('❌ Não posso advertir um admin.');
  if (isOwner(alvo)) return reply('❌ Não posso advertir o dono do bot.');

  const motivo = q.replace(/@\d+/g, '').trim() || 'Sem motivo informado';

  const total = adicionarWarn(jid, alvo, motivo, pushName);
  const MAX_WARNS = 3;
  const restantes = MAX_WARNS - total;

  if (total >= MAX_WARNS) {
    try {
      await client.groupParticipantsUpdate(jid, [alvo], 'remove');
      limparWarns(jid, alvo);

      return reply(
        `🚫 *BANIDO AUTOMATICAMENTE*\n\n` +
        `👤 @${alvo.split('@')[0]}\n` +
        `⚠️ Motivo: atingiu *${MAX_WARNS} advertências*\n\n` +
        `📋 Última advertência: _${motivo}_`,
        { mentions: [alvo] }
      );
    } catch (e) {
      return reply('❌ Erro ao banir. Verifique se sou admin.');
    }
  }

  return reply(
    `⚠️ *ADVERTÊNCIA APLICADA*\n\n` +
    `👤 Usuário: @${alvo.split('@')[0]}\n` +
    `📋 Motivo: _${motivo}_\n` +
    `📊 Advertências: *${total}/${MAX_WARNS}*\n` +
    `⏳ Faltam: *${restantes}* para ban\n\n` +
    `⚠️ Ao atingir 3, será banido automaticamente!`,
    { mentions: [alvo] }
  );
}

export async function executeRemoverWarn(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`❌ Use: !rmwarn @user`);

  const alvo = mentions[0];
  const jid = msg.key.remoteJid;

  const total = removerWarn(jid, alvo);

  if (total === 0) {
    return reply(`🗑️ *TODAS AS ADVERTÊNCIAS REMOVIDAS*\n\n👤 @${alvo.split('@')[0]}`, { mentions: [alvo] });
  }

  return reply(
    `✅ *ADVERTÊNCIA REMOVIDA*\n\n` +
    `👤 @${alvo.split('@')[0]}\n` +
    `📊 Restantes: *${total}/3*`,
    { mentions: [alvo] }
  );
}

export async function executeLimparWarns(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`❌ Use: !limparwarns @user`);

  const alvo = mentions[0];
  const limpou = limparWarns(msg.key.remoteJid, alvo);

  if (!limpou) return reply(`ℹ️ @${alvo.split('@')[0]} não tem advertências.`, { mentions: [alvo] });

  return reply(
    `🧹 *ADVERTÊNCIAS LIMPAS*\n\n👤 @${alvo.split('@')[0]}`,
    { mentions: [alvo] }
  );
}

export async function executeVerWarns(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const alvo = mentions[0] || ctx.sender;

  const warns = getWarns(msg.key.remoteJid, alvo);

  if (warns.length === 0) {
    return reply(`✅ @${alvo.split('@')[0]} não tem advertências.`, { mentions: [alvo] });
  }

  let texto = `⚠️ *ADVERTÊNCIAS DE @${alvo.split('@')[0]}*\n\n`;
  warns.forEach((w, i) => {
    texto += `*${i + 1}.* ${w.motivo}\n`;
    texto += `   👤 Por: ${w.por}\n`;
    texto += `   📅 ${new Date(w.em).toLocaleString('pt-BR')}\n\n`;
  });

  texto += `📊 Total: *${warns.length}/3*\n`;
  if (warns.length >= 3) texto += `🚫 *SERIA BANIDO!*`;

  return reply(texto, { mentions: [alvo] });
}

export async function executeListarWarns(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores.');

  const lista = listarWarns(msg.key.remoteJid);

  if (lista.length === 0) {
    return reply('✅ Nenhum membro tem advertências neste grupo!');
  }

  lista.sort((a, b) => b.quantidade - a.quantidade);

  let texto = `📋 *MEMBROS ADVERTIDOS*\n\n`;
  lista.forEach((l, i) => {
    texto += `${i + 1}. @${l.jid.split('@')[0]} — *${l.quantidade}/3* ⚠️\n`;
  });

  const mentions = lista.map(l => l.jid);
  return reply(texto, { mentions });
                                           }
