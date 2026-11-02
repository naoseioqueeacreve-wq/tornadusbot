import { PREFIX } from '../config.js';
import { getUsuario, salvarUsuario } from '../functions/rpg.js';
import {
  getUsuario as getUserExtra,
  salvarUsuario as saveUserExtra,
  xpNecessario,
  multiplicadorNivel,
  POCOES,
  comprarPocao,
  temBuffAtivo,
  emprestar,
  pagarEmprestimo,
  quitarEmprestimo,
  emprestimoVencido
} from '../functions/extrasDB.js';

// =========================================
// XP / NÍVEL
// =========================================
export async function executeMeuNivel(ctx) {
  const { reply, sender, pushName } = ctx;
  const extra = getUserExtra(sender);

  const xpProx = xpNecessario(extra.nivel);
  const progresso = Math.floor((extra.xp / xpProx) * 100);
  const multi = multiplicadorNivel(extra.nivel);

  const barras = Math.floor(progresso / 5);
  const barraVisual = '█'.repeat(barras) + '░'.repeat(20 - barras);

  return reply(
    `🎓 *NÍVEL DE ${pushName.toUpperCase()}*\n\n` +
    `📊 Nível: *${extra.nivel}*\n` +
    `⭐ XP: ${extra.xp}/${xpProx}\n` +
    `[${barraVisual}] ${progresso}%\n\n` +
    `💰 Multiplicador de coins: *x${multi.toFixed(2)}*\n` +
    `🎯 Comandos usados: ${extra.totalComandos}\n\n` +
    `💡 Cada comando = +10 XP`
  );
}

// =========================================
// POÇÕES
// =========================================
export async function executeLojaPocoes(ctx) {
  const { reply } = ctx;

  let texto = `💊 *LOJA DE POÇÕES*\n\n`;
  for (const [chave, p] of Object.entries(POCOES)) {
    texto += `${p.emoji} *${p.nome}*\n`;
    texto += `   💰 Preço: ${p.preco.toLocaleString('pt-BR')} coins\n`;
    texto += `   📖 ${p.descricao}\n`;
    texto += `   ⏱️ Duração: ${Math.floor(p.duracao / 60000)} min\n\n`;
  }
  texto += `💡 Comprar: ${PREFIX}comprarpocao <nome>`;
  return reply(texto);
}

export async function executeComprarPocao(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const nome = q.trim().toLowerCase();

  if (!POCOES[nome]) {
    return reply(`❌ Poção inválida. Veja: ${PREFIX}lojapocoes`);
  }

  const pocao = POCOES[nome];

  if (user.coins < pocao.preco) {
    return reply(`❌ Precisa de ${pocao.preco.toLocaleString('pt-BR')} coins.`);
  }

  user.coins -= pocao.preco;
  salvarUsuario(sender, user);

  const resultado = comprarPocao(sender, nome);

  return reply(
    `✅ *POÇÃO COMPRADA!*\n\n` +
    `${pocao.emoji} *${pocao.nome}*\n` +
    `⏱️ Ativa por ${Math.floor(pocao.duracao / 60000)} min\n` +
    `📖 ${pocao.descricao}\n\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

export async function executeMeusBuffs(ctx) {
  const { reply, sender } = ctx;
  const extra = getUserExtra(sender);

  let texto = `💊 *SEUS BUFFS ATIVOS*\n\n`;
  let temAlgum = false;

  for (const [chave, p] of Object.entries(POCOES)) {
    if (temBuffAtivo(sender, chave)) {
      const restante = Math.ceil((extra.buffs[chave] - Date.now()) / 60000);
      texto += `${p.emoji} ${p.nome} — ${restante}min restantes\n`;
      temAlgum = true;
    }
  }

  if (!temAlgum) texto += `❌ Nenhum buff ativo.\n💡 Veja a loja: ${PREFIX}lojapocoes`;

  return reply(texto);
}

// =========================================
// EMPRÉSTIMO
// =========================================
export async function executeEmprestimo(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const extra = getUserExtra(sender);
  const valor = parseInt(q.trim());

  // Se não tem empréstimo ativo, tenta pegar
  if (!extra.emprestimo.ativo) {
    if (!valor || valor < 1000) {
      return reply(
        `🏦 *EMPRÉSTIMO*\n\n` +
        `Use: ${PREFIX}emprestimo <valor>\n` +
        `💡 Mínimo: 1.000 coins | Máximo: 50.000\n` +
        `📊 Juros: 15%\n` +
        `⏰ Prazo: 24 horas\n\n` +
        `⚠️ Não pagar = perda de 20% dos ganhos`
      );
    }

    if (valor > 50000) return reply('❌ Máximo: 50.000 coins.');

    const resultado = emprestar(sender, valor);
    if (!resultado.ok) return reply(`❌ ${resultado.motivo}`);

    user.coins += valor;
    salvarUsuario(sender, user);

    return reply(
      `🏦 *EMPRÉSTIMO APROVADO!*\n\n` +
      `💰 Valor: ${valor.toLocaleString('pt-BR')} coins\n` +
      `📈 Juros (15%): ${resultado.juros.toLocaleString('pt-BR')}\n` +
      `💵 Total a pagar: ${resultado.total.toLocaleString('pt-BR')}\n` +
      `⏰ Prazo: 24 horas\n\n` +
      `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}\n\n` +
      `💡 Pagar: ${PREFIX}pagaremprestimo`
    );
  }

  // Já tem empréstimo
  const pag = pagarEmprestimo(sender);
  const tempoRestante = Math.ceil((extra.emprestimo.expiraEm - Date.now()) / 3600000);

  return reply(
    `🏦 *EMPRÉSTIMO ATIVO*\n\n` +
    `💰 Valor emprestado: ${extra.emprestimo.valor.toLocaleString('pt-BR')}\n` +
    `📈 Juros: ${extra.emprestimo.juros.toLocaleString('pt-BR')}\n` +
    `💵 Total a pagar: *${pag.total.toLocaleString('pt-BR')}*\n` +
    `⏰ Expira em: ${tempoRestante}h\n\n` +
    `💡 Pagar: ${PREFIX}pagaremprestimo`
  );
}

export async function executePagarEmprestimo(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const extra = getUserExtra(sender);

  if (!extra.emprestimo.ativo) {
    return reply('❌ Você não tem empréstimo ativo.');
  }

  const total = extra.emprestimo.valor + extra.emprestimo.juros;

  if (user.coins < total) {
    return reply(
      `❌ Você precisa de ${total.toLocaleString('pt-BR')} coins.\n` +
      `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
    );
  }

  user.coins -= total;
  salvarUsuario(sender, user);
  quitarEmprestimo(sender);

  return reply(
    `✅ *EMPRÉSTIMO PAGO!*\n\n` +
    `💵 Pago: ${total.toLocaleString('pt-BR')}\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}
