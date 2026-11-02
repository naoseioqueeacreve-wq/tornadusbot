import { PREFIX } from '../config.js';
import { isOwner, isAdmin } from '../functions/permissions.js';
import { isVIP } from '../functions/vipDB.js';
import { setReligiao, getReligiao } from '../functions/religiaoDB.js';

export async function executeReligiao(ctx) {
  const { sender, pushName, reply, q, isGroup, groupMetadata } = ctx;
  const numero = sender.split('@')[0].split(':')[0];

  // 1. Se a pessoa digitou algo, salva a religião
  if (q && q.trim().length > 0) {
    const religiao = q.trim();
    setReligiao(sender, religiao);
    return reply(
      `🕊️ *RELIGIÃO REGISTRADA*\n\n` +
      `Sua religião foi atualizada para: *${religiao}*.\n\n` +
      `💡 Use *${PREFIX}religiao* (sem texto) para ver seu perfil completo.`
    );
  }

  // 2. Se não digitou nada, mostra o perfil
  const religiaoSalva = getReligiao(sender) || 'Não informada';
  const ehDono = isOwner(sender);
  const ehAdm = isGroup ? isAdmin(sender, groupMetadata) : false;
  const ehVip = isVIP(sender);

  // Pega a hora e data exatas de Brasília
  const agora = new Date();
  const horaBrasilia = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const dataBrasilia = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const texto = `╭━━━━━━━〔 🕊️ 𝐏𝐄𝐑𝐅𝐈𝐋 𝐑𝐄𝐋𝐈𝐆𝐈𝐎𝐒𝐎 🕊️ 〕━━━━━━━╮\n` +
    `│\n` +
    `│  🙏 *A paz de Cristo, ${pushName}!*\n` +
    `│\n` +
    `│  👤 *Nome*: ${pushName}\n` +
    `│  📱 *Número*: ${numero}\n` +
    `│  📖 *Religião*: ${religiaoSalva}\n` +
    `│\n` +
    `│  💎 *VIP*: ${ehVip ? 'Sim ✅' : 'Não ❌'}\n` +
    `│  🛡️ *ADM*: ${ehAdm ? 'Sim ✅' : 'Não ❌'}\n` +
    `│  👑 *Dono*: ${ehDono ? 'Sim ✅' : 'Não ❌'}\n` +
    `│\n` +
    `│  ⏰ *Hora (Brasília)*: ${horaBrasilia}\n` +
    `│  📅 *Data*: ${dataBrasilia}\n` +
    `│\n` +
    `│  💡 _Para mudar sua religião, envie:_\n` +
    `│  _${PREFIX}religiao [sua religião]_\n` +
    `│\n` +
    `╰━━━━━━━〔 ✝️ Deus abençoe ✝️ 〕━━━━━━━╯`;

  return reply(texto);
}
