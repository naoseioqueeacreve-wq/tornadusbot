import { isOwner } from '../functions/permissions.js';
import { lerAlugueis, salvarAlugueis, tempoRestante } from '../functions/aluguel.js';

// =========================================
// COMANDO: !listar_alugueis (DEBUG)
// Mostra todos os grupos com aluguel registrado
// =========================================
export async function executeListarAlugueis(ctx) {
  const { reply, sender } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const alugueis = lerAlugueis();
  const grupos = Object.keys(alugueis);

  if (grupos.length === 0) {
    return reply('📋 Nenhum grupo tem aluguel registrado.');
  }

  let texto = `📋 *GRUPOS COM ALUGUEL REGISTRADO*\n\n`;

  for (const jid of grupos) {
    const a = alugueis[jid];
    const restante = tempoRestante(jid);
    texto += `📌 *${jid}*\n`;
    texto += `   Ativo: ${a.ativo ? '✅' : '❌'}\n`;
    texto += `   Cliente: ${a.cliente || 'N/A'}\n`;
    texto += `   Expira em: ${a.expiraEm ? new Date(a.expiraEm).toLocaleString('pt-BR') : 'N/A'}\n`;
    texto += `   Restante: ${restante || 'N/A'}\n\n`;
  }

  return reply(texto);
}

// =========================================
// COMANDO: !limpar_alugueis (DEBUG)
// Remove TODOS os aluguéis registrados
// =========================================
export async function executeLimparAlugueis(ctx) {
  const { reply, sender } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  salvarAlugueis({});
  console.log('[ALUGUEL] Todos os aluguéis foram removidos.');

  return reply('🗑️ *TODOS OS ALUGUÉIS FORAM REMOVIDOS*\n\nNenhum grupo tem aluguel ativo agora.');
}
