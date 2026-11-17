import fs from 'node:fs';
import { PREFIX, OWNER_NUMBER } from '../config.js'; // 👈 Adicionado OWNER_NUMBER
import { isOwner, isAdmin } from '../functions/permissions.js';
import { isVIP } from '../functions/vipDB.js';
import { enviarBotoes, botaoLista, botaoResposta } from '../functions/botoes.js';

// =========================================
// PERSONALIZAÇÃO (é só trocar aqui)
// =========================================
export const MENU_BOTOES = {
  nome: 'FREDDY BOT',          
  emoji: '🧸',                  
  detalhe: '🍯',                
  tituloBotao: 'MENU FREDDY',  
  rodape: '© Freddy Bots',
  usarFoto: false              
};

// Categorias da lista (máximo de 10 opções no total)
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
// MONTAGEM DO MENU
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
      botaoResposta('⚡ MEU DONO', `${PREFIX}ping`)
    ]
  };
}

// =========================================
// COMANDO: !menu (com botões)
// =========================================
export async function executeMenuBotoes(ctx, fallback = null) {
  const { client, msg, sender, groupMetadata, reply } = ctx;
  const jid = msg.key.remoteJid;

  try {
    const opcoes = montarMenuBotoes({ sender, groupMetadata });
    if (MENU_BOTOES.usarFoto) opcoes.imagem = getFotoMenu('menu');
    await enviarBotoes(client, jid, opcoes, msg);
  } catch (e) {
    console.error('[BOTÕES] Falha ao enviar o menu com botões:', e.message);
    if (typeof fallback === 'function') return fallback(ctx);
    return reply('❌ Não consegui enviar o menu com botões agora. Tente de novo em instantes.');
  }
}

// =========================================
// COMANDO: !ping (AGORA É O CONTATO DO DONO)
// =========================================
export async function executePing(ctx) {
  const { client, msg, jid, reply } = ctx;
  
  // Pega o número do dono do config.js (remove o @s.whatsapp.net se tiver)
  const numeroDono = OWNER_NUMBER ? OWNER_NUMBER.split('@')[0] : 'Não configurado';

  const texto = `*⚡ MEU DONO ⚡*\n\n` +
    `O número do meu dono é: *+${numeroDono}*\n\n` +
    `🛒 Se você quiser comprar o bot, só chamar no PV (privado) neste número!\n\n` +
    `👇 Toque no botão abaixo para abrir o menu de membros.`;

  const botoes = [
    botaoResposta('👥 ABRIR MENU MEMBROS', `${PREFIX}menumembros`)
  ];

  try {
    await enviarBotoes(client, jid, {
      titulo: '⚡ Contato do Dono',
      corpo: texto,
      rodape: '© Pikachu Bot',
      botoes: botoes
    }, msg);
  } catch (e) {
    console.error('[DONO] Erro ao enviar botões:', e.message);
    return reply(texto);
  }
}
