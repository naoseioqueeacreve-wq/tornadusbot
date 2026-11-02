import { PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import { addVIP, addVIPCommand, removeVIPCommand } from '../functions/vipDB.js';

// =========================================
// COMANDO: /addvip @user <dias> OU /addvip <numero> <dias>
// =========================================
export async function executeAddVIP(ctx) {
  const { reply, sender, msg, args } = ctx;

  if (!isOwner(sender)) {
    return reply('❌ Apenas o *DONO* do bot pode adicionar usuários VIP.');
  }

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  let alvo = null;
  let dias = 0;

  if (mentions.length > 0) {
    // Opção 1: Usou marcação (@pessoa)
    alvo = mentions[0];
    const diasStr = args.find(a => /^\d+$/.test(a)); // Pega o primeiro número puro
    dias = parseInt(diasStr);
  } else if (args.length >= 2) {
    // Opção 2: Digitou o número na mão (ex: 5511971647936)
    const numeroDigitado = args[0].replace(/\D/g, '');
    if (numeroDigitado.length >= 10) {
      alvo = numeroDigitado + '@s.whatsapp.net';
      dias = parseInt(args[1]);
    }
  }

  if (!alvo) {
    return reply(`👑 *COMO USAR:*\n\nMarcando: ${PREFIX}addvip @user 30\nDigitando: ${PREFIX}addvip 5511999999999 30`);
  }

  if (!dias || dias <= 0) {
    return reply('❌ Informe a quantidade de dias válida.\nEx: /addvip 5511999999999 30');
  }

  const expiracao = addVIP(alvo, dias);
  const dataFormatada = new Date(expiracao).toLocaleDateString('pt-BR');
  
  // Pega apenas o número formatado para exibir
  const numeroExibir = alvo.split('@')[0];

  return reply(
    `👑 *NOVO VIP ADICIONADO*\n\n` +
    `👤 Usuário: *${numeroExibir}*\n` +
    `⏳ Dias adicionados: *${dias}*\n` +
    `📅 Expira em: *${dataFormatada}*\n\n` +
    `✨ Ele agora tem acesso aos comandos VIP!`,
    { mentions: [alvo] }
  );
}

// =========================================
// COMANDO: /addcmdvip <comando>
// =========================================
export async function executeAddCmdVIP(ctx) {
  const { reply, sender, args } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o *DONO* do bot pode adicionar comandos VIP.');

  const comandoStr = args[0];
  if (!comandoStr) {
    return reply(`👑 Use: ${PREFIX}addcmdvip <comando>\nExemplo: ${PREFIX}addcmdvip brat`);
  }

  if (addVIPCommand(comandoStr)) {
    return reply(
      `✅ *COMANDO ADICIONADO AO VIP*\n\n` +
      `O comando *${comandoStr}* agora é exclusivo para VIPs.\n` +
      `Ele foi removido dos menus normais e adicionado ao /menuvip.`
    );
  } else {
    return reply(`⚠️ O comando *${comandoStr}* já está na lista VIP.`);
  }
}

// =========================================
// COMANDO: /rmcmdvip <comando>
// =========================================
export async function executeRmCmdVIP(ctx) {
  const { reply, sender, args } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o *DONO* do bot pode remover comandos VIP.');

  const comandoStr = args[0];
  if (!comandoStr) return reply(`👑 Use: ${PREFIX}rmcmdvip <comando>`);

  if (removeVIPCommand(comandoStr)) {
    return reply(`✅ O comando *${comandoStr}* voltou a ser público.`);
  } else {
    return reply(`⚠️ O comando *${comandoStr}* não estava na lista VIP.`);
  }
}
