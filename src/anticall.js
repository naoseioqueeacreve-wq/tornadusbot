import { PREFIX } from '../config.js';
import { isOwner, isAdmin } from '../functions/permissions.js';
import { getGrupo, salvarGrupo } from '../functions/adminDB.js';

export async function executeAntiCall(ctx) {
  const { reply, sender, groupMetadata, args, isGroup } = ctx;

  if (!isGroup) {
    return reply('❌ Este comando só pode ser usado em grupos!');
  }

  if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) {
    return reply('❌ Apenas administradores ou o dono podem usar este comando.');
  }

  const acao = args[0]?.toLowerCase();

  if (!acao) {
    return reply(
      `📞 *SISTEMA ANTI-CALL*\n\n` +
      `Use este comando para remover quem iniciar chamadas de voz/vídeo no grupo.\n\n` +
      `*Como usar:*\n` +
      `▸ ${PREFIX}anticall on → Ativar\n` +
      `▸ ${PREFIX}anticall off → Desativar`
    );
  }

  const configGP = getGrupo(ctx.msg.key.remoteJid);
  const statusAtual = configGP.antiCall === true;

  if (acao === 'on' || acao === '1' || acao === 'ativar') {
    if (statusAtual) {
      return reply('⚠️ O *Anti-Call* já está ativado neste grupo.');
    }
    
    configGP.antiCall = true;
    salvarGrupo(ctx.msg.key.remoteJid, configGP);

    return reply(
      `✅ *ANTI-CALL ATIVADO*\n\n` +
      `🛡️ A partir de agora, qualquer membro (que não seja admin) que iniciar uma chamada será *removido automaticamente*.`
    );
  }

  if (acao === 'off' || acao === '0' || acao === 'desativar') {
    if (!statusAtual) {
      return reply('⚠️ O *Anti-Call* já está desativado neste grupo.');
    }

    configGP.antiCall = false;
    salvarGrupo(ctx.msg.key.remoteJid, configGP);

    return reply(
      `🔓 *ANTI-CALL DESATIVADO*\n\n` +
      `✅ Os membros agora podem fazer chamadas sem serem removidos.`
    );
  }

  return reply('❌ Opção inválida! Use *on* ou *off*.');
}
