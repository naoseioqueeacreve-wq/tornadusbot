import { PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import {
  lerAlugueis,
  salvarAlugueis,
  converterTempo,
  temAluguelAtivo,
  tempoRestante,
  getAluguelGlobal,
  setAluguelGlobal
} from '../functions/aluguel.js';

// =========================================
// COMANDO: !aluguelglobal on/off
// =========================================
export async function executeAluguelGlobal(ctx) {
  const { reply, sender, q } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono do bot pode usar este comando.');

  const estadoAtual = getAluguelGlobal();

  if (q.trim().toLowerCase() === 'on') {
    setAluguelGlobal(true);
    return reply(
      '🔒 *MODO ALUGUEL ATIVADO*\n\n' +
      'O bot só vai responder grupos que tenham aluguel ativo.\n\n' +
      '💡 O dono do bot sempre poderá usar comandos.'
    );
  }

  if (q.trim().toLowerCase() === 'off') {
    setAluguelGlobal(false);
    return reply('🔓 *MODO ALUGUEL DESATIVADO*\n\nO bot voltou a responder todos os grupos.');
  }

  return reply(
    `⚙️ *MODO ALUGUEL GLOBAL*\n\n` +
    `Status atual: ${estadoAtual ? '🔒 ATIVADO' : '🔓 DESATIVADO'}\n\n` +
    `Use:\n` +
    `• ${PREFIX}aluguelglobal on — Ativar\n` +
    `• ${PREFIX}aluguelglobal off — Desativar`
  );
}

// =========================================
// COMANDO: !aluguel
// =========================================
export async function executeAluguel(ctx) {
  const { reply, sender, isGroup, msg } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode ativar o aluguel.');
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');

  const groupJid = msg.key.remoteJid;
  const alugueis = lerAlugueis();

  if (!alugueis[groupJid]) {
    alugueis[groupJid] = {
      ativo: false,
      expiraEm: 0,
      registrado: false,
      registradoEm: 0
    };
  }

  alugueis[groupJid].ativo = true;
  salvarAlugueis(alugueis);

  console.log(`[ALUGUEL] Grupo ${groupJid} ativado.`);

  return reply(
    `✅ *ALUGUEL ATIVADO NESTE GRUPO*\n\n` +
    `📌 Grupo: ${groupJid}\n` +
    `📅 Status: Aguardando registro\n\n` +
    `Use *${PREFIX}rg_aluguel <número> <tempo>* para registrar.\n\n` +
    `📋 *Exemplos de tempo:*\n` +
    `• 10d → 10 dias\n` +
    `• 1h → 1 hora\n` +
    `• 1a → 1 ano`
  );
}

// =========================================
// COMANDO: !rg_aluguel <número> <tempo>
// EX: !rg_aluguel 5516997468496 10d
// =========================================
export async function executeRgAluguel(ctx) {
  const { reply, sender, q, isGroup, msg } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode registrar aluguéis.');
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');

  const partes = q.trim().split(/\s+/);
  if (partes.length < 2) {
    return reply(
      `📋 *COMO REGISTRAR ALUGUEL*\n\n` +
      `Use: ${PREFIX}rg_aluguel <número> <tempo>\n\n` +
      `⏱️ *Formatos de tempo:*\n` +
      `• 10d → 10 dias\n` +
      `• 1h → 1 hora\n` +
      `• 1a → 1 ano\n\n` +
      `Exemplo: ${PREFIX}rg_aluguel 5516997468496 10d`
    );
  }

  const numero = partes[0].replace(/\D/g, '');
  const tempoStr = partes[1];

  if (numero.length < 10) {
    return reply('❌ Número inválido. Use DDI + DDD + número (ex: 5516997468496).');
  }

  const ms = converterTempo(tempoStr);
  if (!ms) {
    return reply(
      '❌ Formato de tempo inválido.\n\n' +
      'Use: 10d (dias), 1h (horas), 1a (ano).\n' +
      'Exemplo: 10d'
    );
  }

  const groupJid = msg.key.remoteJid;
  const alugueis = lerAlugueis();

  alugueis[groupJid] = {
    ativo: true,
    expiraEm: Date.now() + ms,
    registrado: true,
    registradoEm: Date.now(),
    cliente: numero,
    tempoOriginal: tempoStr
  };

  salvarAlugueis(alugueis);

  console.log(`[ALUGUEL] Registrado no grupo ${groupJid} para ${numero} (${tempoStr}).`);

  return reply(
    `✅ *ALUGUEL REGISTRADO COM SUCESSO*\n\n` +
    `📞 Cliente: ${numero}\n` +
    `⏱️ Duração: ${tempoStr}\n` +
    `📅 Expira em: ${new Date(alugueis[groupJid].expiraEm).toLocaleString('pt-BR')}\n` +
    `⏳ Tempo restante: ${tempoRestante(groupJid)}`
  );
}

// =========================================
// COMANDO: !rm_aluguel
// =========================================
export async function executeRmAluguel(ctx) {
  const { reply, sender, isGroup, msg } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode remover aluguéis.');
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');

  const groupJid = msg.key.remoteJid;
  const alugueis = lerAlugueis();

  if (!alugueis[groupJid]) {
    return reply('❌ Este grupo não tem aluguel registrado.');
  }

  delete alugueis[groupJid];
  salvarAlugueis(alugueis);

  console.log(`[ALUGUEL] Removido do grupo ${groupJid}.`);

  return reply('🗑️ *ALUGUEL REMOVIDO*\n\nO bot parou de responder neste grupo.');
}

// =========================================
// COMANDO: !rn_aluguel <tempo>
// EX: !rn_aluguel 10d
// =========================================
export async function executeRnAluguel(ctx) {
  const { reply, sender, q, isGroup, msg } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode renovar aluguéis.');
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');

  const tempoStr = q.trim();
  if (!tempoStr) {
    return reply(
      `📋 *COMO RENOVAR ALUGUEL*\n\n` +
      `Use: ${PREFIX}rn_aluguel <tempo>\n\n` +
      `⏱️ *Formatos:* 10d (dias), 1h (horas), 1a (ano)\n` +
      `Exemplo: ${PREFIX}rn_aluguel 10d`
    );
  }

  const ms = converterTempo(tempoStr);
  if (!ms) {
    return reply(
      '❌ Formato inválido.\n\n' +
      'Use: 10d (dias), 1h (horas), 1a (ano).\n' +
      'Exemplo: 10d'
    );
  }

  const groupJid = msg.key.remoteJid;
  const alugueis = lerAlugueis();

  if (!alugueis[groupJid]) {
    return reply('❌ Este grupo não tem aluguel registrado. Use `!rg_aluguel` primeiro.');
  }

  const agora = Date.now();
  const base = alugueis[groupJid].expiraEm > agora ? alugueis[groupJid].expiraEm : agora;
  alugueis[groupJid].expiraEm = base + ms;
  alugueis[groupJid].ativo = true;

  salvarAlugueis(alugueis);

  console.log(`[ALUGUEL] Renovado no grupo ${groupJid} (+${tempoStr}).`);

  return reply(
    `✅ *ALUGUEL RENOVADO*\n\n` +
    `➕ Adicionado: ${tempoStr}\n` +
    `📅 Nova expiração: ${new Date(alugueis[groupJid].expiraEm).toLocaleString('pt-BR')}\n` +
    `⏳ Tempo restante: ${tempoRestante(groupJid)}`
  );
}
