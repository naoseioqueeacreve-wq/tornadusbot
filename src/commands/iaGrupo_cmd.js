import { PREFIX } from '../config.js';
import { isAdmin, isOwner } from '../functions/permissions.js';
import { setModoIAGrupo, getModoIAGrupo } from '../functions/iaGrupoDB.js';

export async function executeModoIAGrupo(ctx) {
  const { reply, sender, groupMetadata, args, isGroup } = ctx;

  if (!isGroup) {
    return reply('❌ Este comando só pode ser usado em grupos!');
  }

  if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) {
    return reply('❌ Apenas administradores podem usar este comando.');
  }

  const sub = (args[0] || '').toLowerCase();
  const modoAtual = getModoIAGrupo(ctx.msg.key.remoteJid);

  if (sub === '1') {
    setModoIAGrupo(ctx.msg.key.remoteJid, 1);
    return reply(
      `🧠 *MODO IA 1 ATIVADO*\n\n` +
      `Agora o bot vai responder *perguntas* quando for chamado.\n` +
      `Exemplo: _"Freddy, o que é FNAF?"_\n\n` +
      `💡 Para desativar, use: *${PREFIX}modoia off*`
    );
  }

  if (sub === '2') {
    setModoIAGrupo(ctx.msg.key.remoteJid, 2);
    return reply(
      `🧠 *MODO IA 2 ATIVADO*\n\n` +
      `Agora o bot vai *executar comandos* via texto natural quando for chamado.\n` +
      `Exemplo: _"Freddy, abra o grupo"_\n\n` +
      `💡 Para desativar, use: *${PREFIX}modoia off*`
    );
  }

  if (sub === 'off' || sub === '0' || sub === 'desativar') {
    setModoIAGrupo(ctx.msg.key.remoteJid, 0);
    return reply(`🛑 *MODO IA DESATIVADO*\n\nO bot voltou ao comportamento normal (apenas comandos com prefixo).`);
  }

  // Menu de ajuda
  return reply(
    `🧠 *CONFIGURAÇÃO DO MODO IA*\n\n` +
    `📌 Modo atual: *${modoAtual === 0 ? 'Desativado' : `Modo ${modoAtual}`}*\n\n` +
    `*Opções:*\n` +
    `▸ *${PREFIX}modoia 1* → Responde perguntas\n` +
    `▸ *${PREFIX}modoia 2* → Executa comandos por texto\n` +
    `▸ *${PREFIX}modoia off* → Desativar\n\n` +
    `*(Lembre-se de chamar o bot pelo nome: "Freddy, ...")*`
  );
}
