import { PREFIX } from '../config.js';
import { isAdmin, isOwner } from '../functions/permissions.js';
import { getText } from '../functions/helpers.js';
import { getExtra, setExtra } from '../functions/gestaoDB.js';
import {
  semAcento,
  soDigitos,
  extrairJid,
  desembrulhar
} from './protecao.js';

// =========================================
// AUXILIARES
// =========================================
function temPermissao(ctx) {
  return isAdmin(ctx.sender, ctx.groupMetadata) || isOwner(ctx.sender);
}

function checar(ctx) {
  if (!ctx.isGroup) return '❌ Este comando só funciona em grupos.';
  if (!temPermissao(ctx)) return '❌ Apenas administradores podem usar este comando.';
  return null;
}

// Texto do comando preservando quebras de linha (sem o "/comando")
function textoBruto(msg) {
  return getText(msg).replace(/^\S+\s*/, '').trim();
}

function textoCitado(msg) {
  const citada = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  return (citada?.conversation || citada?.extendedTextMessage?.text || '').trim();
}

function idsDoBot(client) {
  return [soDigitos(client.user?.id), soDigitos(client.user?.lid)].filter(Boolean);
}

// =========================================
// 🚪 SISTEMA 10: DESPEDIDA
// =========================================
const PADRAO_DESPEDIDA = {
  ativo: false,
  texto: 'Tchau, {nome}! 👋 Sentiremos sua falta em {grupo}.'
};
const MAX_DESPEDIDA = 500;

export async function executeDespedida(ctx) {
  const { reply, args, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const cfg = getExtra(grupoJid, 'despedida', PADRAO_DESPEDIDA);
  const sub = semAcento(args[0]);

  if (sub === 'on' || sub === 'off') {
    cfg.ativo = sub === 'on';
    setExtra(grupoJid, 'despedida', cfg);
    return reply(
      cfg.ativo
        ? `✅ *DESPEDIDA ATIVADA*\n\nQuando alguém sair do grupo, o bot vai se despedir.\n\n📝 Mensagem atual:\n${cfg.texto}`
        : '🔕 *DESPEDIDA DESATIVADA*'
    );
  }

  return reply(
    `🚪 *DESPEDIDA*\n\n` +
    `Status: ${cfg.ativo ? '✅ ATIVADA' : '❌ DESATIVADA'}\n\n` +
    `📝 Mensagem:\n${cfg.texto}\n\n` +
    `*Comandos:*\n` +
    `• ${PREFIX}despedida on/off\n` +
    `• ${PREFIX}setdespedida <texto>\n\n` +
    `💡 Use {nome} e {grupo} no texto.`
  );
}

export async function executeSetDespedida(ctx) {
  const { reply, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const texto = textoBruto(msg) || textoCitado(msg);
  if (!texto) {
    return reply(
      `✏️ *MENSAGEM DE DESPEDIDA*\n\n` +
      `Use: ${PREFIX}setdespedida <texto>\n` +
      `Exemplo: ${PREFIX}setdespedida Adeus {nome}! Boa sorte 👋\n\n` +
      `💡 {nome} = quem saiu | {grupo} = nome do grupo`
    );
  }
  if (texto.length > MAX_DESPEDIDA) {
    return reply(`❌ Texto muito grande (${texto.length}). O máximo é *${MAX_DESPEDIDA}* caracteres.`);
  }

  const grupoJid = msg.key.remoteJid;
  const cfg = getExtra(grupoJid, 'despedida', PADRAO_DESPEDIDA);
  cfg.texto = texto;
  setExtra(grupoJid, 'despedida', cfg);

  return reply(
    `✅ *DESPEDIDA SALVA*\n\n` +
    `${texto.replace(/{nome}/g, '@usuario').replace(/{grupo}/g, 'Grupo')}\n\n` +
    (cfg.ativo ? '' : `⚠️ Ela está desativada. Ative com ${PREFIX}despedida on`)
  );
}

// Chamado pelo connect.js em 'group-participants.update' (action === 'remove')
export async function verificarSaidaGrupo(client, grupoJid, participants, autor) {
  try {
    const cfg = getExtra(grupoJid, 'despedida', PADRAO_DESPEDIDA);
    if (!cfg.ativo) return;

    // Removidos pelo próprio bot (anti-spam, lista negra...) já têm aviso próprio
    if (autor && idsDoBot(client).includes(soDigitos(autor))) return;
    if (!participants || participants.length === 0 || participants.length > 5) return;

    const meta = await client.groupMetadata(grupoJid).catch(() => null);
    const nomeGrupo = meta?.subject || 'Grupo';

    for (const p of participants) {
      const jid = extrairJid(p);
      if (!jid) continue;
      const nome = jid.split('@')[0].split(':')[0];
      const texto = cfg.texto.replace(/{nome}/g, `@${nome}`).replace(/{grupo}/g, nomeGrupo);
      await client.sendMessage(grupoJid, { text: texto, mentions: [jid] });
    }
  } catch (e) {
    console.error('[DESPEDIDA] Erro:', e.message);
  }
}

// =========================================
// 🔁 SISTEMA 11: FILTROS (RESPOSTAS AUTOMÁTICAS)
// =========================================
const PADRAO_FILTROS = { seq: 0, lista: [] };
const MAX_FILTROS = 30;
const MAX_GATILHO = 40;
const MAX_RESPOSTA = 1500;
const COOLDOWN_FILTRO = 30 * 1000;

// minúsculas, sem acento, só letras/números separados por 1 espaço
export function normalizar(txt) {
  return semAcento(txt).replace(/[^a-z0-9]+/g, ' ').trim();
}

// Procura o filtro cujo gatilho aparece como palavra/frase inteira no texto
export function acharFiltro(lista, texto) {
  const t = ` ${normalizar(texto)} `;
  if (t.trim() === '') return null;
  return [...lista]
    .sort((a, b) => b.chave.length - a.chave.length) // gatilho mais específico primeiro
    .find(f => t.includes(` ${f.chave} `)) || null;
}

export async function executeAddFiltro(ctx) {
  const { reply, msg, pushName } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const bruto = textoBruto(msg);
  const barra = bruto.indexOf('|');

  const uso =
    `🔁 *NOVO FILTRO*\n\n` +
    `Use: ${PREFIX}addfiltro <gatilho> | <resposta>\n` +
    `Exemplo: ${PREFIX}addfiltro pix | Nosso PIX é 123.456.789-00\n\n` +
    `Ou responda a uma mensagem com ${PREFIX}addfiltro <gatilho>\n\n` +
    `💡 Use {nome} na resposta para marcar quem escreveu.`;

  let gatilho = barra >= 0 ? bruto.slice(0, barra).trim() : bruto.trim();
  let resposta = barra >= 0 ? bruto.slice(barra + 1).trim() : '';
  if (!resposta) resposta = textoCitado(msg);

  if (!gatilho || !resposta) return reply(uso);

  const chave = normalizar(gatilho);
  if (!chave) return reply('❌ O gatilho precisa ter letras ou números.');
  if (gatilho.length > MAX_GATILHO) return reply(`❌ Gatilho muito grande. O máximo é *${MAX_GATILHO}* caracteres.`);
  if (resposta.length > MAX_RESPOSTA) return reply(`❌ Resposta muito grande (${resposta.length}). O máximo é *${MAX_RESPOSTA}* caracteres.`);

  const dados = getExtra(grupoJid, 'filtros', PADRAO_FILTROS);
  dados.lista = [...dados.lista];

  const existente = dados.lista.find(f => f.chave === chave);
  if (existente) {
    existente.resposta = resposta;
    existente.original = gatilho;
    existente.por = pushName || 'Admin';
    setExtra(grupoJid, 'filtros', dados);
    return reply(`♻️ *FILTRO ATUALIZADO*\n\n🔑 ${gatilho}`);
  }

  if (dados.lista.length >= MAX_FILTROS) {
    return reply(`❌ Limite de *${MAX_FILTROS} filtros* por grupo atingido.\nRemova um com ${PREFIX}delfiltro <nº>.`);
  }

  dados.seq += 1;
  dados.lista.push({ id: dados.seq, chave, original: gatilho, resposta, por: pushName || 'Admin', em: Date.now() });
  setExtra(grupoJid, 'filtros', dados);

  return reply(
    `✅ *FILTRO CRIADO*\n\n` +
    `🔑 Gatilho: *${gatilho}*\n` +
    `💬 ${resposta.length > 120 ? resposta.slice(0, 120) + '…' : resposta}\n\n` +
    `O bot responde sempre que alguém escrever essa palavra/frase.`
  );
}

export async function executeDelFiltro(ctx) {
  const { reply, msg, args } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const dados = getExtra(grupoJid, 'filtros', PADRAO_FILTROS);
  const entrada = textoBruto(msg);

  if (!entrada) {
    return reply(`🗑️ *REMOVER FILTRO*\n\nUse: ${PREFIX}delfiltro <nº ou gatilho>\n📋 Veja a lista com ${PREFIX}filtros`);
  }

  let idx = -1;
  if (/^\d{1,3}$/.test(args[0]) && args.length === 1) {
    idx = parseInt(args[0]) - 1;
  } else {
    const chave = normalizar(entrada);
    idx = dados.lista.findIndex(f => f.chave === chave);
  }

  if (idx < 0 || idx >= dados.lista.length) {
    return reply(`❌ Filtro não encontrado. Veja a lista com ${PREFIX}filtros`);
  }

  const lista = [...dados.lista];
  const [removido] = lista.splice(idx, 1);
  dados.lista = lista;
  setExtra(grupoJid, 'filtros', dados);
  return reply(`🗑️ *FILTRO REMOVIDO*\n\n🔑 ${removido.original}`);
}

export async function executeFiltros(ctx) {
  const { reply, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const dados = getExtra(msg.key.remoteJid, 'filtros', PADRAO_FILTROS);
  if (dados.lista.length === 0) {
    return reply(`🔁 *FILTROS*\n\nNenhum filtro neste grupo.\n\nCrie com: ${PREFIX}addfiltro <gatilho> | <resposta>`);
  }

  const linhas = dados.lista.map((f, i) => {
    const previa = f.resposta.replace(/\n/g, ' ');
    return `*${i + 1}.* 🔑 ${f.original}\n     💬 ${previa.length > 60 ? previa.slice(0, 60) + '…' : previa}`;
  });

  return reply(
    `🔁 *FILTROS* (${dados.lista.length}/${MAX_FILTROS})\n\n${linhas.join('\n')}\n\n` +
    `➕ ${PREFIX}addfiltro <gatilho> | <resposta>\n➖ ${PREFIX}delfiltro <nº>`
  );
}

// =========================================
// 🏷️ SISTEMA 12: ANTI-MARCAÇÃO
// =========================================
const PADRAO_ANTIMARCACAO = { ativo: false, limite: 5 };

export async function executeAntiMarcacao(ctx) {
  const { reply, args, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const cfg = getExtra(grupoJid, 'antiMarcacao', PADRAO_ANTIMARCACAO);
  const sub = semAcento(args[0]);

  if (sub === 'on' || sub === 'off') {
    cfg.ativo = sub === 'on';
    setExtra(grupoJid, 'antiMarcacao', cfg);
    return reply(
      cfg.ativo
        ? `✅ *ANTI-MARCAÇÃO ATIVADO*\n\n` +
          `🏷️ Mensagens de membros que marcam *${cfg.limite} ou mais* pessoas serão apagadas.\n` +
          `👮 Admins e o dono são ignorados.\n` +
          `💡 O bot precisa ser admin para apagar mensagens.`
        : '🔓 *ANTI-MARCAÇÃO DESATIVADO*'
    );
  }

  if (sub === 'limite') {
    const n = parseInt(args[1]);
    if (!n || n < 2 || n > 30) {
      return reply(`⚙️ Use: ${PREFIX}antimarcacao limite <2 a 30>\nExemplo: ${PREFIX}antimarcacao limite 5`);
    }
    cfg.limite = n;
    setExtra(grupoJid, 'antiMarcacao', cfg);
    return reply(`✅ Limite definido: mensagens com *${n} ou mais* marcações serão apagadas.`);
  }

  return reply(
    `🏷️ *ANTI-MARCAÇÃO*\n\n` +
    `Status: ${cfg.ativo ? '✅ ATIVADO' : '❌ DESATIVADO'}\n` +
    `📊 Limite: *${cfg.limite}* marcações por mensagem\n\n` +
    `Impede que membros marquem muita gente de uma vez.\n\n` +
    `*Comandos:*\n` +
    `• ${PREFIX}antimarcacao on/off\n` +
    `• ${PREFIX}antimarcacao limite <2-30>`
  );
}

export function contarMencoes(msg) {
  const m = desembrulhar(msg.message);
  for (const valor of Object.values(m)) {
    const lista = valor && typeof valor === 'object' ? valor.contextInfo?.mentionedJid : null;
    if (Array.isArray(lista)) return new Set(lista).size;
  }
  return 0;
}

// =========================================
// 🔎 VERIFICAÇÃO AUTOMÁTICA (chamada pelo index.js a cada mensagem de grupo)
// Retorna true se a mensagem foi apagada
// =========================================
const avisoMarcacaoRecente = new Map();
const ultimoFiltro = new Map(); // "grupo|filtro" -> timestamp

export async function verificarAutomacoes(client, msg, jid, sender) {
  try {
    if (!sender || msg.key.fromMe) return false;

    // ---------- ANTI-MARCAÇÃO ----------
    const am = getExtra(jid, 'antiMarcacao', PADRAO_ANTIMARCACAO);
    if (am.ativo) {
      const n = contarMencoes(msg);
      if (n >= am.limite && !isOwner(sender)) {
        const meta = await client.groupMetadata(jid).catch(() => null);
        if (!isAdmin(sender, meta)) {
          try { await client.sendMessage(jid, { delete: msg.key }); } catch (e) {}

          const agora = Date.now();
          if (agora - (avisoMarcacaoRecente.get(jid) || 0) > 20 * 1000) {
            avisoMarcacaoRecente.set(jid, agora);
            const numero = sender.split('@')[0].split(':')[0];
            try {
              await client.sendMessage(jid, {
                text: `🏷️ @${numero}, não é permitido marcar *${am.limite} ou mais* pessoas de uma vez.`,
                mentions: [sender]
              });
            } catch (e) {}
          }
          return true;
        }
      }
    }

    // ---------- FILTROS ----------
    const dados = getExtra(jid, 'filtros', PADRAO_FILTROS);
    if (dados.lista.length > 0) {
      const texto = getText(msg).trim();
      if (texto && !texto.startsWith(PREFIX)) {
        const filtro = acharFiltro(dados.lista, texto);
        if (filtro) {
          const k = `${jid}|${filtro.id}`;
          const agora = Date.now();
          if (agora - (ultimoFiltro.get(k) || 0) > COOLDOWN_FILTRO) {
            if (ultimoFiltro.size > 2000) ultimoFiltro.clear();
            ultimoFiltro.set(k, agora);
            const numero = sender.split('@')[0].split(':')[0];
            await client.sendMessage(
              jid,
              { text: filtro.resposta.replace(/{nome}/g, `@${numero}`), mentions: [sender] },
              { quoted: msg }
            );
          }
        }
      }
    }

    return false;
  } catch (e) {
    console.error('[AUTOMAÇÃO] Erro:', e.message);
    return false;
  }
}
