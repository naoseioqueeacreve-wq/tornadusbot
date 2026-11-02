import { PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import { setAntiPV, isAntiPVAtivo } from '../functions/antipv.js';

export async function executeAntiPV(ctx) {
  const { reply, sender, args } = ctx;

  if (!isOwner(sender)) {
    return reply('❌ Apenas o dono do bot pode usar este comando!');
  }

  const sub = (args[0] || '').toLowerCase();

  if (sub === 'on' || sub === 'ativar' || sub === 'ligar') {
    if (isAntiPVAtivo()) {
      return reply('⚠️ O sistema *Anti-PV* já está ATIVADO.');
    }
    setAntiPV(true);
    return reply(
      `🛡️ *ANTI-PV ATIVADO*\n\n` +
      `✅ Agora, qualquer pessoa que mandar mensagem no privado do bot será *bloqueada* automaticamente.\n\n` +
      `⚠️ Você (dono) não será bloqueado.`
    );
  }

  if (sub === 'off' || sub === 'desativar' || sub === 'desligar') {
    if (!isAntiPVAtivo()) {
      return reply('⚠️ O sistema *Anti-PV* já está DESATIVADO.');
    }
    setAntiPV(false);
    return reply(
      `🔓 *ANTI-PV DESATIVADO*\n\n` +
      `✅ O bot voltou a responder mensagens no privado normalmente.`
    );
  }

  // Status / Ajuda
  const status = isAntiPVAtivo() ? '🟢 ATIVADO' : '🔴 DESATIVADO';

  return reply(
    `🛡️ *SISTEMA ANTI-PV*\n\n` +
    `📌 Status atual: ${status}\n\n` +
    `*Como usar:*\n` +
    `▸ ${PREFIX}antipv on → Ativar proteção\n` +
    `▸ ${PREFIX}antipv off → Desativar proteção\n\n` +
    `💡 Quando ativado, o bot bloqueia quem chamar no PV.`
  );
}
