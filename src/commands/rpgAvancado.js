import { PREFIX } from '../config.js';
import { getUsuario, salvarUsuario } from '../functions/rpg.js';
import {
  getUsuario as getUserAvancado,
  salvarUsuario as saveUserAvancado,
  REGIOES,
  ITENS_LOOT,
  sortearItemLoot
} from '../functions/rpgAvancadoDB.js';

// =========================================
// EXPLORAÇÃO
// =========================================
export async function executeExplorar(ctx) {
  const { reply, sender, q, pushName } = ctx;
  const user = getUsuario(sender);
  const avancado = getUserAvancado(sender);

  const regiaoNome = q.trim().toLowerCase();

  if (!regiaoNome) {
    // Lista todas as regiões
    let texto = `🗺️ *REGIÕES DISPONÍVEIS*\n\n`;
    for (const [chave, r] of Object.entries(REGIOES)) {
      texto += `${r.emoji} *${r.nome}*\n`;
      texto += `   Nível mínimo: ${r.nivelMin}\n`;
      texto += `   Recompensa: ${r.recompensaMin.toLocaleString('pt-BR')} a ${r.recompensaMax.toLocaleString('pt-BR')}\n\n`;
    }
    texto += `💡 Use: ${PREFIX}explorar <nome da região>\n`;
    texto += `💡 Ou: ${PREFIX}explorar aleatorio`;
    return reply(texto);
  }

  // Cooldown de 5 minutos
  const cooldown = 5 * 60 * 1000;
  const agora = Date.now();
  if (agora - avancado.ultimaExploracao < cooldown) {
    const restante = Math.ceil((cooldown - (agora - avancado.ultimaExploracao)) / 1000);
    return reply(`⏳ Descanse um pouco! Volte em *${restante}s* para explorar.`);
  }

  let regiao;
  if (regiaoNome === 'aleatorio' || regiaoNome === 'random') {
    const lista = Object.values(REGIOES);
    regiao = lista[Math.floor(Math.random() * lista.length)];
  } else {
    regiao = REGIOES[regiaoNome];
  }

  if (!regiao) {
    return reply(`❌ Região inválida. Use: ${PREFIX}explorar`);
  }

  avancado.ultimaExploracao = agora;

  // Sorteia resultado
  const roll = Math.random();
  let resultado = '';

  if (roll < regiao.chanceMonstro) {
    // Encontrou um monstro
    const monstro = regiao.monstros[Math.floor(Math.random() * regiao.monstros.length)];
    const ganhouLuta = Math.random() > 0.4;

    if (ganhouLuta) {
      const premio = Math.floor(Math.random() * (regiao.recompensaMax - regiao.recompensaMin)) + regiao.recompensaMin;
      user.coins += premio;
      avancado.monstrosDerrotados += 1;

      resultado = `${monstro} apareceu!\n⚔️ Você lutou e *VENCEU*!\n💰 +${premio.toLocaleString('pt-BR')} coins`;
    } else {
      const perda = Math.floor(user.coins * 0.05);
      user.coins = Math.max(0, user.coins - perda);

      resultado = `${monstro} apareceu!\n💀 Você *PERDEU* a luta!\n💸 -${perda.toLocaleString('pt-BR')} coins`;
    }
  } else if (roll < regiao.chanceMonstro + regiao.chanceTesouro) {
    // Achou um tesouro
    const premio = Math.floor(Math.random() * (regiao.recompensaMax - regiao.recompensaMin) * 1.5) + regiao.recompensaMin;
    user.coins += premio;
    avancado.tesourosAchados += 1;

    resultado = `💎 Você achou um *TESOURO ESCONDIDO*!\n💰 +${premio.toLocaleString('pt-BR')} coins`;
  } else {
    // Nada de interessante
    const premio = Math.floor(Math.random() * 500) + 100;
    user.coins += premio;

    resultado = `🍃 Você apenas explorou a região...\n💰 Encontrou ${premio.toLocaleString('pt-BR')} coins no chão`;
  }

  // Chance de encontrar uma caixa loot
  let achouCaixa = '';
  if (Math.random() < 0.15) {
    const tipoCaixa = Math.random() < 0.1 ? 'lendaria' : 'comum';
    if (tipoCaixa === 'lendaria') {
      avancado.caixasLendarias += 1;
      achouCaixa = '\n\n🎁 *CAIXA LENDÁRIA ENCONTRADA!*\n💡 Use: ' + PREFIX + 'abrircaixa lendaria';
    } else {
      avancado.caixas += 1;
      achouCaixa = '\n\n📦 *Caixa comum encontrada!*\n💡 Use: ' + PREFIX + 'abrircaixa';
    }
  }

  salvarUsuario(sender, user);
  saveUserAvancado(sender, avancado);

  return reply(
    `${regiao.emoji} *EXPLORANDO: ${regiao.nome.toUpperCase()}*\n\n` +
    resultado +
    achouCaixa +
    `\n\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// CAIXAS LOOT
// =========================================
export async function executeAbrirCaixa(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const avancado = getUserAvancado(sender);

  const tipo = q.trim().toLowerCase();

  if (tipo === 'lendaria' || tipo === 'lendaria') {
    if (avancado.caixasLendarias <= 0) {
      return reply('❌ Você não tem caixas lendárias.');
    }
    avancado.caixasLendarias -= 1;

    // Lendária sempre dá item bom
    const itens = Object.entries(ITENS_LOOT).filter(([, i]) => ['epico', 'lendario'].includes(i.raridade));
    const item = itens[Math.floor(Math.random() * itens.length)];

    user.coins += item[1].valor;
    avancado.itensLoot[item[0]] = (avancado.itensLoot[item[0]] || 0) + 1;
    avancado.totalLoot += 1;

    salvarUsuario(sender, user);
    saveUserAvancado(sender, avancado);

    return reply(
      `🎁 *CAIXA LENDÁRIA ABERTA!*\n\n` +
      `${item[1].emoji} *${item[1].nome}*\n` +
      `⭐ Raridade: ${item[1].raridade.toUpperCase()}\n` +
      `💰 Valor: ${item[1].valor.toLocaleString('pt-BR')} coins\n\n` +
      `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
    );
  }

  // Caixa comum
  if (avancado.caixas <= 0) {
    return reply(`❌ Você não tem caixas comuns.\n💡 Explore para encontrar: ${PREFIX}explorar`);
  }

  avancado.caixas -= 1;
  const item = sortearItemLoot();

  user.coins += item.valor;
  avancado.itensLoot[item.chave] = (avancado.itensLoot[item.chave] || 0) + 1;
  avancado.totalLoot += 1;

  salvarUsuario(sender, user);
  saveUserAvancado(sender, avancado);

  return reply(
    `📦 *CAIXA ABERTA!*\n\n` +
    `${item.emoji} *${item.nome}*\n` +
    `⭐ Raridade: ${item.raridade.toUpperCase()}\n` +
    `💰 Valor: ${item.valor.toLocaleString('pt-BR')} coins\n\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

export async function executeInventario(ctx) {
  const { reply, sender } = ctx;
  const avancado = getUserAvancado(sender);

  const itens = Object.entries(avancado.itensLoot);

  if (itens.length === 0 && avancado.caixas === 0 && avancado.caixasLendarias === 0) {
    return reply(`🎒 *INVENTÁRIO VAZIO*\n\n💡 Explore: ${PREFIX}explorar`);
  }

  let texto = `🎒 *INVENTÁRIO*\n\n`;

  if (avancado.caixas > 0 || avancado.caixasLendarias > 0) {
    texto += `📦 *CAIXAS:*\n`;
    if (avancado.caixas > 0) texto += `   📦 Comuns: ${avancado.caixas}\n`;
    if (avancado.caixasLendarias > 0) texto += `   🎁 Lendárias: ${avancado.caixasLendarias}\n`;
    texto += `\n`;
  }

  if (itens.length > 0) {
    texto += `💎 *ITENS COLECIONADOS:*\n`;
    for (const [chave, qtd] of itens) {
      const item = ITENS_LOOT[chave];
      if (!item) continue;
      texto += `${item.emoji} ${item.nome} x${qtd}\n`;
    }
    texto += `\n`;
  }

  texto += `📊 Total de itens: ${avancado.totalLoot}`;
  return reply(texto);
}

// =========================================
// ARENA PvP
// =========================================
export async function executeArena(ctx) {
  const { reply, sender, msg, pushName } = ctx;
  const user = getUsuario(sender);
  const avancado = getUserAvancado(sender);

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply(
      `⚔️ *ARENA PVP*\n\n` +
      `Use: ${PREFIX}arena @user\n\n` +
      `📊 *Suas estatísticas:*\n` +
      `🏆 Vitórias: ${avancado.arena.vitorias}\n` +
      `💀 Derrotas: ${avancado.arena.derrotas}\n` +
      `🔥 Sequência: ${avancado.arena.sequencia}\n\n` +
      `💡 Aposta: 1000 coins por batalha`
    );
  }

  const oponente = mentions[0];
  if (oponente === sender) return reply('❌ Você não pode batalhar contra si mesmo.');

  const APOSTA = 1000;

  if (user.coins < APOSTA) {
    return reply(`❌ Você precisa de ${APOSTA.toLocaleString('pt-BR')} coins.`);
  }

  const userO = getUsuario(oponente);
  if (userO.coins < APOSTA) {
    return reply('❌ O oponente não tem coins suficientes.');
  }

  const avancadoO = getUserAvancado(oponente);

  // Calcula "poder" baseado em vitórias e itens
  const poder1 = 100 + (avancado.arena.vitorias * 5) + (avancado.totalLoot * 2);
  const poder2 = 100 + (avancadoO.arena.vitorias * 5) + (avancadoO.totalLoot * 2);

  // Adiciona aleatoriedade (70% a 130%)
  const roll1 = poder1 * (0.7 + Math.random() * 0.6);
  const roll2 = poder2 * (0.7 + Math.random() * 0.6);

  const venceu = roll1 > roll2;

  if (venceu) {
    user.coins += APOSTA;
    userO.coins -= APOSTA;
    avancado.arena.vitorias += 1;
    avancado.arena.sequencia += 1;
    avancadoO.arena.derrotas += 1;
    avancadoO.arena.sequencia = 0;
  } else {
    user.coins -= APOSTA;
    userO.coins += APOSTA;
    avancado.arena.derrotas += 1;
    avancado.arena.sequencia = 0;
    avancadoO.arena.vitorias += 1;
    avancadoO.arena.sequencia += 1;
  }

  salvarUsuario(sender, user);
  salvarUsuario(oponente, userO);
  saveUserAvancado(sender, avancado);
  saveUserAvancado(oponente, avancadoO);

  return reply(
    `⚔️ *ARENA PVP*\n\n` +
    `👤 *${pushName}*\n   🎯 Poder: ${poder1.toFixed(0)}\n` +
    `🆚\n` +
    `👤 *Oponente*\n   🎯 Poder: ${poder2.toFixed(0)}\n\n` +
    `🏆 *VENCEDOR:* ${venceu ? pushName : 'Oponente'}\n` +
    `💰 Prêmio: ${APOSTA.toLocaleString('pt-BR')} coins\n` +
    `\n💼 Seu saldo: ${user.coins.toLocaleString('pt-BR')}`,
    { mentions: [oponente] }
  );
}

export async function executeRankingArena(ctx) {
  const { reply } = ctx;
  // Simples: mostra os usuários com mais vitórias
  const { lerDB } = await import('../functions/rpgAvancadoDB.js');
  const db = lerDB();
  const lista = Object.entries(db.usuarios)
    .filter(([, u]) => u.arena.vitorias > 0)
    .sort((a, b) => b[1].arena.vitorias - a[1].arena.vitorias)
    .slice(0, 10);

  if (lista.length === 0) {
    return reply('❌ Nenhuma vitória registrada ainda.');
  }

  let texto = `🏆 *RANKING DA ARENA*\n\n`;
  lista.forEach(([jid, u], i) => {
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    texto += `${medalha} @${jid.split('@')[0]}\n`;
    texto += `   🏆 ${u.arena.vitorias}V | 💀 ${u.arena.derrotas}D | 🔥 ${u.arena.sequencia}\n\n`;
  });

  return reply(texto, { mentions: lista.map(l => l[0]) });
}
