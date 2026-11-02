import { PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import {
  ativarAutoLeitura,
  desativarAutoLeitura,
  getStatus,
  getRegistros,
  limparRegistros
} from '../functions/autoLeitura.js';

// =========================================
// FORMATAÇÕES
// =========================================
function formatarData(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatarHora(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// =========================================
// COMANDO: /auto-leitura
// =========================================
export async function executeAutoLeitura(ctx) {
  const { reply, sender, args } = ctx;

  if (!isOwner(sender)) {
    return reply('❌ Apenas o dono do bot pode usar este comando!');
  }

  const sub = (args[0] || '').toLowerCase();

  // ---- ATIVAR ----
  if (sub === 'on' || sub === 'ativar' || sub === 'ligar') {
    const status = getStatus();
    if (status.ativo) {
      return reply(
        `⚠️ O modo *Auto-Leitura* já está ATIVO.\n\n` +
        `⏰ Desde: ${formatarData(status.ativadoEm)}\n` +
        `👑 Por: @${status.ativadoPor?.split('@')[0] || 'Dono'}`,
        { mentions: status.ativadoPor ? [status.ativadoPor] : [] }
      );
    }

    const db = ativarAutoLeitura(sender);
    return reply(
      `📖 *AUTO-LEITURA ATIVADA*\n\n` +
      `👑 Ativado por: @${sender.split('@')[0]}\n` +
      `⏰ Ativado em: ${formatarData(db.ativadoEm)}\n\n` +
      `✅ Agora o bot está registrando *todas* as mensagens e comandos.\n` +
      `📋 Use *${PREFIX}auto-leitura ver* para visualizar.`,
      { mentions: [sender] }
    );
  }

  // ---- DESATIVAR ----
  if (sub === 'off' || sub === 'desativar' || sub === 'desligar') {
    const status = getStatus();
    if (!status.ativo) {
      return reply('⚠️ O modo *Auto-Leitura* já está DESATIVADO.');
    }

    desativarAutoLeitura();
    return reply(
      `📕 *AUTO-LEITURA DESATIVADA*\n\n` +
      `🛑 O bot parou de registrar novas mensagens.\n` +
      `📋 Registros anteriores ainda estão salvos.\n\n` +
      `💡 Use *${PREFIX}auto-leitura limpar* para apagar tudo.`
    );
  }

  // ---- VER REGISTROS ----
  if (sub === 'ver' || sub === 'logs' || sub === 'historico') {
    const limite = parseInt(args[1]) || 20;
    const dados = getRegistros(limite);

    if (dados.total === 0) {
      return reply(
        `📭 *SEM REGISTROS*\n\n` +
        `Nenhuma mensagem registrada ainda.\n\n` +
        `💡 Use *${PREFIX}auto-leitura on* para começar a registrar.`
      );
    }

    let texto =
      `📖 *ÚLTIMAS ${dados.registros.length} MENSAGENS*\n` +
      `📊 Total registrado: ${dados.total}\n` +
      `📌 Status: ${dados.ativo ? '🟢 ATIVO' : '🔴 DESATIVADO'}\n\n`;

    for (const r of dados.registros) {
      const emoji = r.isComando ? '⚡' : '💬';
      const autor = r.autor || 'Desconhecido';
      const local = r.grupoNome || 'Privado';
      texto += `${emoji} *[${formatarHora(r.timestamp)}]* ${autor}\n`;
      texto += `📍 ${local}\n`;
      texto += `💬 ${r.mensagem}\n`;
      texto += `━━━━━━━━━━━━\n`;
    }

    // Limita o tamanho da mensagem
    if (texto.length > 3500) {
      texto = texto.substring(0, 3500) + '\n\n... _(mensagem cortada)_';
    }

    return reply(texto);
  }

  // ---- LIMPAR ----
  if (sub === 'limpar' || sub === 'reset' || sub === 'apagar') {
    limparRegistros();
    return reply('🧹 *REGISTROS LIMPOS*\n\nTodos os registros de leitura foram apagados.');
  }

  // ---- STATUS ----
  if (sub === 'status' || sub === 'info') {
    const s = getStatus();
    return reply(
      `📊 *STATUS AUTO-LEITURA*\n\n` +
      `📌 Estado: ${s.ativo ? '🟢 ATIVO' : '🔴 DESATIVADO'}\n` +
      `📋 Total de registros: ${s.total}\n` +
      `⏰ Ativado em: ${formatarData(s.ativadoEm)}\n` +
      `👑 Ativado por: ${s.ativadoPor ? '@' + s.ativadoPor.split('@')[0] : '-'}`,
      { mentions: s.ativadoPor ? [s.ativadoPor] : [] }
    );
  }

  // ---- AJUDA ----
  return reply(
    `📖 *SISTEMA DE AUTO-LEITURA*\n\n` +
    `Quando ativado, o bot registra todas as mensagens e comandos que vê.\n` +
    `Perfeito para monitorar grupos e auditar atividades.\n\n` +
    `*Comandos:*\n` +
    `▸ ${PREFIX}auto-leitura on → Ativar\n` +
    `▸ ${PREFIX}auto-leitura off → Desativar\n` +
    `▸ ${PREFIX}auto-leitura ver [n] → Ver últimas N (padrão: 20)\n` +
    `▸ ${PREFIX}auto-leitura status → Status atual\n` +
    `▸ ${PREFIX}auto-leitura limpar → Apagar registros\n\n` +
    `*Exemplos:*\n` +
    `▸ ${PREFIX}auto-leitura on\n` +
    `▸ ${PREFIX}auto-leitura ver 50\n` +
    `▸ ${PREFIX}auto-leitura limpar`
  );
}
