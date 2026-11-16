import fs from 'node:fs';
import { PREFIX } from '../config.js';
import { isOwner, isAdmin } from '../functions/permissions.js';
import { isVIP } from '../functions/vipDB.js';
import { enviarBotoes, botaoLista, botaoResposta } from '../functions/botoes.js';

// =========================================
// PERSONALIZAÇÃO (é só trocar aqui)
// =========================================
export const MENU_BOTOES = {
  nome: 'FREDDY BOT',          // nome mostrado no título e no campo BOT
  emoji: '🧸',                  // emoji principal
  detalhe: '🍯',                // emoji de enfeite
  tituloBotao: 'MENU FREDDY',  // texto do botão que abre a lista
  rodape: '© Freddy Bots',
  usarFoto: false              // true = usa ./src/assets/menus/menu.jpg no topo da mensagem
};

// Categorias da lista (máximo de 10 opções no total)
// cmd = comando que roda quando a pessoa toca na opção
const CATEGORIAS = [
  { secao: '🛡️ MENU ADMIN',      tag: 'Admins',    titulo: 'MENU ADMIN',      desc: 'COMANDOS ADMINISTRATIVOS.', cmd: 'menuadmin' },
  { secao: '👥 MENU MEMBROS',    tag: 'Membros',   titulo: 'MENU MEMBROS',    desc: 'COMANDOS PARA TODOS.',      cmd: 'menumembros' },
  { secao: '🎮 MENU GAME',       tag: 'Games',     titulo: 'MENU GAME',       desc: 'JOGOS E DIVERSÃO.',         cmd: 'menugame' },
  { secao: '🗡️ MENU RPG',        tag: 'RPG',       titulo: 'MENU RPG',        desc: 'SISTEMA RPG.',              cmd: 'menurg' },
  { secao: '🐾 MENU POKÉMON',    tag: 'Pokémon',   titulo: 'MENU POKÉMON',    desc: 'CAPTURE E BATALHE.',        cmd: 'pokemon' },
  { secao: '📥 MENU DOWNLOADS',  tag: 'Downloads', titulo: 'MENU DOWNLOADS',  desc: 'DOWNLOADS E PESQUISAS.',    cmd: 'menubaixar' },
  { secao: '🕊️ MENU RELIGIOSO',  tag: 'Fé',        titulo: 'MENU RELIGIOSO',  desc: 'CONTEÚDO RELIGIOSO.',       cmd: 'menureligioso' },
  { secao: '💎 MENU VIP',        tag: 'VIP 💎',    titulo: 'MENU VIP',        desc: 'COMANDOS EXCLUSIVOS.',      cmd: 'menuvip' },
  { secao: '👑 MENU DO DONO',    tag: 'Dono 👑',   titulo: 'MENU DO DONO',    desc: 'ÁREA DO DONO.',             cmd: 'menudono' }
];

// =========================================
// AUXILIARES
// =========================================
function getFotoMenu(nomeMenu) {
  const caminho = `./src/assets/menus/${nomeMenu}.jpg`;
  if (fs.existsSync(caminho)) return fs.readFileSync(caminho);
  return null;
}

function getVersao() {
  try {
    return JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version || '1.0.0';
  } catch (e) {
    return '1.0.0';
  }
}

export function formatarUptime(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m ${s % 60}s`;
}

function cargoDe(sender, groupMetadata) {
  if (isOwner(sender)) return '👑 Dono';
  if (groupMetadata && isAdmin(sender, groupMetadata)) return '🛡️ Admin';
  return '👤 Membro';
}

// =========================================
// MONTAGEM DO MENU (separada para poder testar)
// =========================================
export function montarMenuBotoes({ sender, groupMetadata, uptime = process.uptime() }) {
  const c = MENU_BOTOES;
  const numero = sender.split('@')[0].split(':')[0];
  const linha = `◈•${c.emoji}•◈`;

  const corpo =
    `╭━━━━━━━━━${linha}━━━━━━━━━╮\n` +
    `   ${c.detalhe} *MENU PRINCIPAL* ${c.detalhe}\n` +
    `╰━━━━━━━━━${linha}━━━━━━━━━╯\n` +
    `\n` +
    `👤 *USUÁRIO:* @${numero}\n` +
    `🎖️ *CARGO:* ${cargoDe(sender, groupMetadata)}\n` +
    `💎 *VIP:* ${isVIP(sender) ? '✅ Sim' : '❌ Não'}\n` +
    `🤖 *BOT:* ${c.nome}\n` +
    `📦 *VERSÃO:* ${getVersao()}\n` +
    `⏱️ *ONLINE:* ${formatarUptime(uptime)}\n` +
    `\n` +
    `${c.emoji} Escolha uma categoria abaixo!\n` +
    `💡 _Sem botões? Use ${PREFIX}menutexto_\n` +
    `\n` +
    `╭━━━━━━━━━${linha}━━━━━━━━━╮`;

  const secoes = CATEGORIAS.map(cat => ({
    titulo: cat.secao,
    linhas: [{
      titulo: `『${c.emoji}』 ─═ ${cat.titulo}`,
      descricao: cat.desc,
      tag: cat.tag,
      id: `${PREFIX}${cat.cmd}`
    }]
  }));

  return {
    titulo: `${c.emoji} ${c.nome} ${c.detalhe}`,
    corpo,
    rodape: c.rodape,
    mencoes: [sender],
    botoes: [
      botaoLista(c.tituloBotao, secoes),
      botaoResposta('⚡ PING', `${PREFIX}ping`)
    ]
  };
}

// =========================================
// COMANDO: !menu (com botões)
// `fallback` = função do menu de texto antigo, usada se o envio falhar
// =========================================
export async function executeMenuBotoes(ctx, fallback = null) {
  const { client, msg, sender, groupMetadata, reply } = ctx;
  const jid = msg.key.remoteJid;

  try {
    const opcoes = montarMenuBotoes({ sender, groupMetadata });
    if (MENU_BOTOES.usarFoto) opcoes.imagem = getFotoMenu('menu');
    await enviarBotoes(client, jid, opcoes);
  } catch (e) {
    console.error('[BOTÕES] Falha ao enviar o menu com botões:', e.message);
    if (typeof fallback === 'function') return fallback(ctx);
    return reply('❌ Não consegui enviar o menu com botões agora. Tente de novo em instantes.');
  }
}

// =========================================
// COMANDO: !ping
// =========================================
export async function executePing(ctx) {
  const { reply, msg } = ctx;

  const enviadaEm = Number(msg.messageTimestamp) * 1000;
  const latencia = Number.isFinite(enviadaEm) && enviadaEm > 0 ? Math.max(0, Date.now() - enviadaEm) : null;

  return reply(
    `🏓 *PONG!*\n\n` +
    (latencia !== null ? `⚡ *Latência:* ${latencia} ms\n` : '') +
    `⏱️ *Online:* ${formatarUptime(process.uptime())}\n` +
    `${MENU_BOTOES.emoji} *${MENU_BOTOES.nome}* funcionando!`
  );
}
