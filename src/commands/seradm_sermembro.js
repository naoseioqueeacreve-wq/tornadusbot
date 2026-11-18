import { isOwner, getRealSender } from '../functions/permissions.js';

export async function executeSerAdm(client, msg) {
  const jid = msg.key.remoteJid;
  const sender = getRealSender(msg);

  if (!jid.endsWith('@g.us'))
    return client.sendMessage(jid, { text: '❌ Este comando só funciona em grupos.' }, { quoted: msg });

  if (!isOwner(sender))
    return client.sendMessage(jid, { text: '🚫 Apenas o dono do bot pode usar este comando.' }, { quoted: msg });

  try {
    const meta = await client.groupMetadata(jid);
    const participante = meta.participants.find(p => p.id.split('@')[0].split(':')[0] === sender.split('@')[0].split(':')[0]);

    if (participante?.admin)
      return client.sendMessage(jid, { text: '✅ Você já é admin deste grupo.' }, { quoted: msg });

    await client.groupParticipantsUpdate(jid, [sender], 'promote');
    await client.sendMessage(jid, { text: '👑 *Você agora é ADMIN deste grupo!*' }, { quoted: msg });
  } catch (e) {
    console.log('[SERADM ERRO]', e.message);
    await client.sendMessage(jid, { text: `❌ Erro ao promover: ${e.message}\n\nVerifique se o bot é admin do grupo.` }, { quoted: msg });
  }
}

export async function executeSerMembro(client, msg) {
  const jid = msg.key.remoteJid;
  const sender = getRealSender(msg);

  if (!jid.endsWith('@g.us'))
    return client.sendMessage(jid, { text: '❌ Este comando só funciona em grupos.' }, { quoted: msg });

  if (!isOwner(sender))
    return client.sendMessage(jid, { text: '🚫 Apenas o dono do bot pode usar este comando.' }, { quoted: msg });

  try {
    const meta = await client.groupMetadata(jid);
    const participante = meta.participants.find(p => p.id.split('@')[0].split(':')[0] === sender.split('@')[0].split(':')[0]);

    if (!participante?.admin)
      return client.sendMessage(jid, { text: 'ℹ️ Você já é apenas membro deste grupo.' }, { quoted: msg });

    await client.groupParticipantsUpdate(jid, [sender], 'demote');
    await client.sendMessage(jid, { text: '👤 *Você agora é MEMBRO deste grupo.*' }, { quoted: msg });
  } catch (e) {
    console.log('[SERMEMBRO ERRO]', e.message);
    await client.sendMessage(jid, { text: `❌ Erro ao rebaixar: ${e.message}\n\nVerifique se o bot é admin do grupo.` }, { quoted: msg });
  }
}
