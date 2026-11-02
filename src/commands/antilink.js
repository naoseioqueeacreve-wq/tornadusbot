import { PREFIX } from '../config.js';
import { isOwner, isAdmin } from '../functions/permissions.js';
import { getGrupo, salvarGrupo } from '../functions/adminDB.js';

export async function executeAntiLink(ctx) {
  const { reply, sender, groupMetadata, args, isGroup, msg } = ctx;

  if (!isGroup) {
    return reply('❌ Este comando só pode ser usado em grupos!');
  }

  if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) {
    return reply('❌ Apenas administradores ou o dono podem usar este comando.');
  }

  const acao = args[0]?.toLowerCase();
  const configGP = getGrupo(msg.key.remoteJid);

  // Se não digitar nada, mostra o menu de ajuda
  if (!acao) {
    return reply(
      `🔗 *SISTEMA ANTI-LINK*\n\n` +
      `Use este comando para proibir o envio de links no grupo.\n\n` +
      `*Como usar:*\n` +
      `▸ ${PREFIX}antilink on → Ativar\n` +
      `▸ ${PREFIX}antilink off → Desativar`
    );
  }

  const isOn = ['on', '1', 'ativar', 'ligar'].includes(acao);
  const isOff = ['off', '0', 'desativar', 'desligar'].includes(acao);

  if (!isOn && !isOff) {
    return reply('❌ Opção inválida! Use *on* ou *off*.');
  }

  // Lógica para Ativar
  if (isOn) {
    if (configGP.antiLink === true) {
      return reply('⚠️ O *Anti-Link* já está ativado neste grupo.');
    }
    
    configGP.antiLink = true;
    salvarGrupo(msg.key.remoteJid, configGP);

    return reply(
      `✅ *ANTI-LINK ATIVADO*\n\n` +
      `🛡️ A partir de agora, qualquer link enviado por membros comuns será *deletado automaticamente*.\n\n` +
      `👑 Administradores e o Dono não são afetados.`
    );
  }

  // Lógica para Desativar
  if (isOff) {
    if (configGP.antiLink === false) {
      return reply('⚠️ O *Anti-Link* já está desativado neste grupo.');
    }

    configGP.antiLink = false;
    salvarGrupo(msg.key.remoteJid, configGP);

    return reply(
      `🔓 *ANTI-LINK DESATIVADO*\n\n` +
      `✅ Os membros agora podem enviar links livremente.`
    );
  }
}
