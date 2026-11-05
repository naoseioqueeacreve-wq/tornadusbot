import { PREFIX } from '../config.js';
import {
  CONFIG_RAID,
  TIERS,
  getRaid,
  raidAtivoNoGrupo,
  proximaRaidDoGrupo,
  fmtHoraBrasilia,
  ativarRaidGrupo,
  desativarRaidGrupo,
  entrarNaRaid,
  sairDaRaid,
  capturarRaid,
  infoPasses,
  comprarPasses,
  forcarRaid,
  textoChefe,
  fmtNum,
  fmtTempo
} from '../functions/pokemonRaid.js';

// =========================================
// AUXILIARES
// =========================================
function tag(jid) {
  return `@${String(jid).split('@')[0].split(':')[0]}`;
}

async function soDono(ctx) {
  const { isOwner } = await import('../functions/permissions.js');
  if (!isOwner(ctx.sender)) {
    await ctx.reply('❌ Apenas o dono do bot pode usar este comando.');
    return false;
  }
  return true;
}

// =========================================
// COMANDO: !raid [entrar | sair | capturar | passe | ajuda]
// =========================================
export async function executeRaid(ctx) {
  const { reply, args, isGroup } = ctx;
  if (!isGroup) return reply('❌ As raids acontecem dentro dos grupos.');

  const sub = String(args[0] || '').toLowerCase();

  if (sub === 'entrar' || sub === 'join' || sub === 'participar') return raidEntrar(ctx);
  if (sub === 'sair') return raidSair(ctx);
  if (sub === 'capturar' || sub === 'pegar') return raidCapturar(ctx);
  if (sub === 'passe' || sub === 'passes') return executePasse(ctx);
  if (sub === 'ajuda' || sub === 'help') return raidAjuda(ctx);
  return raidStatus(ctx);
}

// ---------- ajuda ----------
async function raidAjuda({ reply }) {
  return reply(
    `🔥 *RAIDS POKÉMON* 🔥\n\n` +
    `1️⃣ Um *ovo* aparece no grupo e eclode.\n` +
    `2️⃣ Entre no lobby: *${PREFIX}raid entrar* [n1 n2 n3]\n` +
    `   _(gasta 1 Passe de Raid; time de até ${CONFIG_RAID.timeMax} Pokémon)_\n` +
    `3️⃣ Quando a contagem acabar, todos lutam *juntos* contra o chefe.\n` +
    `4️⃣ Venceu? Ganha recompensas e captura com *${PREFIX}raid capturar*.\n\n` +
    `📋 ${PREFIX}raid — status da raid\n` +
    `🚪 ${PREFIX}raid sair — sai do lobby (devolve o passe)\n` +
    `🎫 ${PREFIX}passe — seus passes | ${PREFIX}comprarpasse [qtd]`
  );
}

// ---------- status ----------
async function raidStatus(ctx) {
  const { reply, sender, msg } = ctx;
  const jid = msg.key.remoteJid;
  const raid = getRaid(jid);
  const agora = Date.now();

  if (!raid) {
    return reply(
      raidAtivoNoGrupo(jid)
        ? `🔥 *RAIDS*\n\nNenhuma raid agora. Os ovos aparecem de tempos em tempos (entre ${CONFIG_RAID.horario[0]}h e ${CONFIG_RAID.horario[1]}h).\n\n📖 ${PREFIX}raid ajuda`
        : `🔥 *RAIDS*\n\nAs raids não estão ativadas neste grupo.\n👑 O dono pode ativar com *${PREFIX}ativarraid*.`
    );
  }

  const c = TIERS[raid.tier];

  if (raid.fase === 'ovo') {
    return reply(
      `🥚 *OVO DE RAID* ${c.estrelas}\n\n` +
      `⏰ Eclode em *${fmtTempo(raid.eclodeEm - agora)}*\n\n` +
      `💡 Tenha seu Passe de Raid pronto: ${PREFIX}passe`
    );
  }

  if (raid.fase === 'aberta') {
    const jogadores = raid.lobby ? Object.keys(raid.lobby.jogadores) : [];
    let texto =
      `🔥 *RAID ABERTA* 🔥\n\n${textoChefe(raid)}\n` +
      `⏳ A raid termina em *${fmtTempo(raid.fechaEm - agora)}*\n\n`;

    if (jogadores.length === 0) {
      texto += `👥 Lobby vazio. Seja o primeiro: *${PREFIX}raid entrar*`;
    } else {
      texto +=
        `👥 *Lobby (${jogadores.length}/${CONFIG_RAID.maxJogadores}):* ${jogadores.map(tag).join(' ')}\n` +
        `⚔️ Batalha começa em *${fmtTempo(raid.lobby.iniciaEm - agora)}*\n` +
        `➕ Entre também: *${PREFIX}raid entrar*`;
    }
    if (raid.tentativas > 0) texto += `\n🔁 Tentativas anteriores: ${raid.tentativas}`;
    return reply(texto, { mentions: jogadores });
  }

  // fase de captura
  const v = raid.vencedores[sender];
  const capturaram = Object.values(raid.vencedores).filter(x => x.capturou).length;
  let texto =
    `🎯 *CAPTURA ABERTA* 🎯\n\n` +
    `${raid.boss.emoji} *${raid.boss.nome}* ${c.estrelas}\n` +
    `⏰ Termina em *${fmtTempo(raid.capturaAte - agora)}*\n` +
    `✅ Já capturaram: *${capturaram}* de ${Object.keys(raid.vencedores).length}\n\n`;

  if (!v) texto += `Só quem lutou nesta raid pode capturar.`;
  else if (v.capturou) texto += `Você já capturou o chefe! 🎉`;
  else texto += `🎯 Suas Premier Balls: *${v.bolas}*\nUse: *${PREFIX}raid capturar*`;
  return reply(texto);
}

// ---------- entrar ----------
async function raidEntrar(ctx) {
  const { reply, sender, msg, args, pushName } = ctx;
  const jid = msg.key.remoteJid;

  const brutos = args.slice(1).join(' ').split(/[\s,]+/).filter(Boolean);
  const indices = brutos.map(Number);
  if (indices.some(n => !Number.isInteger(n))) {
    return reply(`❌ Use números dos seus Pokémon.\nExemplo: ${PREFIX}raid entrar 1 4 7\nVeja a lista com ${PREFIX}meuspokemons`);
  }

  const r = entrarNaRaid(jid, sender, pushName || 'Treinador', indices);
  if (!r.ok) return reply(`❌ ${r.erro}`);

  const linhas = r.time.map((p, i) => `${i + 1}. ${p.emoji} ${p.nome} (Lv.${p.level}) — ❤️${p.hp} ⚔️${p.atk} 🛡️${p.def}`);
  let texto =
    `✅ ${tag(sender)} entrou na raid!\n\n` +
    `👥 *Seu time:*\n${linhas.join('\n')}\n\n` +
    `🎫 Passes restantes: *${r.passes}*\n` +
    `👥 No lobby: *${r.jogadores}* | ⚔️ Batalha em *${fmtTempo(r.iniciaEm - Date.now())}*`;
  if (r.ganhouPasseHoje) texto = `🎁 Você recebeu seu *Passe de Raid diário*!\n\n` + texto;
  if (r.primeiro) texto += `\n\n📣 A contagem começou! Chame o grupo: outros treinadores podem entrar até a batalha começar.`;
  return reply(texto, { mentions: [sender] });
}

// ---------- sair ----------
async function raidSair(ctx) {
  const { reply, sender, msg } = ctx;
  const r = sairDaRaid(msg.key.remoteJid, sender);
  if (!r.ok) return reply(`❌ ${r.erro}`);
  return reply(`🚪 Você saiu do lobby e recebeu seu passe de volta.\n🎫 Passes: *${r.passes}*${r.lobbyVazio ? '\n\n⏹️ O lobby ficou vazio e a contagem foi cancelada.' : ''}`);
}

// ---------- capturar ----------
async function raidCapturar(ctx) {
  const { reply, sender, msg } = ctx;
  const r = capturarRaid(msg.key.remoteJid, sender);
  if (!r.ok) return reply(`❌ ${r.erro}`);

  const pct = Math.round(r.chance * 100);
  let texto = `${r.lance.emoji} *Lance ${r.lance.nome}!* (chance de ${pct}%)\n\n`;

  if (r.sucesso) {
    const p = r.pokemon;
    texto +=
      `🎉 *CAPTURADO!* 🎉\n${tag(sender)} capturou ${p.emoji} *${p.nome}* (Lv.${p.level})!\n` +
      `❤️ HP ${p.hp} | ⚔️ ATK ${p.atk} | 🛡️ DEF ${p.def}\n` +
      `_Chefes de raid já vêm mais fortes!_`;
  } else {
    texto += `😢 ${r.boss.emoji} *${r.boss.nome}* escapou!\n🎯 Premier Balls restantes: *${r.bolasRestantes}*`;
    if (r.bolasRestantes > 0) texto += `\nTente de novo: *${PREFIX}raid capturar*`;
  }
  if (r.raidEncerrada) texto += `\n\n🏁 Todos terminaram a captura. A raid foi encerrada!`;

  return reply(texto, { mentions: [sender] });
}

// =========================================
// COMANDO: !passe
// =========================================
export async function executePasse(ctx) {
  const { reply, sender } = ctx;
  const i = infoPasses(sender);
  return reply(
    `🎫 *PASSES DE RAID*\n\n` +
    (i.ganhouHoje ? `🎁 Você recebeu seu passe grátis de hoje!\n\n` : '') +
    `🎫 Seus passes: *${i.passes}/${i.max}*\n` +
    `💰 PokéCoins: *${fmtNum(i.coins)}*\n\n` +
    `• Você ganha *1 passe por dia* (grátis).\n` +
    `• Compre mais: *${PREFIX}comprarpasse* [qtd] — ${fmtNum(i.preco)} PokéCoins cada.`
  );
}

// =========================================
// COMANDO: !comprarpasse [quantidade]
// =========================================
export async function executeComprarPasse(ctx) {
  const { reply, args } = ctx;
  const qtd = args[0] ? parseInt(args[0]) : 1;
  const r = comprarPasses(ctx.sender, qtd);
  if (!r.ok) return reply(`❌ ${r.erro}`);
  return reply(`✅ Você comprou *${r.qtd}* passe(s) por *${fmtNum(r.custo)} PokéCoins*.\n\n🎫 Passes: *${r.passes}/${CONFIG_RAID.passesMax}*\n💰 Saldo: *${fmtNum(r.coins)}*`);
}

// =========================================
// COMANDO: !ativarraid  (dono — só no grupo onde for usado)
// =========================================
export async function executeAtivarRaid(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!(await soDono(ctx))) return;
  if (!isGroup) return reply('❌ Use este comando dentro do grupo onde você quer ativar as raids.');

  const jid = msg.key.remoteJid;
  if (!ativarRaidGrupo(jid)) return reply('⚠️ As raids já estão ativadas *neste grupo*.');

  // Fora do horário das raids o 1º ovo só vem na manhã seguinte: avisa a hora certa
  const quando = proximaRaidDoGrupo(jid);
  const demora = quando - Date.now();
  const primeiro = demora > (CONFIG_RAID.primeiraMin + 2) * 60 * 1000
    ? `a partir das *${fmtHoraBrasilia(quando)}* (as raids só aparecem entre ${CONFIG_RAID.horario[0]}h e ${CONFIG_RAID.horario[1]}h)`
    : `em cerca de *${CONFIG_RAID.primeiraMin} min*`;

  return reply(
    `✅ *RAIDS ATIVADAS NESTE GRUPO!*\n\n` +
    `🥚 O primeiro ovo aparece ${primeiro}; depois, de tempos em tempos (${CONFIG_RAID.horario[0]}h às ${CONFIG_RAID.horario[1]}h).\n` +
    `📖 Veja como funciona: ${PREFIX}raid ajuda`
  );
}

// =========================================
// COMANDO: !desativarraid  (dono — só no grupo onde for usado)
// =========================================
export async function executeDesativarRaid(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!(await soDono(ctx))) return;
  if (!isGroup) return reply('❌ Use este comando dentro do grupo onde você quer desativar as raids.');

  const r = desativarRaidGrupo(msg.key.remoteJid);
  if (!r.mudou) return reply('⚠️ As raids já estão desativadas *neste grupo*.');
  return reply(
    `🔕 *RAIDS DESATIVADAS NESTE GRUPO!*` +
    (r.tinhaRaid ? `\n\nA raid em andamento foi cancelada.${r.reembolsados ? ` ${r.reembolsados} passe(s) devolvido(s).` : ''}` : '')
  );
}

// =========================================
// COMANDO: !forcarraid [1-5]  (dono — teste: abre uma raid agora)
// =========================================
export async function executeForcarRaid(ctx) {
  const { reply, client, msg, isGroup, args } = ctx;
  if (!(await soDono(ctx))) return;
  if (!isGroup) return reply('❌ Use este comando dentro de um grupo.');

  const n = parseInt(args[0]);
  const tier = n >= 1 && n <= 5 ? n : undefined;
  const ok = await forcarRaid(client, msg.key.remoteJid, tier);
  if (!ok) return reply('⚠️ Já existe uma raid em andamento neste grupo.');
}
