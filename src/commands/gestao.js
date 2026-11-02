import { PREFIX, OWNER_NUMBER } from '../config.js';
import { isAdmin, isOwner } from '../functions/permissions.js';
import { getText } from '../functions/helpers.js';
import {
  getConfig,
  setAtivo,
  setHoraAbrir,
  setHoraFechar,
  setUltimaAcao,
  listarGruposAtivos
} from '../functions/autoFecharDB.js';
import {
  registrarAtividade,
  registrarEntrada,
  getAtividade,
  removerMembro,
  getRegras,
  setRegras,
  delRegras,
  setRegrasAuto
} from '../functions/gestaoDB.js';
import {
  semAcento,
  soDigitos,
  extrairJid,
  identificadores,
  numeroTelefone
} from './protecao.js';

// =========================================
// AUXILIARES
// =========================================
const FUSO = 'America/Sao_Paulo';
const DIA_MS = 24 * 60 * 60 * 1000;

// Função à prova de falhas (LID vs Número)
function souAdmin(ctx) {
  if (isOwner(ctx.sender)) return true;
  
  const senderNum = soDigitos(ctx.sender);
  const participants = ctx.groupMetadata?.participants || [];
  
  // Procura o participante comparando os números
  const part = participants.find(p => {
    const ids = identificadores(p);
    return ids.includes(senderNum);
  });

  if (part && part.admin) return true;
  
  // Fallback pro isAdmin padrão
  return isAdmin(ctx.sender, ctx.groupMetadata);
}

function checar(ctx) {
  if (!ctx.isGroup) return '❌ Este comando só funciona em grupos.';
  if (!souAdmin(ctx)) return '❌ Apenas administradores podem usar este comando.';
  return null;
}

function pad(n) { return String(n).padStart(2, '0'); }
function dataBR(ts) { return new Date(ts).toLocaleDateString('pt-BR', { timeZone: FUSO }); }

// =========================================
// ⏰ SISTEMA 4: AUTO-FECHAR / AUTO-ABRIR
// =========================================
export function parseHora(txt) {
  const m = String(txt || '').trim().toLowerCase().match(/^(\d{1,2})(?:[:h](\d{2}))?h?$/);
  if (!m) return null;
  const h = parseInt(m[1]);
  const min = m[2] ? parseInt(m[2]) : 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

export function agoraBrasilia() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = t => partes.find(p => p.type === t).value;
  return { data: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}` };
}

function statusAutoFechar(c) {
  return (
    `⏰ *AUTO-FECHAR*\n\n` +
    `Status: ${c.ativo ? '✅ ATIVADO' : '❌ DESATIVADO'}\n` +
    `🔒 Fecha às: *${c.horaFechar || 'não definido'}*\n` +
    `🔓 Abre às: *${c.horaAbrir || 'não definido'}*\n` +
    `🕐 Horário de Brasília\n\n` +
    `*Comandos:*\n` +
    `• ${PREFIX}autofechar 22:00 06:00 (fecha e abre)\n` +
    `• ${PREFIX}autofechar fechar <hora>\n` +
    `• ${PREFIX}autofechar abrir <hora>\n` +
    `• ${PREFIX}autofechar on/off\n\n` +
    `💡 O bot precisa ser admin e estar online no horário.`
  );
}

export async function executeAutoFechar(ctx) {
  const { reply, args, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const sub = semAcento(args[0]);

  const h1 = parseHora(args[0]);
  const h2 = parseHora(args[1]);
  if (h1 && h2) {
    if (h1 === h2) return reply('❌ O horário de fechar e abrir não podem ser iguais.');
    setHoraFechar(grupoJid, h1);
    setHoraAbrir(grupoJid, h2);
    setAtivo(grupoJid, true);
    return reply(`✅ *AUTO-FECHAR ATIVADO*\n\n🔒 Fecha todo dia às *${h1}*\n🔓 Abre todo dia às *${h2}*\n🕐 Horário de Brasília`);
  }

  if (sub === 'fechar' || sub === 'abrir') {
    const hora = parseHora(args[1]);
    if (!hora) return reply(`❌ Horário inválido.\nExemplo: ${PREFIX}autofechar ${sub} ${sub === 'fechar' ? '22:00' : '06:00'}`);
    const c = getConfig(grupoJid);
    const outra = sub === 'fechar' ? c.horaAbrir : c.horaFechar;
    if (outra === hora) return reply('❌ O horário de fechar e abrir não podem ser iguais.');
    if (sub === 'fechar') setHoraFechar(grupoJid, hora);
    else setHoraAbrir(grupoJid, hora);

    const atual = getConfig(grupoJid);
    const pronto = atual.horaFechar && atual.horaAbrir;
    if (pronto && !atual.ativo) setAtivo(grupoJid, true);
    return reply(`✅ Horário de *${sub === 'fechar' ? 'fechar' : 'abrir'}* definido: *${hora}*\n\n` + (pronto ? `⏰ Auto-fechar ativo: fecha às *${atual.horaFechar}* e abre às *${atual.horaAbrir}*.` : `⚠️ Falta definir o horário de *${sub === 'fechar' ? 'abrir' : 'fechar'}* para ativar.`));
  }

  if (sub === 'on') {
    const c = getConfig(grupoJid);
    if (!c.horaFechar || !c.horaAbrir) return reply(`❌ Defina os horários primeiro.\nExemplo: ${PREFIX}autofechar 22:00 06:00`);
    setAtivo(grupoJid, true);
    return reply(`✅ *AUTO-FECHAR ATIVADO*\n\n🔒 ${c.horaFechar} → 🔓 ${c.horaAbrir}`);
  }

  if (sub === 'off') {
    setAtivo(grupoJid, false);
    return reply('🔓 *AUTO-FECHAR DESATIVADO*');
  }

  return reply(statusAutoFechar(getConfig(grupoJid)));
}

let clienteAtual = null;
let intervalo = null;

export async function verificarHorarios(agora = agoraBrasilia()) {
  const client = clienteAtual;
  if (!client) return;

  for (const g of listarGruposAtivos()) {
    let acao = null;
    if (g.horaFechar === agora.hora) acao = 'fechar';
    else if (g.horaAbrir === agora.hora) acao = 'abrir';
    if (!acao) continue;

    const marca = `${acao}@${agora.data} ${agora.hora}`;
    if (g.ultimaAcao === marca) continue;
    setUltimaAcao(g.jid, marca);

    try {
      await client.groupSettingUpdate(g.jid, acao === 'fechar' ? 'announcement' : 'not_announcement');
      await client.sendMessage(g.jid, {
        text: acao === 'fechar'
          ? `🔒 *GRUPO FECHADO*\n\nO grupo foi fechado automaticamente e abre às *${g.horaAbrir}*.`
          : `🔓 *GRUPO ABERTO*\n\nO grupo foi aberto automaticamente e fecha às *${g.horaFechar}*.`
      });
      console.log(`[AUTO-FECHAR] ${acao} -> ${g.jid}`);
    } catch (e) {
      console.error(`[AUTO-FECHAR] Erro ao ${acao} ${g.jid}:`, e.message);
      // AVISA NO GRUPO SE DER ERRO
      try {
        await client.sendMessage(g.jid, {
          text: `⚠️ *AUTO-FECHAR*\n\nTentei ${acao} o grupo, mas falhei.\n📝 Motivo: *${e.message}*\n💡 Verifique se eu sou administrador.`
        });
      } catch (err) {}
    }
  }
}

export function iniciarAutoFechar(client) {
  clienteAtual = client;
  if (intervalo) return;
  intervalo = setInterval(() => {
    verificarHorarios().catch(e => console.error('[AUTO-FECHAR] Erro:', e.message));
  }, 20 * 1000);
}

// =========================================
// 📊 SISTEMA 5: ATIVIDADE E INATIVOS
// =========================================
export function registrarAtividadeMsg(msg, grupoJid, sender) {
  const m = msg.message || {};
  if (m.protocolMessage || m.reactionMessage) return;
  registrarAtividade(grupoJid, soDigitos(sender));
}

function combinar(membros, ids) {
  const recs = ids.map(i => membros[i]).filter(Boolean);
  if (recs.length === 0) return null;
  return {
    n: recs.reduce((s, r) => s + (r.n || 0), 0),
    ultima: Math.max(...recs.map(r => r.ultima || 0)) || null,
    desde: Math.max(...recs.map(r => r.desde || 0))
  };
}

function idsProtegidos(client) {
  return new Set([soDigitos(OWNER_NUMBER), soDigitos(client.user?.id), soDigitos(client.user?.lid)].filter(Boolean));
}

export function listarInativos(client, groupMetadata, info, dias) {
  const limite = Date.now() - dias * DIA_MS;
  const protegidos = idsProtegidos(client);
  const lista = [];

  for (const p of groupMetadata?.participants || []) {
    if (p.admin) continue;
    const ids = identificadores(p);
    if (ids.some(i => protegidos.has(i))) continue;
    const rec = combinar(info.membros, ids);
    const ref = rec ? Math.max(rec.ultima || 0, rec.desde || 0) : info.inicio;
    if (ref < limite) lista.push({ p, ids, ref, n: rec?.n || 0 });
  }
  return lista.sort((a, b) => a.ref - b.ref);
}

function textoTempo(ref) {
  const d = Math.floor((Date.now() - ref) / DIA_MS);
  return d <= 0 ? 'hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

export async function executeAtividade(ctx) {
  const { reply, client, msg, groupMetadata } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const info = getAtividade(grupoJid);
  const desde = dataBR(info.inicio);

  const membros = [];
  for (const p of groupMetadata?.participants || []) {
    const ids = identificadores(p);
    if (ids.some(i => i === soDigitos(client.user?.id) || i === soDigitos(client.user?.lid))) continue;
    const rec = combinar(info.membros, ids);
    membros.push({ p, ids, n: rec?.n || 0, ultima: rec?.ultima || null });
  }
  membros.sort((a, b) => b.n - a.n);

  const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mencionado) {
    const alvoIds = identificadores(mencionado);
    const pos = membros.findIndex(m => m.ids.some(i => alvoIds.includes(i)));
    if (pos === -1) return reply('❌ Esse usuário não está no grupo.');
    const m = membros[pos];
    return reply(`📊 *ATIVIDADE*\n\n👤 @${m.p.id.split('@')[0]}\n💬 Mensagens: *${m.n}*\n🏆 Posição: *${pos + 1}º* de ${membros.length}\n🕐 Última mensagem: *${m.ultima ? textoTempo(m.ultima) : 'nenhuma registrada'}*\n\n📅 Monitorando desde ${desde}`, { mentions: [m.p.id] });
  }

  const ativos = membros.filter(m => m.n > 0).slice(0, 10);
  if (ativos.length === 0) return reply(`📊 *ATIVIDADE*\n\nAinda não registrei mensagens neste grupo.\n📅 Monitorando desde ${desde}`);

  const medalhas = ['🥇', '🥈', '🥉'];
  const linhas = ativos.map((m, i) => `${medalhas[i] || `*${i + 1}.*`} @${m.p.id.split('@')[0]} — *${m.n}* msgs`);
  const total = membros.reduce((s, m) => s + m.n, 0);

  return reply(`🏆 *MEMBROS MAIS ATIVOS*\n\n${linhas.join('\n')}\n\n💬 Total: *${total}* mensagens\n📅 Monitorando desde ${desde}\n\n💡 ${PREFIX}atividade @user | ${PREFIX}inativos <dias>`, { mentions: ativos.map(m => m.p.id) });
}

export async function executeInativos(ctx) {
  const { reply, client, msg, groupMetadata, args } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const dias = args[0] ? parseInt(args[0]) : 7;
  if (!dias || dias < 1 || dias > 365) return reply(`❌ Informe os dias (1 a 365).\nExemplo: ${PREFIX}inativos 15`);

  const info = getAtividade(msg.key.remoteJid);
  const lista = listarInativos(client, groupMetadata, info, dias);
  const desde = dataBR(info.inicio);
  const parcial = info.inicio > Date.now() - dias * DIA_MS;

  if (lista.length === 0) return reply(`💤 *INATIVOS (${dias} dias)*\n\nNenhum membro inativo encontrado. ✅\n\n📅 Monitorando desde ${desde}` + (parcial ? `\n⚠️ Ainda não tenho ${dias} dias de dados.` : ''));

  const MAX = 40;
  const linhas = lista.slice(0, MAX).map((i, idx) => `${idx + 1}. +${numeroTelefone(i.p)} — ${i.n > 0 ? `última ${textoTempo(i.ref)}` : 'sem mensagens'}`);
  const resto = lista.length > MAX ? `\n… e mais *${lista.length - MAX}*.` : '';

  return reply(`💤 *INATIVOS (${dias} dias)* — ${lista.length}\n\n${linhas.join('\n')}${resto}\n\n📅 Monitorando desde ${desde}\n👮 Admins e o dono não entram na lista.\n\n🧹 Para remover: ${PREFIX}rminativos ${Math.max(dias, 7)} confirmar`);
}

export async function executeRmInativos(ctx) {
  const { reply, client, msg, groupMetadata, args } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  const grupoJid = msg.key.remoteJid;
  const dias = parseInt(args[0]);
  const confirmou = args.slice(1).some(a => semAcento(a) === 'confirmar');

  if (!dias || dias < 7 || dias > 365) return reply(`🧹 *REMOVER INATIVOS*\n\nUse: ${PREFIX}rminativos <dias> confirmar\nExemplo: ${PREFIX}rminativos 30 confirmar\n\n⚠️ Mínimo: *7 dias* | Máximo: *365*`);

  const info = getAtividade(grupoJid);
  const lista = listarInativos(client, groupMetadata, info, dias);
  if (lista.length === 0) return reply(`✅ Nenhum membro inativo há ${dias} dias ou mais.`);

  const LIMITE = 50;
  const alvos = lista.slice(0, LIMITE);

  if (!confirmou) return reply(`⚠️ *CONFIRMAÇÃO NECESSÁRIA*\n\n*${alvos.length}* membro(s) inativo(s) há ${dias}+ dias seriam removidos` + (lista.length > LIMITE ? ` (limite de ${LIMITE} por vez)` : '') + `.\n\nPara confirmar:\n${PREFIX}rminativos ${dias} confirmar\n\n👀 Para ver: ${PREFIX}inativos ${dias}`);

  const pausa = ctx.pausaMs ?? 1200;
  let removidos = 0;
  let falhas = 0;
  let seguidas = 0;

  for (const a of alvos) {
    try {
      await client.groupParticipantsUpdate(grupoJid, [a.p.id], 'remove');
      removerMembro(grupoJid, a.ids);
      removidos++;
      seguidas = 0;
    } catch (e) {
      falhas++;
      seguidas++;
      if (seguidas >= 3) break;
    }
    if (pausa > 0) await new Promise(r => setTimeout(r, pausa));
  }

  if (removidos === 0) return reply('❌ Não consegui remover ninguém. Verifique se sou admin do grupo.');

  return reply(`🧹 *INATIVOS REMOVIDOS*\n\n✅ Removidos: *${removidos}*\n` + (falhas ? `⚠️ Falhas: *${falhas}*\n` : '') + (lista.length > alvos.length ? `📋 Restam *${lista.length - alvos.length}*. Rode o comando de novo.\n` : ''));
}

// =========================================
// 📜 SISTEMA 6: REGRAS DO GRUPO
// =========================================
const MAX_REGRAS = 3000;

export async function executeSetRegras(ctx) {
  const { reply, msg, pushName } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);

  let texto = getText(msg).replace(/^\S+\s*/, '').trim();
  if (!texto) {
    const citada = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    texto = (citada?.conversation || citada?.extendedTextMessage?.text || '').trim();
  }

  if (!texto) return reply(`📜 *DEFINIR REGRAS*\n\nUse: ${PREFIX}setregras <texto das regras>\nOu responda a uma mensagem com ${PREFIX}setregras\n\n💡 Pode usar várias linhas e emojis.`);
  if (texto.length > MAX_REGRAS) return reply(`❌ Texto muito grande (${texto.length}). O máximo é *${MAX_REGRAS}* caracteres.`);

  setRegras(msg.key.remoteJid, texto, pushName || 'Admin');
  return reply(`✅ *REGRAS SALVAS*\n\nMembros podem ver com *${PREFIX}regras*.`);
}

export async function executeRegras(ctx) {
  const { reply, msg, args, isGroup } = ctx;
  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');

  const grupoJid = msg.key.remoteJid;
  const sub = semAcento(args[0]);

  if (sub === 'auto') {
    const erro = checar(ctx);
    if (erro) return reply(erro);

    const estado = semAcento(args[1]);
    const r = getRegras(grupoJid);

    if (estado !== 'on' && estado !== 'off') return reply(`🔔 *REGRAS AUTOMÁTICAS*\n\nStatus: ${r.auto ? '✅ ATIVADO' : '❌ DESATIVADO'}\n\nQuando ativado, as regras são enviadas para quem entrar.\n\nUse: ${PREFIX}regras auto on/off`);
    if (estado === 'on' && !r.texto) return reply(`❌ Defina as regras primeiro com ${PREFIX}setregras <texto>.`);

    setRegrasAuto(grupoJid, estado === 'on');
    return reply(estado === 'on' ? '✅ *REGRAS AUTOMÁTICAS ATIVADAS*' : '🔕 *REGRAS AUTOMÁTICAS DESATIVADAS*');
  }

  const r = getRegras(grupoJid);
  if (!r.texto) return reply(`📜 Este grupo ainda não tem regras definidas.\n\n👮 Admins: use ${PREFIX}setregras <texto>.`);
  return reply(`📜 *REGRAS DO GRUPO*\n\n${r.texto}`);
}

export async function executeDelRegras(ctx) {
  const { reply, msg } = ctx;
  const erro = checar(ctx);
  if (erro) return reply(erro);
  if (!getRegras(msg.key.remoteJid).texto) return reply('⚠️ Este grupo não tem regras definidas.');
  delRegras(msg.key.remoteJid);
  return reply('🗑️ *REGRAS REMOVIDAS*');
}

export async function verificarEntradaGestao(client, grupoJid, participants, removidos = new Set()) {
  try {
    const novos = [];
    for (const p of participants) {
      const jid = extrairJid(p);
      if (!jid || removidos.has(jid)) continue;
      registrarEntrada(grupoJid, identificadores(p)[0]);
      novos.push(jid);
    }

    const r = getRegras(grupoJid);
    if (r.auto && r.texto && novos.length > 0) {
      await client.sendMessage(grupoJid, {
        text: `📜 *REGRAS DO GRUPO*\n\n${novos.map(j => `@${j.split('@')[0].split(':')[0]}`).join(' ')}, leia as regras:\n\n${r.texto}`,
        mentions: novos
      });
    }
  } catch (e) {
    console.error('[GESTAO] Erro na entrada:', e.message);
  }
}
