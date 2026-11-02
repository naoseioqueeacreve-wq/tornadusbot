import { PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import {
  configurarHorarioOff,
  cancelarHorarioOff,
  getInfoHorarioOff,
  formatarTempo
} from '../functions/horarioOff.js';

// =========================================
// VALIDA FORMATO DE HORA "HH:MM"
// =========================================
function validarHora(horario) {
  const regex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!regex.test(horario)) return false;
  const [h, m] = horario.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// =========================================
// COMANDO PRINCIPAL: /horariooff
// =========================================
export async function executeHorarioOff(ctx) {
  const { reply, sender, args } = ctx;

  if (!isOwner(sender)) {
    return reply('❌ Apenas o dono do bot pode usar este comando!');
  }

  const sub = (args[0] || '').toLowerCase();

  // ---- SUBCOMANDO: ver / status ----
  if (sub === 'ver' || sub === 'status') {
    const info = getInfoHorarioOff();

    if (!info) {
      return reply(
        `✅ *SEM HORÁRIO OFF CONFIGURADO*\n\n` +
        `🟢 O bot está online 24h por dia.\n\n` +
        `💡 Use *${PREFIX}horariooff HH:MM HH:MM* para configurar.\n` +
        `📌 Exemplo: *${PREFIX}horariooff 15:00 15:30*`
      );
    }

    const status = info.emOffAgora
      ? `🔴 *EM HORÁRIO OFF AGORA*`
      : `🟢 *FORA DO HORÁRIO OFF*`;

    let proximaInfo = '';
    if (info.emOffAgora) {
      proximaInfo = `⏳ Termina em: *${formatarTempo(info.minutosParaTerminar)}*`;
    } else {
      proximaInfo = `⏰ Próximo off em: *${formatarTempo(info.minutosParaProximo)}*`;
    }

    return reply(
      `⏸️ *CONFIGURAÇÃO DE HORÁRIO OFF*\n\n` +
      `📅 Todos os dias:\n` +
      `🟥 Início: *${info.horaInicio}*\n` +
      `🟩 Fim: *${info.horaFim}*\n\n` +
      `${status}\n` +
      `${proximaInfo}\n\n` +
      `👑 Definido por: @${info.definidoPor?.split('@')[0] || 'Dono'}`,
      { mentions: info.definidoPor ? [info.definidoPor] : [] }
    );
  }

  // ---- SUBCOMANDO: cancelar ----
  if (sub === 'cancelar' || sub === 'parar' || sub === 'off') {
    const info = getInfoHorarioOff();
    if (!info) {
      return reply('❌ Não há nenhum horário off configurado no momento.');
    }
    cancelarHorarioOff();
    return reply(
      `✅ *HORÁRIO OFF DESATIVADO!*\n\n` +
      `🟢 O bot vai funcionar 24h por dia novamente.`
    );
  }

  // ---- SEM ARGUMENTOS: mostra ajuda ----
  if (!sub) {
    return reply(
      `⏸️ *SISTEMA DE HORÁRIO OFF*\n\n` +
      `Configure um horário fixo diário em que o bot vai "descansar" para evitar sobrecarga.\n` +
      `Durante o período, ele ignorará os comandos dos usuários.\n\n` +
      `*Como usar:*\n` +
      `▸ ${PREFIX}horariooff HH:MM HH:MM → Define o horário\n` +
      `▸ ${PREFIX}horariooff ver → Ver configuração\n` +
      `▸ ${PREFIX}horariooff cancelar → Desativa\n\n` +
      `*Regras:*\n` +
      `• Formato 24h (ex: 15:00, 23:30)\n` +
      `• Fuso horário: Brasília 🇧🇷\n` +
      `• Pode atravessar a meia-noite (ex: 23:00 → 02:00)\n\n` +
      `*Exemplos:*\n` +
      `▸ ${PREFIX}horariooff 15:00 15:30 (30 min)\n` +
      `▸ ${PREFIX}horariooff 02:00 06:00 (4 horas)\n` +
      `▸ ${PREFIX}horariooff 23:00 02:00 (madrugada)`
    );
  }

  // ---- CONFIGURA O HORÁRIO ----
  const horaInicio = sub;
  const horaFim = (args[1] || '').toLowerCase();

  if (!horaFim) {
    return reply(
      `❌ Você precisa informar a hora de início E a hora de fim!\n\n` +
      `📌 Exemplo: *${PREFIX}horariooff 15:00 15:30*`
    );
  }

  if (!validarHora(horaInicio) || !validarHora(horaFim)) {
    return reply(
      `❌ Formato de hora inválido!\n\n` +
      `✅ Use o formato 24h: *HH:MM*\n` +
      `📌 Exemplos válidos: 00:00, 09:30, 15:45, 23:59`
    );
  }

  if (horaInicio === horaFim) {
    return reply('❌ A hora de início e de fim não podem ser iguais!');
  }

  const info = getInfoHorarioOff();
  if (info) {
    return reply(
      `⚠️ Já existe um horário off configurado (*${info.horaInicio} → ${info.horaFim}*)!\n\n` +
      `Use *${PREFIX}horariooff cancelar* antes de definir um novo.`
    );
  }

  configurarHorarioOff(horaInicio, horaFim, sender);

  return reply(
    `✅ *HORÁRIO OFF CONFIGURADO!*\n\n` +
    `📅 *Todos os dias:*\n` +
    `🟥 Início: *${horaInicio}*\n` +
    `🟩 Fim: *${horaFim}*\n\n` +
    `⚠️ Durante este período, o bot vai ignorar as mensagens dos usuários.\n` +
    `👑 Apenas você (dono) poderá usar comandos.\n\n` +
    `💡 Use *${PREFIX}horariooff ver* para acompanhar.`
  );
}
