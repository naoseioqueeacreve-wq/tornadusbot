import { PREFIX } from '../config.js';
import { getUsuario, salvarUsuario } from '../functions/rpg.js';
import {
  PEIXES,
  getPesca,
  salvarPesca,
  sortearPeixe,
  getClas,
  criarCla,
  entrarCla,
  sairCla,
  getClaDoUsuario,
  listarClas,
  casar,
  divorciar,
  getCasamento,
  getParceiro
} from '../functions/rpgExtrasDB.js';

// =========================================
// SISTEMA DE PESCA
// =========================================
export async function executePescar(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const pesca = getPesca(sender);

  // Cooldown de 2 minutos
  const cooldown = 2 * 60 * 1000;
  const agora = Date.now();

  if (agora - pesca.ultimaPesca < cooldown) {
    const restante = Math.ceil((cooldown - (agora - pesca.ultimaPesca)) / 1000);
    return reply(`🎣 Aguarde *${restante}s* para pescar novamente.`);
  }

  if (pesca.iscas <= 0) {
    return reply(
      `🎣 *SEM ISCAS!*\n\n` +
      `Você precisa de iscas para pescar.\n` +
      `💡 Compre: ${PREFIX}comprariscas`
    );
  }

  pesca.iscas -= 1;
  pesca.ultimaPesca = agora;

  const peixe = sortearPeixe();

  if (peixe.raridade === 'lixo') {
    salvarPesca(sender, pesca);
    return reply(`🎣 Você pescou... ${peixe.emoji} *${peixe.nome}* 😢\n\nMelhor sorte na próxima!`);
  }

  // Adiciona ao aquário
  pesca.aquario.push({
    chave: peixe.chave,
    nome: peixe.nome,
    emoji: peixe.emoji,
    preco: peixe.preco,
    raridade: peixe.raridade,
    pescadoEm: agora
  });
  pesca.totalPescado += 1;

  // Atualiza recorde
  if (!pesca.recorde || peixe.preco > pesca.recorde.preco) {
    pesca.recorde = { nome: peixe.nome, emoji: peixe.emoji, preco: peixe.preco };
  }

  salvarPesca(sender, pesca);

  const raridadeEmoji = {
    comum: '⚪', incomum: '🟢', raro: '🔵', epico: '🟣', lendario: '🟡', mitico: '🌈'
  };

  return reply(
    `🎣 *VOCÊ PESCOU!*\n\n` +
    `${peixe.emoji} *${peixe.nome}*\n` +
    `${raridadeEmoji[peixe.raridade] || '⚪'} Raridade: ${peixe.raridade.toUpperCase()}\n` +
    `💰 Valor: ${peixe.preco.toLocaleString('pt-BR')} coins\n\n` +
    `🎒 Aquário: ${pesca.aquario.length} peixes\n` +
    `📊 Total pescado: ${pesca.totalPescado}`
  );
}

export async function executeAquario(ctx) {
  const { reply, sender } = ctx;
  const pesca = getPesca(sender);

  if (pesca.aquario.length === 0) {
    return reply('🎣 Seu aquário está vazio! Use `!pescar` para pescar.');
  }

  let texto = `🐠 *SEU AQUÁRIO*\n\n`;
  texto += `📊 Total: ${pesca.aquario.length} peixes\n`;

  if (pesca.recorde) {
    texto += `🏆 Recorde: ${pesca.recorde.emoji} ${pesca.recorde.nome} (${pesca.recorde.preco.toLocaleString('pt-BR')})\n`;
  }

  texto += `\n🐟 *PEIXES:*\n`;

  // Agrupa por tipo
  const agrupado = {};
  for (const p of pesca.aquario) {
    if (!agrupado[p.chave]) agrupado[p.chave] = { ...p, quantidade: 0 };
    agrupado[p.chave].quantidade += 1;
  }

  for (const p of Object.values(agrupado)) {
    texto += `${p.emoji} ${p.nome} x${p.quantidade} — ${p.preco.toLocaleString('pt-BR')} cada\n`;
  }

  const total = pesca.aquario.reduce((s, p) => s + p.preco, 0);
  texto += `\n💰 Valor total: ${total.toLocaleString('pt-BR')} coins`;
  texto += `\n💡 Vender: ${PREFIX}venderpeixes`;

  return reply(texto);
}

export async function executeVenderPeixes(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const pesca = getPesca(sender);

  if (pesca.aquario.length === 0) {
    return reply('❌ Seu aquário está vazio!');
  }

  const total = pesca.aquario.reduce((s, p) => s + p.preco, 0);
  const quantidade = pesca.aquario.length;

  user.coins += total;
  pesca.aquario = [];

  salvarUsuario(sender, user);
  salvarPesca(sender, pesca);

  return reply(
    `💰 *PEIXES VENDIDOS!*\n\n` +
    `🐟 Quantidade: ${quantidade}\n` +
    `💵 Total: *${total.toLocaleString('pt-BR')} coins*\n\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

export async function executeComprarIscas(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const pesca = getPesca(sender);

  const qtd = parseInt(q.trim()) || 5;
  const PRECO_ISCA = 50;
  const custo = qtd * PRECO_ISCA;

  if (qtd < 1 || qtd > 100) {
    return reply(`❌ Use: !comprariscas <1-100>\n💰 ${PRECO_ISCA} coins cada`);
  }

  if (user.coins < custo) {
    return reply(`❌ Você precisa de ${custo.toLocaleString('pt-BR')} coins.\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`);
  }

  user.coins -= custo;
  pesca.iscas += qtd;

  salvarUsuario(sender, user);
  salvarPesca(sender, pesca);

  return reply(
    `🪱 *ISCAS COMPRADAS!*\n\n` +
    `📦 Quantidade: ${qtd}\n` +
    `💰 Custo: ${custo.toLocaleString('pt-BR')}\n` +
    `🎣 Total de iscas: ${pesca.iscas}\n\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// SISTEMA DE CLÃS
// =========================================
export async function executeCriarCla(ctx) {
  const { reply, sender, q, pushName } = ctx;
  const user = getUsuario(sender);

  const ja = getClaDoUsuario(sender);
  if (ja) return reply(`❌ Você já está no clã *${ja.nome}*!`);

  const partes = q.trim().split('|').map(p => p.trim());
  const nome = partes[0];
  const emblema = partes[1] || '🛡️';

  if (!nome) {
    return reply(
      `🏰 *CRIAR CLÃ*\n\n` +
      `Use: !criarcla <nome> | <emblema>\n` +
      `💰 Custo: 500.000 coins\n\n` +
      `💡 Exemplo: !criarcla OsFeras | 🐉`
    );
  }

  if (nome.length > 20) return reply('❌ O nome deve ter menos de 20 caracteres.');

  const PRECO = 500000;
  if (user.coins < PRECO) {
    return reply(`❌ Você precisa de ${PRECO.toLocaleString('pt-BR')} coins.`);
  }

  user.coins -= PRECO;
  salvarUsuario(sender, user);

  const criado = criarCla(nome, sender, emblema);

  if (!criado) return reply('❌ Já existe um clã com esse nome!');

  return reply(
    `🏰 *CLÃ CRIADO!*\n\n` +
    `${emblema} *${nome}*\n` +
    `👑 Líder: ${pushName}\n` +
    `💰 Custo: ${PRECO.toLocaleString('pt-BR')}\n\n` +
    `💡 Recrute: ${PREFIX}entrarcla ${nome}`
  );
}

export async function executeEntrarCla(ctx) {
  const { reply, sender, q, pushName } = ctx;

  const ja = getClaDoUsuario(sender);
  if (ja) return reply(`❌ Você já está no clã *${ja.nome}*!`);

  const nome = q.trim();
  if (!nome) return reply(`❌ Use: ${PREFIX}entrarcla <nome>`);

  const resultado = entrarCla(nome, sender);

  if (resultado === false) return reply(`❌ Clã *${nome}* não existe.`);
  if (resultado === 'cheio') return reply(`❌ O clã *${nome}* está cheio (20 membros).`);
  if (resultado === 'membro') return reply(`❌ Você já é membro desse clã!`);

  return reply(`✅ Você entrou no clã *${nome}*!`);
}

export async function executeSairCla(ctx) {
  const { reply, sender } = ctx;
  const cla = getClaDoUsuario(sender);
  if (!cla) return reply('❌ Você não está em nenhum clã.');

  sairCla(cla.nome, sender);
  return reply(`👋 Você saiu do clã *${cla.nome}*.`);
}

export async function executeMeuCla(ctx) {
  const { reply, sender } = ctx;
  const cla = getClaDoUsuario(sender);
  if (!cla) return reply(`❌ Você não está em nenhum clã.\n💡 Crie: ${PREFIX}criarcla`);

  const xpProx = cla.nivel * 1000;

  let texto = `🏰 *CLÃ ${cla.emblema} ${cla.nome.toUpperCase()}*\n\n` +
    `👑 Líder: @${cla.lider.split('@')[0]}\n` +
    `👥 Membros: ${cla.membros.length}/20\n` +
    `📊 Nível: ${cla.nivel}\n` +
    `⭐ XP: ${cla.xp}/${xpProx}\n` +
    `💰 Banco: ${cla.banco.toLocaleString('pt-BR')} coins\n` +
    `🏆 Vitórias: ${cla.vitorias} | 💀 Derrotas: ${cla.derrotas}\n\n` +
    `👥 *MEMBROS:*\n`;

  for (const m of cla.membros) {
    const isLider = m === cla.lider ? ' 👑' : '';
    texto += `• @${m.split('@')[0]}${isLider}\n`;
  }

  return reply(texto, { mentions: cla.membros });
}

export async function executeRankingClas(ctx) {
  const { reply } = ctx;
  const clas = listarClas();

  if (clas.length === 0) return reply('❌ Nenhum clã criado ainda!');

  clas.sort((a, b) => (b.nivel * 1000 + b.xp) - (a.nivel * 1000 + a.xp));

  let texto = `🏆 *RANKING DE CLÃS*\n\n`;

  const limite = Math.min(10, clas.length);
  for (let i = 0; i < limite; i++) {
    const c = clas[i];
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    texto += `${medalha} ${c.emblema} *${c.nome}*\n`;
    texto += `   📊 Nv.${c.nivel} | 👥 ${c.membros.length} | 🏆 ${c.vitorias}\n\n`;
  }

  return reply(texto);
}

// =========================================
// SISTEMA DE CASAMENTO
// =========================================
export async function executeCasar(ctx) {
  const { reply, sender, msg, pushName } = ctx;
  const user = getUsuario(sender);

  const ja = getCasamento(sender);
  if (ja) return reply('❌ Você já é casado(a)! Use `!divorciar` primeiro.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`💍 Use: ${PREFIX}casar @pessoa`);

  const parceiro = mentions[0];
  if (parceiro === sender) return reply('❌ Você não pode casar com si mesmo.');

  const PRECO = 50000;
  if (user.coins < PRECO) {
    return reply(`❌ Casar custa ${PRECO.toLocaleString('pt-BR')} coins.`);
  }

  user.coins -= PRECO;
  salvarUsuario(sender, user);

  const resultado = casar(sender, parceiro);

  if (resultado === 'ja_casado_user1') return reply('❌ Você já é casado(a)!');
  if (resultado === 'ja_casado_user2') return reply('❌ Essa pessoa já é casada!');

  return reply(
    `💍 *CASAMENTO REALIZADO!* 💍\n\n` +
    `👰 ${pushName} 💞 @${parceiro.split('@')[0]}\n\n` +
    `💰 Custo: ${PRECO.toLocaleString('pt-BR')} coins\n` +
    `🎁 Vocês ganham 10% de bônus em todos os comandos!\n\n` +
    `💡 Ver casal: ${PREFIX}meucasamento`,
    { mentions: [parceiro] }
  );
}

export async function executeDivorciar(ctx) {
  const { reply, sender } = ctx;
  const casamento = getCasamento(sender);
  if (!casamento) return reply('❌ Você não é casado(a)!');

  const parceiro = getParceiro(sender);
  divorciar(sender);

  return reply(
    `💔 *DIVÓRCIO*\n\n` +
    `Você se divorciou de @${parceiro.split('@')[0]}.\n\n` +
    `😢 Que pena...`,
    { mentions: [parceiro] }
  );
}

export async function executeMeuCasamento(ctx) {
  const { reply, sender, pushName } = ctx;
  const casamento = getCasamento(sender);
  if (!casamento) {
    return reply(
      `💍 *VOCÊ É SOLTEIRO(A)*\n\n` +
      `💡 Case-se: ${PREFIX}casar @pessoa (custa 50.000 coins)`
    );
  }

  const parceiro = getParceiro(sender);
  const tempoJuntos = Math.floor((Date.now() - casamento.casadoEm) / (24 * 60 * 60 * 1000));

  return reply(
    `💍 *MEU CASAMENTO*\n\n` +
    `👰 Você 💞 @${parceiro.split('@')[0]}\n\n` +
    `📅 Casados há: ${tempoJuntos} dias\n` +
    `🎁 Bônus: +10% em todos os comandos\n` +
    `💒 Data: ${new Date(casamento.casadoEm).toLocaleDateString('pt-BR')}\n\n` +
    `💡 Divórcio: ${PREFIX}divorciar`,
    { mentions: [parceiro] }
  );
}
