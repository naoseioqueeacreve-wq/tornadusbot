import { PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import {
  lerConfig,
  setDelay,
  setLimite,
  setAtivo
} from '../functions/antiflood.js';

// =========================================
// COMANDO: !setdelay <segundos>
// =========================================
export async function executeSetDelay(ctx) {
  const { reply, sender, q } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const valor = parseFloat(q.trim().replace(',', '.'));

  if (isNaN(valor)) {
    const config = lerConfig();
    return reply(
      `⏱️ *DELAY ATUAL:* ${config.delay} segundos\n\n` +
      `Use: ${PREFIX}setdelay <segundos>\n` +
      `Exemplo: ${PREFIX}setdelay 3.5\n\n` +
      `⚠️ Mínimo permitido: *2.5 segundos*`
    );
  }

  if (valor < 2.5) {
    return reply('❌ O delay mínimo é *2.5 segundos*.\nExemplo: !setdelay 2.5');
  }

  if (valor > 60) {
    return reply('❌ O delay máximo é *60 segundos*.\nEscolha um valor menor.');
  }

  setDelay(valor);
  console.log(`[ANTIFLOOD] Delay alterado para ${valor}s.`);

  return reply(`✅ Delay do bot definido para *${valor} segundos*.`);
}

// =========================================
// COMANDO: !setlimite <número>
// =========================================
export async function executeSetLimite(ctx) {
  const { reply, sender, q } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const valor = parseInt(q.trim());

  if (isNaN(valor)) {
    const config = lerConfig();
    return reply(
      `📊 *LIMITE ATUAL:* ${config.limite} comandos por minuto\n\n` +
      `Use: ${PREFIX}setlimite <número>\n` +
      `Exemplo: ${PREFIX}setlimite 5\n\n` +
      `⚠️ Mínimo: *1* | Máximo: *50*`
    );
  }

  if (valor < 1) return reply('❌ O limite mínimo é *1 comando por minuto*.');
  if (valor > 50) return reply('❌ O limite máximo é *50 comandos por minuto*.');

  setLimite(valor);
  console.log(`[ANTIFLOOD] Limite alterado para ${valor}/min.`);

  return reply(`✅ Limite definido para *${valor} comandos por minuto*.`);
}

// =========================================
// COMANDO: !antiflood on/off
// =========================================
export async function executeAntiFlood(ctx) {
  const { reply, sender, q } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const config = lerConfig();
  const arg = q.trim().toLowerCase();

  if (arg === 'on') {
    setAtivo(true);
    console.log('[ANTIFLOOD] Sistema ATIVADO.');
    return reply(
      `🔒 *ANTI-FLOOD ATIVADO*\n\n` +
      `⏱️ Delay: ${config.delay}s\n` +
      `📊 Limite: ${config.limite} comandos/min\n\n` +
      `O dono continua isento de todas as regras.`
    );
  }

  if (arg === 'off') {
    setAtivo(false);
    console.log('[ANTIFLOOD] Sistema DESATIVADO.');
    return reply('🔓 *ANTI-FLOOD DESATIVADO*\n\nTodos os usuários podem usar comandos livremente (sem delay nem limite).');
  }

  return reply(
    `⚙️ *SISTEMA ANTI-FLOOD*\n\n` +
    `📊 Status: ${config.ativo ? '🔒 ATIVADO' : '🔓 DESATIVADO'}\n` +
    `⏱️ Delay: ${config.delay}s\n` +
    `📊 Limite: ${config.limite} comandos/min\n\n` +
    `Use:\n` +
    `• ${PREFIX}antiflood on — Ativar\n` +
    `• ${PREFIX}antiflood off — Desativar\n` +
    `• ${PREFIX}setdelay <seg> — Definir delay\n` +
    `• ${PREFIX}setlimite <nº> — Definir limite`
  );
}
