import { toggleLevelMsg, getLevelUser, CARGOS_LEVEL } from '../functions/levelDB.js';
import { isAdmin, isOwner } from '../functions/permissions.js';

// =========================================
// COMANDO: !levelmsg on/off (ADM)
// =========================================
export async function executeLevelMsg(ctx) {
  const { reply, msg, q, isGroup, sender, groupMetadata } = ctx;
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) return reply('❌ Apenas administradores.');

  const arg = q.trim().toLowerCase();
  const jid = msg.key.remoteJid;

  if (arg === 'on') {
    toggleLevelMsg(jid, true);
    return reply('✅ *LEVEL MSG ATIVADO*\n\nO bot agora vai contar as mensagens e avisar quando o pessoal subir de nível!');
  }
  if (arg === 'off') {
    toggleLevelMsg(jid, false);
    return reply('🔕 *LEVEL MSG DESATIVADO*\n\nO bot não vai mais contar as mensagens.');
  }

  return reply(`⚙️ *CONFIGURAR LEVEL MSG*\n\nUse:\n!levelmsg on\n!levelmsg off`);
}

// =========================================
// COMANDO: !meulevel (Membros)
// =========================================
export async function executeMeuLevel(ctx) {
  const { reply, sender, pushName } = ctx;
  const data = getLevelUser(sender);

  return reply(
    `🏅 *PERFIL DE ATIVIDADE*\n\n` +
    `👤 Nome: *${pushName}*\n` +
    `📊 Nível: *${data.nivel}/15*\n` +
    `👑 Cargo: *${data.cargo}*\n` +
    `✨ XP: *${data.xp}/${data.xpProximo}*\n\n` +
    `_Continue conversando para subir de nível!_`
  );
}
