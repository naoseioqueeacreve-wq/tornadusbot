import { PREFIX } from '../config.js';
import { isAdmin, isOwner } from '../functions/permissions.js';
import { getText } from '../functions/helpers.js';
import { adicionarWarn, limparWarns } from '../functions/adminDB.js';
import {
  TIPOS_MIDIA,
  getProtecao,
  salvarProtecao,
  registrarMensagemSpam,
  resetarHistoricoSpam
} from '../functions/protecaoDB.js';

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

export function semAcento(txt) {
  return String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function soDigitos(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

export function extrairJid(p) {
  if (!p) return '';
  if (typeof p === 'string') return p;
  return p.id || p.jid || p.participant || p.userJid || '';
}

// Todos os identificadores (telefone e LID) de um participante, só dígitos
export function identificadores(p) {
  if (!p) return [];
  const bruto = typeof p === 'string'
    ? [p]
    : [p.id, p.lid, p.phoneNumber, p.participantAlt, p.jid, p.participant];
  return [...new Set(bruto.filter(Boolean).map(soDigitos).filter(d => d.length >= 5))];
}

// Número de telefone "de verdade" (quando o grupo usa LID)
export function numeroTelefone(p) {
  if (typeof p === 'string') return soDigitos(p);
  const candidatos = [p.phoneNumber, p.participantAlt, p.id, p.jid]
    .filter(x => typeof x === 'string' && x.endsWith('@s.whatsapp.net'));
  if (candidatos.length) return soDigitos(candidatos[0]);
  return identificadores(p)[0] || '';
}

function acharParticipante(groupMetadata, ids) {
  return groupMetadata?.participants?.find(p => identificadores(p).some(i => ids.includes(i))) || null;
}

// =========================================
// 🛡️ SISTEMA 1: ANTI-SPAM
// =========================================
const ACOES_SPAM = {
  avisar: 'Apaga as mensagens e avisa',
  advertir: 'Apaga e dá advertência (3 = ban)',
  banir: 'Apaga e remove do grupo'
};

export async function executeAntiSpam(ctx) {
  const { reply, args, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const cfg = getProtecao(grupoJid);
  const sub = semAcento(args[0]);

  if (sub === 'on' || sub === 'off') {
    cfg.antiSpam.ativo = sub === 'on';
    salvarProtecao(grupoJid, cfg);
    return reply(
      cfg.antiSpam.ativo
        ? `✅ *ANTI-SPAM ATIVADO*\n\n` +
          `📊 Limite: *${cfg.antiSpam.limite} mensagens* em *${cfg.antiSpam.janela}s*\n` +
          `⚖️ Ação: *${cfg.antiSpam.acao}*\n\n` +
          `👮 Admins e o dono são ignorados.\n` +
          `💡 O bot precisa ser admin para apagar mensagens.`
        : `🔓 *ANTI-SPAM DESATIVADO*`
    );
  }

  if (sub === 'limite') {
    const msgs = parseInt(args[1]);
    const seg = parseInt(args[2]);
    if (!msgs || !seg || msgs < 3 || msgs > 20 || seg < 3 || seg > 30) {
      return reply(
        `⚙️ *LIMITE DO ANTI-SPAM*\n\n` +
        `Use: ${PREFIX}antispam limite <mensagens> <segundos>\n` +
        `Exemplo: ${PREFIX}antispam limite 6 8\n\n` +
        `⚠️ Mensagens: *3 a 20* | Segundos: *3 a 30*`
      );
    }
    cfg.antiSpam.limite = msgs;
    cfg.antiSpam.janela = seg;
    salvarProtecao(grupoJid, cfg);
    return reply(`✅ Limite definido: *${msgs} mensagens* em *${seg} segundos*.`);
  }

  if (sub === 'acao') {
    const acao = semAcento(args[1]);
    if (!ACOES_SPAM[acao]) {
      return reply(
        `⚖️ *AÇÃO DO ANTI-SPAM*\n\n` +
        Object.entries(ACOES_SPAM).map(([k, v]) => `• *${k}* → ${v}`).join('\n') +
        `\n\nUse: ${PREFIX}antispam acao <avisar/advertir/banir>`
      );
    }
    cfg.antiSpam.acao = acao;
    salvarProtecao(grupoJid, cfg);
    return reply(`✅ Ação definida: *${acao}* — ${ACOES_SPAM[acao]}.`);
  }

  // Status / ajuda
  return reply(
    `🛡️ *ANTI-SPAM*\n\n` +
    `Status: ${cfg.antiSpam.ativo ? '✅ ATIVADO' : '❌ DESATIVADO'}\n` +
    `📊 Limite: *${cfg.antiSpam.limite} msgs* em *${cfg.antiSpam.janela}s*\n` +
    `⚖️ Ação: *${cfg.antiSpam.acao}*\n\n` +
    `*Comandos:*\n` +
    `• ${PREFIX}antispam on/off\n` +
    `• ${PREFIX}antispam limite <msgs> <seg>\n` +
    `• ${PREFIX}antispam acao <avisar/advertir/banir>`
  );
}

// =========================================
// 🖼️ SISTEMA 2: ANTI-MÍDIA
// =========================================
const NOMES_MIDIA = {
  figurinha: { emoji: '🎭', plural: 'figurinhas' },
  imagem: { emoji: '🖼️', plural: 'imagens' },
  video: { emoji: '🎬', plural: 'vídeos e GIFs' },
  audio: { emoji: '🎧', plural: 'áudios' },
  documento: { emoji: '📄', plural: 'documentos' },
  contato: { emoji: '👤', plural: 'contatos' },
  localizacao: { emoji: '📍', plural: 'localizações' }
};

const ALIAS_MIDIA = {
  figurinha: 'figurinha', figurinhas: 'figurinha', sticker: 'figurinha', stickers: 'figurinha', fig: 'figurinha',
  imagem: 'imagem', imagens: 'imagem', foto: 'imagem', fotos: 'imagem', img: 'imagem',
  video: 'video', videos: 'video', gif: 'video', gifs: 'video',
  audio: 'audio', audios: 'audio', voz: 'audio',
  documento: 'documento', documentos: 'documento', doc: 'documento', arquivo: 'documento', arquivos: 'documento',
  contato: 'contato', contatos: 'contato',
  localizacao: 'localizacao', localizacoes: 'localizacao', loc: 'localizacao'
};

export async function executeAntiMidia(ctx) {
  const { reply, args, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const cfg = getProtecao(grupoJid);
  const a0 = semAcento(args[0]);
  const a1 = semAcento(args[1]);

  // /antimidia off  → libera tudo
  if (a0 === 'off' && !a1) {
    TIPOS_MIDIA.forEach(t => { cfg.antiMidia[t] = false; });
    salvarProtecao(grupoJid, cfg);
    return reply('🔓 *ANTI-MÍDIA DESATIVADO*\n\nTodos os tipos de mídia foram liberados.');
  }

  // /antimidia <tipo|todas> on/off
  if (a0 && (a1 === 'on' || a1 === 'off')) {
    const ligar = a1 === 'on';

    if (a0 === 'todas' || a0 === 'todos' || a0 === 'tudo') {
      TIPOS_MIDIA.forEach(t => { cfg.antiMidia[t] = ligar; });
      salvarProtecao(grupoJid, cfg);
      return reply(
        ligar
          ? '🚫 *ANTI-MÍDIA ATIVADO*\n\nTodos os tipos de mídia estão bloqueados para membros.'
          : '🔓 *ANTI-MÍDIA DESATIVADO*\n\nTodos os tipos de mídia foram liberados.'
      );
    }

    const tipo = ALIAS_MIDIA[a0];
    if (!tipo) {
      return reply(
        `❌ Tipo inválido: *${args[0]}*\n\n` +
        `Tipos: ${TIPOS_MIDIA.map(t => `*${t}*`).join(', ')} ou *todas*.`
      );
    }

    cfg.antiMidia[tipo] = ligar;
    salvarProtecao(grupoJid, cfg);
    const n = NOMES_MIDIA[tipo];
    return reply(
      ligar
        ? `🚫 ${n.emoji} *${n.plural.toUpperCase()}* agora são bloqueados para membros.`
        : `✅ ${n.emoji} *${n.plural.toUpperCase()}* foram liberados.`
    );
  }

  // Painel de status
  const linhas = TIPOS_MIDIA.map(t => {
    const n = NOMES_MIDIA[t];
    return `${cfg.antiMidia[t] ? '🚫' : '✅'} ${n.emoji} ${n.plural}`;
  });

  return reply(
    `🖼️ *ANTI-MÍDIA*\n\n` +
    linhas.join('\n') +
    `\n\n🚫 = bloqueado | ✅ = liberado\n` +
    `👮 Admins e o dono são ignorados.\n\n` +
    `*Comandos:*\n` +
    `• ${PREFIX}antimidia <tipo> on/off\n` +
    `• ${PREFIX}antimidia todas on/off\n` +
    `• ${PREFIX}antimidia off (libera tudo)\n\n` +
    `Tipos: figurinha, imagem, video, audio, documento, contato, localizacao`
  );
}

// =========================================
// ⛔ SISTEMA 3: LISTA NEGRA
// =========================================
function resolverAlvo(ctx, textoSemSub) {
  const { msg, groupMetadata } = ctx;
  const info = msg.message?.extendedTextMessage?.contextInfo;

  // 1) Menção
  let jid = info?.mentionedJid?.[0];

  // 2) Número digitado
  let numeroDigitado = null;
  if (!jid) {
    const m = textoSemSub.match(/\+?\d[\d\s\-]{6,}\d/);
    if (m) {
      const d = m[0].replace(/\D/g, '');
      if (d.length >= 10 && d.length <= 15) numeroDigitado = d;
    }
  }

  // 3) Resposta a uma mensagem
  if (!jid && !numeroDigitado) jid = info?.participant;

  if (numeroDigitado) {
    const part = acharParticipante(groupMetadata, [numeroDigitado]);
    return {
      ids: part ? identificadores(part) : [numeroDigitado],
      numero: numeroDigitado,
      participante: part
    };
  }

  if (jid) {
    const part = acharParticipante(groupMetadata, identificadores(jid));
    return {
      ids: part ? identificadores(part) : identificadores(jid),
      numero: part ? numeroTelefone(part) : soDigitos(jid),
      participante: part
    };
  }

  return null;
}

export async function executeListaNegra(ctx) {
  const { reply, args, msg, q, client, pushName } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const cfg = getProtecao(grupoJid);
  const sub = semAcento(args[0]);
  const resto = q.replace(/^\s*\S+\s*/, '');

  // ---------- LISTA ----------
  if (sub === 'lista' || sub === 'listar' || sub === 'list') {
    if (cfg.listaNegra.length === 0) {
      return reply('📋 *LISTA NEGRA*\n\nNenhum número na lista negra deste grupo.');
    }
    const linhas = cfg.listaNegra.map((e, i) => {
      const data = new Date(e.em).toLocaleDateString('pt-BR');
      return `*${i + 1}.* +${e.numero}\n    📝 ${e.motivo}\n    📅 ${data} • por ${e.por}`;
    });
    return reply(`⛔ *LISTA NEGRA* (${cfg.listaNegra.length})\n\n${linhas.join('\n\n')}`);
  }

  // ---------- ADICIONAR ----------
  if (sub === 'add' || sub === 'adicionar' || sub === 'addln') {
    const alvo = resolverAlvo(ctx, resto);
    if (!alvo) {
      return reply(
        `⛔ *ADICIONAR À LISTA NEGRA*\n\n` +
        `Use: ${PREFIX}blacklist add @user <motivo>\n` +
        `Ou: ${PREFIX}blacklist add 5511999999999 <motivo>\n` +
        `Ou responda a uma mensagem com ${PREFIX}blacklist add <motivo>`
      );
    }

    if (isOwner(alvo.numero + '@s.whatsapp.net')) return reply('❌ Não posso colocar o dono do bot na lista negra.');
    if (alvo.participante?.admin) return reply('❌ Não posso colocar um admin na lista negra.');

    if (cfg.listaNegra.some(e => e.ids.some(i => alvo.ids.includes(i)))) {
      return reply(`⚠️ +${alvo.numero} já está na lista negra.`);
    }

    const motivo = resto
      .replace(/@\d+/g, '')
      .replace(/\+?\d[\d\s\-]{6,}\d/, '')
      .trim() || 'Sem motivo informado';

    cfg.listaNegra.push({
      numero: alvo.numero,
      ids: alvo.ids,
      motivo,
      por: pushName || 'Admin',
      em: Date.now()
    });
    salvarProtecao(grupoJid, cfg);

    let extra = '\n\n🚪 Se entrar de novo, será removido automaticamente.';
    if (alvo.participante) {
      try {
        await client.groupParticipantsUpdate(grupoJid, [alvo.participante.id], 'remove');
        extra = '\n\n🚪 Já foi removido do grupo.';
      } catch (e) {
        extra = '\n\n⚠️ Não consegui remover agora (preciso ser admin).';
      }
    }

    return reply(`⛔ *ADICIONADO À LISTA NEGRA*\n\n📱 +${alvo.numero}\n📝 Motivo: ${motivo}${extra}`);
  }

  // ---------- REMOVER ----------
  if (sub === 'rem' || sub === 'remover' || sub === 'del' || sub === 'delete') {
    const token = (args[1] || '').replace(/\D/g, '');

    // Por posição na lista: /blacklist rem 2
    if (token && token.length <= 3 && !(msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []).length) {
      const idx = parseInt(token) - 1;
      if (idx < 0 || idx >= cfg.listaNegra.length) return reply('❌ Posição inválida. Veja a lista com *' + PREFIX + 'blacklist lista*.');
      const [removido] = cfg.listaNegra.splice(idx, 1);
      salvarProtecao(grupoJid, cfg);
      return reply(`✅ +${removido.numero} foi removido da lista negra.`);
    }

    const alvo = resolverAlvo(ctx, resto);
    if (!alvo) {
      return reply(
        `➖ *REMOVER DA LISTA NEGRA*\n\n` +
        `Use: ${PREFIX}blacklist rem @user\n` +
        `Ou: ${PREFIX}blacklist rem 5511999999999\n` +
        `Ou: ${PREFIX}blacklist rem <posição>`
      );
    }

    const antes = cfg.listaNegra.length;
    cfg.listaNegra = cfg.listaNegra.filter(e => !e.ids.some(i => alvo.ids.includes(i)));
    if (cfg.listaNegra.length === antes) return reply(`⚠️ +${alvo.numero} não está na lista negra.`);

    salvarProtecao(grupoJid, cfg);
    return reply(`✅ +${alvo.numero} foi removido da lista negra.`);
  }

  // ---------- AJUDA ----------
  return reply(
    `⛔ *LISTA NEGRA* (${cfg.listaNegra.length})\n\n` +
    `Quem está na lista é removido na hora, e expulso automaticamente se tentar entrar de novo.\n\n` +
    `*Comandos:*\n` +
    `• ${PREFIX}blacklist add @user <motivo>\n` +
    `• ${PREFIX}blacklist add <número> <motivo>\n` +
    `• ${PREFIX}blacklist rem @user | <número> | <posição>\n` +
    `• ${PREFIX}blacklist lista`
  );
}

// =========================================
// 🔎 VERIFICAÇÃO AUTOMÁTICA DE MENSAGENS
// (chamada pelo index.js a cada mensagem de grupo)
// Retorna true se a mensagem foi tratada (apagada)
// =========================================
export function desembrulhar(m) {
  let atual = m || {};
  for (let i = 0; i < 4; i++) {
    const interno =
      atual.ephemeralMessage?.message ||
      atual.viewOnceMessage?.message ||
      atual.viewOnceMessageV2?.message ||
      atual.viewOnceMessageV2Extension?.message ||
      atual.documentWithCaptionMessage?.message;
    if (!interno) break;
    atual = interno;
  }
  return atual;
}

export function detectarTipoMidia(msg) {
  const m = desembrulhar(msg.message);
  if (m.stickerMessage) return 'figurinha';
  if (m.imageMessage) return 'imagem';
  if (m.videoMessage || m.ptvMessage) return 'video';
  if (m.audioMessage) return 'audio';
  if (m.documentMessage) return 'documento';
  if (m.contactMessage || m.contactsArrayMessage) return 'contato';
  if (m.locationMessage || m.liveLocationMessage) return 'localizacao';
  return null;
}

const avisoMidiaRecente = new Map(); // evita avisar a cada mídia apagada

async function apagar(client, jid, key) {
  try { await client.sendMessage(jid, { delete: key }); } catch (e) {}
}

export async function verificarProtecoes(client, msg, jid, sender) {
  try {
    if (!sender || msg.key.fromMe) return false;

    const cfg = getProtecao(jid);
    const tipo = detectarTipoMidia(msg);

    // Mídia com comando na legenda (ex.: /s) é liberada para não quebrar o bot
    const ehComando = getText(msg).trim().startsWith(PREFIX);
    const violouMidia = !!(tipo && cfg.antiMidia[tipo] && !ehComando);

    let rajada = [];
    let violouSpam = false;
    if (cfg.antiSpam.ativo) {
      rajada = registrarMensagemSpam(jid, sender, msg.key, cfg.antiSpam.janela);
      violouSpam = rajada.length > cfg.antiSpam.limite;
    }

    if (!violouMidia && !violouSpam) return false;

    // Admins e dono nunca são punidos
    if (isOwner(sender)) return false;
    const meta = await client.groupMetadata(jid).catch(() => null);
    if (isAdmin(sender, meta)) return false;

    const numero = sender.split('@')[0].split(':')[0];

    // ---------- ANTI-MÍDIA ----------
    if (violouMidia) {
      await apagar(client, jid, msg.key);

      const k = `${jid}|${tipo}`;
      const agora = Date.now();
      if (agora - (avisoMidiaRecente.get(k) || 0) > 20 * 1000) {
        avisoMidiaRecente.set(k, agora);
        try {
          await client.sendMessage(jid, {
            text: `🚫 @${numero}, *${NOMES_MIDIA[tipo].plural}* não são permitidos neste grupo.`,
            mentions: [sender]
          });
        } catch (e) {}
      }
      return true;
    }

    // ---------- ANTI-SPAM ----------
    for (const m of rajada) await apagar(client, jid, m.key);
    resetarHistoricoSpam(jid, sender);

    const { acao, limite, janela } = cfg.antiSpam;
    const motivo = `Spam: mais de ${limite} mensagens em ${janela}s`;

    if (acao === 'banir') {
      try {
        await client.groupParticipantsUpdate(jid, [sender], 'remove');
        await client.sendMessage(jid, {
          text: `🚫 *ANTI-SPAM*\n\n@${numero} foi removido por flood de mensagens.`,
          mentions: [sender]
        });
      } catch (e) {
        await client.sendMessage(jid, {
          text: `⚠️ *ANTI-SPAM*\n\n@${numero} fez flood, mas não consegui removê-lo (preciso ser admin).`,
          mentions: [sender]
        }).catch(() => {});
      }
      return true;
    }

    if (acao === 'advertir') {
      const MAX_WARNS = 3;
      const total = adicionarWarn(jid, sender, motivo, 'Anti-Spam');

      if (total >= MAX_WARNS) {
        try {
          await client.groupParticipantsUpdate(jid, [sender], 'remove');
          limparWarns(jid, sender);
          await client.sendMessage(jid, {
            text: `🚫 *BANIDO AUTOMATICAMENTE*\n\n👤 @${numero}\n⚠️ Atingiu *${MAX_WARNS} advertências* (flood de mensagens).`,
            mentions: [sender]
          });
        } catch (e) {
          await client.sendMessage(jid, {
            text: `⚠️ @${numero} atingiu ${MAX_WARNS} advertências, mas não consegui removê-lo (preciso ser admin).`,
            mentions: [sender]
          }).catch(() => {});
        }
        return true;
      }

      await client.sendMessage(jid, {
        text: `⚠️ *ANTI-SPAM*\n\n@${numero}, pare de floodar o grupo!\n📊 Advertências: *${total}/${MAX_WARNS}*`,
        mentions: [sender]
      }).catch(() => {});
      return true;
    }

    // acao === 'avisar'
    await client.sendMessage(jid, {
      text: `⚠️ *ANTI-SPAM*\n\n@${numero}, calma! Máximo de *${limite} mensagens a cada ${janela}s*.\n_Suas mensagens foram apagadas._`,
      mentions: [sender]
    }).catch(() => {});
    return true;
  } catch (e) {
    console.error('[PROTEÇÃO] Erro:', e.message);
    return false;
  }
}

// =========================================
// 🚪 LISTA NEGRA NA ENTRADA DE MEMBROS
// (chamada pelo connect.js em 'group-participants.update')
// Retorna um Set com os JIDs removidos
// =========================================
export async function verificarEntradaListaNegra(client, grupoJid, participants) {
  const removidos = new Set();

  try {
    const cfg = getProtecao(grupoJid);
    if (cfg.listaNegra.length === 0) return removidos;

    let meta = null;
    const achar = ids => cfg.listaNegra.find(e => e.ids.some(i => ids.includes(i)));

    for (const p of participants) {
      const jid = extrairJid(p);
      if (!jid) continue;

      let ids = identificadores(p);
      let entrada = achar(ids);

      // Evento só com LID: tenta descobrir o telefone pelos metadados do grupo
      if (!entrada) {
        meta = meta || await client.groupMetadata(grupoJid).catch(() => null);
        const part = acharParticipante(meta, ids);
        if (part) {
          ids = identificadores(part);
          entrada = achar(ids);
        }
      }

      if (!entrada) continue;

      try {
        await client.groupParticipantsUpdate(grupoJid, [jid], 'remove');
        removidos.add(jid);
        await client.sendMessage(grupoJid, {
          text: `⛔ *LISTA NEGRA*\n\n@${jid.split('@')[0].split(':')[0]} foi removido automaticamente.\n📝 Motivo: ${entrada.motivo}`,
          mentions: [jid]
        });
      } catch (e) {
        console.error('[LISTA NEGRA] Erro ao remover:', e.message);
      }
    }
  } catch (e) {
    console.error('[LISTA NEGRA] Erro:', e.message);
  }

  return removidos;
}
