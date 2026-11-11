import { addCustomCommand, removeCustomCommand } from '../functions/customCommandsDB.js';
import { isOwner } from '../functions/permissions.js';

// =========================================
// COMANDO: !addcmd <nome> | <resposta>
// =========================================
export async function executeAddCmd(ctx) {
  const { reply, sender, q } = ctx;
  
  if (!isOwner(sender)) return reply('❌ Apenas o dono do bot pode usar este comando.');

  // Separa o nome do comando da resposta usando o pipe (|)
  const partes = q.split('|');
  
  if (partes.length < 2) {
    return reply('❌ Use o formato correto:\n`!addcmd nome | resposta`\n\n*Exemplo:*\n`!addcmd regras | 1. Proibido links\n2. Proibido brigas`');
  }

  const nome = partes[0].trim().toLowerCase().replace(/\s+/g, '');
  const resposta = partes.slice(1).join('|').trim();

  if (!nome || !resposta) {
    return reply('❌ O nome do comando ou a resposta não podem ficar vazios.');
  }

  addCustomCommand(nome, resposta);
  return reply(`✅ Comando *!${nome}* criado com sucesso!`);
}

// =========================================
// COMANDO: !delcmd <nome>
// =========================================
export async function executeDelCmd(ctx) {
  const { reply, sender, q } = ctx;
  
  if (!isOwner(sender)) return reply('❌ Apenas o dono do bot pode usar este comando.');

  const nome = q.trim().toLowerCase().replace(/\s+/g, '');

  if (!nome) {
    return reply('❌ Digite o nome do comando que deseja apagar.\n*Exemplo:* `!delcmd regras`');
  }

  if (removeCustomCommand(nome)) {
    return reply(`🗑️ Comando *!${nome}* removido com sucesso!`);
  } else {
    return reply(`⚠️ O comando *!${nome}* não existe.`);
  }
}
