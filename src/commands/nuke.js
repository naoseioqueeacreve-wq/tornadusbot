import { PREFIX } from '../config.js';
import { isOwner, getRealSender } from '../functions/permissions.js';

const pendentes = new Map(); // `${jid}:${sender}` -> timeoutId
const JANELA_CONFIRMACAO = 30000;

const norm = (id = '') => id.split('@')[0].split(':')[0];

export async function executeNuke(client, msg, args = []) {
  const jid = msg.key.remoteJid;
  const sender = getRealSender(msg);

  if (!jid.endsWith('@g.us'))
    return client.sendMessage(jid, { text: '❌ Este comando só funciona em grupos.' }, { quoted: msg });

  if (!isOwner(sender))
    return client.sendMessage(jid, { text: '🚫 Apenas o dono do bot pode usar este comando.' }, { quoted: msg });

  const chave = `${jid}:${sender}`;
  const acao = (args[0] || '').toLowerCase();

  // Etapa 1: pedir confirmação
  if (acao !== 'confirmar') {
    // Verifica se o bot é admin ANTES de pedir confirmação
    try {
      const metaCheck = await client.groupMetadata(jid);
      
      const botId = norm(client.user.id);
      const botLid = client.user.lid ? norm(client.user.lid) : null;
      
      // Procura o bot na lista de participantes garantindo compatibilidade com LID
      const botNoGrupo = metaCheck.participants.find(p => {
        const pId = norm(p.id);
        const pLid = p.lid ? norm(p.lid) : null;
        return pId === botId || pId === botLid || pLid === botId;
      });
      
      if (!botNoGrupo?.admin) {
        return client.sendMessage(jid, { text: '❌ Eu preciso ser *ADMIN* do grupo para executar o nuke.\n\n👉 Vá nas configurações do grupo e me promova a administrador.' }, { quoted: msg });
      }
    } catch (e) {
      return client.sendMessage(jid, { text: `❌ Não consegui verificar os admins do grupo: ${e.message}` }, { quoted: msg });
    }

    clearTimeout(pendentes.get(chave));
    const t = setTimeout(() => pendentes.delete(chave), JANELA_CONFIRMACAO);
    pendentes.set(chave, t);
    return client.sendMessage(jid, {
      text: `⚠️ *CONFIRMAÇÃO NECESSÁRIA*\n\nIsso vai *remover TODOS os participantes* deste grupo, deixando apenas você e o bot.\n\nEnvie *${PREFIX}nuke confirmar* em até 30 segundos para executar.`
    }, { quoted: msg });
  }

  // Etapa 2: executar
  if (!pendentes.has(chave))
    return client.sendMessage(jid, { text: `❌ Nenhuma confirmação pendente. Envie *${PREFIX}nuke* primeiro.` }, { quoted: msg });

  clearTimeout(pendentes.get(chave));
  pendentes.delete(chave);

  try {
    const meta = await client.groupMetadata(jid);
    const botId = norm(client.user.id);
    const botLid = client.user.lid ? norm(client.user.lid) : null;
    const senderId = norm(sender);

    // Filtra quem deve ser removido (todos, exceto o bot e quem enviou o comando)
    const paraRemover = meta.participants
      .map(p => p.id)
      .filter(id => {
        const n = norm(id);
        return n !== botId && n !== botLid && n !== senderId;
      });

    if (paraRemover.length === 0) {
      return client.sendMessage(jid, { text: '🤷‍♂️ Não há mais ninguém para remover neste grupo.' }, { quoted: msg });
    }

    await client.sendMessage(jid, { text: `☢️ *EXECUTANDO NUKE...*\nRemovendo ${paraRemover.length} participantes...` }, { quoted: msg });

    // Remove em lotes de 10 para não derrubar a conexão do bot
    const tamanhoLote = 10;
    for (let i = 0; i < paraRemover.length; i += tamanhoLote) {
      const lote = paraRemover.slice(i, i + tamanhoLote);
      try {
        await client.groupParticipantsUpdate(jid, lote, 'remove');
      } catch (e) {
        console.error('[NUKE] Erro ao remover lote:', e.message);
      }
      // Pequeno delay entre os lotes para segurança
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await client.sendMessage(jid, { text: `☢️ *NUKE CONCLUÍDO!*\n\nO grupo foi limpo. Apenas você e o bot permanecem.` }, { quoted: msg });

  } catch (error) {
    console.error('[NUKE] Erro:', error);
    await client.sendMessage(jid, { text: `❌ Ocorreu um erro ao executar o nuke: ${error.message}` }, { quoted: msg });
  }
}
