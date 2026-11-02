import { PREFIX } from '../config.js';
import { getUsuario, salvarUsuario } from '../functions/rpg.js';
import {
  getCidade,
  criarCidade,
  salvarCidade,
  listarCidades,
  ESTRUTURAS,
  calcularPopulacao,
  calcularRenda,
  calcularFelicidade,
  calcularNivelCidade,
  calcularImpostos,
  gerarPropostaSeNecessario
} from '../functions/cidadeDB.js';

const PRECO_CRIAR = 1000000;

// =========================================
// COMANDO: !cidade
// =========================================
export async function executeCidade(ctx) {
  const { reply, sender, client, msg } = ctx;
  const cidade = getCidade(sender);

  if (!cidade) {
    return reply(
      `🏙️ *SISTEMA DE CIDADES*\n\n` +
      `Você ainda não tem uma cidade!\n\n` +
      `💰 Para criar, você precisa de *1.000.000 coins*.\n\n` +
      `💡 Use: ${PREFIX}criarcidade <nome>`
    );
  }

  // Verifica se apareceu nova proposta
  const gerou = gerarPropostaSeNecessario(cidade);
  if (gerou) salvarCidade(sender, cidade);

  const pop = calcularPopulacao(cidade);
  const renda = calcularRenda(cidade);
  const nivel = calcularNivelCidade({ ...cidade, populacao: pop });
  const impostos = calcularImpostos(cidade);

  let texto = `╭━━━〔 🏙️ *${cidade.nome.toUpperCase()}* 〕━━━╮\n` +
    `┃\n` +
    `┃ 👑 Prefeito: ${cidade.dono}\n` +
    `┃ ${nivel.emoji} Nível: ${nivel.nivel} - ${nivel.nome}\n` +
    `┃ 👥 População: ${pop.toLocaleString('pt-BR')}\n` +
    `┃ 😊 Felicidade: ${cidade.felicidade}/100\n` +
    `┃ 💰 Renda: ${renda.toLocaleString('pt-BR')}/h\n` +
    `┃ 💵 Impostos acumulados: ${impostos.toLocaleString('pt-BR')}\n` +
    `┃ 📊 Total arrecadado: ${cidade.totalArrecadado.toLocaleString('pt-BR')}\n` +
    `┃\n`;

  const construidas = Object.entries(cidade.estruturas).filter(([, d]) => d.quantidade > 0);
  if (construidas.length === 0) {
    texto += `┃ 🏗️ Nenhuma estrutura construída ainda\n`;
  } else {
    texto += `┃ 🏗️ *ESTRUTURAS:*\n`;
    for (const [chave, dados] of construidas) {
      const info = ESTRUTURAS[chave];
      texto += `┃ ${info.emoji} ${info.nome}: ${dados.quantidade}x (Nv.${dados.nivel})\n`;
    }
  }

  // Mostra proposta se tiver
  if (cidade.propostas.length > 0) {
    const p = cidade.propostas[0];
    texto += `┃\n┃ 💼 *PROPOSTA ATIVA!*\n`;
    texto += `┃ ${p.emoji} ${p.nome}\n`;
    texto += `┃ 💰 Oferta: ${p.oferta.toLocaleString('pt-BR')}\n`;
    texto += `┃ 👥 +${p.bonusPopulacao.toLocaleString('pt-BR')} pop\n`;
    texto += `┃ 😊 ${p.bonusFelicidade >= 0 ? '+' : ''}${p.bonusFelicidade} felicidade\n`;
    texto += `┃ 💡 ${PREFIX}proposta — Ver detalhes\n`;
  }

  texto += `┃\n` +
    `┃ 💡 ${PREFIX}construir <tipo>\n` +
    `┃ 💡 ${PREFIX}coletarimpostos\n` +
    `┃ 💡 ${PREFIX}cidade ranking\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`;

  return reply(texto);
}

// =========================================
// COMANDO: !criarcidade <nome>
// =========================================
export async function executeCriarCidade(ctx) {
  const { reply, sender, q, pushName } = ctx;
  const user = getUsuario(sender);

  const existente = getCidade(sender);
  if (existente) {
    return reply(`⚠️ Você já tem uma cidade: *${existente.nome}*`);
  }

  const nome = q.trim();
  if (!nome) {
    return reply(
      `🏙️ *CRIAR CIDADE*\n\n` +
      `Use: ${PREFIX}criarcidade <nome>\n` +
      `💰 Custo: 1.000.000 coins\n\n` +
      `💡 Exemplo: ${PREFIX}criarcidade CidadeTop`
    );
  }

  if (nome.length > 20) {
    return reply('❌ O nome não pode ter mais de 20 caracteres.');
  }

  if (user.coins < PRECO_CRIAR) {
    return reply(
      `❌ Você não tem coins suficientes!\n\n` +
      `💰 Precisa: ${PRECO_CRIAR.toLocaleString('pt-BR')}\n` +
      `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
    );
  }

  user.coins -= PRECO_CRIAR;
  salvarUsuario(sender, user);
  criarCidade(sender, nome, pushName);

  return reply(
    `🎉 *CIDADE CRIADA!* 🎉\n\n` +
    `🏙️ Nome: *${nome}*\n` +
    `👑 Prefeito: ${pushName}\n` +
    `💰 Custo: ${PRECO_CRIAR.toLocaleString('pt-BR')} coins\n\n` +
    `💡 Agora construa: ${PREFIX}construir casas`
  );
}

// =========================================
// COMANDO: !construir <tipo>
// =========================================
export async function executeConstruir(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const cidade = getCidade(sender);

  if (!cidade) return reply(`❌ Você não tem uma cidade. Use: ${PREFIX}criarcidade <nome>`);

  const tipo = q.trim().toLowerCase();
  if (!tipo) {
    let texto = `🏗️ *CONSTRUIR*\n\n`;
    for (const [chave, info] of Object.entries(ESTRUTURAS)) {
      texto += `${info.emoji} *${info.nome}* — ${info.precoBase.toLocaleString('pt-BR')}\n`;
      texto += `   _${info.descricao}_\n\n`;
    }
    texto += `💡 Use: ${PREFIX}construir <nome>`;
    return reply(texto);
  }

  const info = ESTRUTURAS[tipo];
  if (!info) return reply(`❌ Estrutura inválida. Use: ${PREFIX}construir`);

  const atual = cidade.estruturas[tipo] || { quantidade: 0, nivel: 1 };
  const preco = Math.floor(info.precoBase * Math.pow(1.1, atual.quantidade));

  if (user.coins < preco) {
    return reply(
      `❌ Você precisa de ${preco.toLocaleString('pt-BR')} coins.\n` +
      `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
    );
  }

  user.coins -= preco;
  if (!cidade.estruturas[tipo]) cidade.estruturas[tipo] = { quantidade: 0, nivel: 1 };
  cidade.estruturas[tipo].quantidade += 1;

  cidade.populacao = calcularPopulacao(cidade);
  cidade.felicidade = calcularFelicidade(cidade);

  salvarUsuario(sender, user);
  salvarCidade(sender, cidade);

  const nivel = calcularNivelCidade(cidade);

  return reply(
    `✅ *CONSTRUÍDO!*\n\n` +
    `${info.emoji} *${info.nome}* #${cidade.estruturas[tipo].quantidade}\n` +
    `💰 Custo: ${preco.toLocaleString('pt-BR')} coins\n\n` +
    `👥 População: ${cidade.populacao.toLocaleString('pt-BR')}\n` +
    `😊 Felicidade: ${cidade.felicidade}/100\n` +
    `${nivel.emoji} Nível: ${nivel.nivel} - ${nivel.nome}\n\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// COMANDO: !coletarimpostos
// =========================================
export async function executeColetarImpostos(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const cidade = getCidade(sender);

  if (!cidade) return reply('❌ Você não tem uma cidade.');

  const impostos = calcularImpostos(cidade);
  if (impostos < 1) {
    return reply(
      `⏳ *NADA PARA COLETAR*\n\n` +
      `💰 Renda: ${calcularRenda(cidade).toLocaleString('pt-BR')}/h`
    );
  }

  user.coins += impostos;
  cidade.totalArrecadado += impostos;
  cidade.ultimaColeta = Date.now();

  salvarUsuario(sender, user);
  salvarCidade(sender, cidade);

  return reply(
    `💰 *IMPOSTOS COLETADOS!*\n\n` +
    `💵 Coletado: *${impostos.toLocaleString('pt-BR')} coins*\n` +
    `📊 Total: ${cidade.totalArrecadado.toLocaleString('pt-BR')}\n\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// COMANDO: !cidade ranking
// =========================================
export async function executeRankingCidade(ctx) {
  const { reply } = ctx;
  const lista = listarCidades();

  if (lista.length === 0) return reply('❌ Nenhuma cidade criada ainda!');

  lista.sort((a, b) => (b.populacao || 0) - (a.populacao || 0));

  let texto = `🏆 *RANKING DE CIDADES*\n\n`;
  const limite = Math.min(10, lista.length);
  for (let i = 0; i < limite; i++) {
    const c = lista[i];
    const nivel = calcularNivelCidade(c);
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    texto += `${medalha} *${c.nome}* (${c.dono})\n`;
    texto += `   ${nivel.emoji} ${nivel.nome} | 👥 ${(c.populacao || 0).toLocaleString('pt-BR')}\n\n`;
  }
  return reply(texto);
}

// =========================================
// COMANDO: !demolir <tipo>
// =========================================
export async function executeDemolir(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const cidade = getCidade(sender);

  if (!cidade) return reply('❌ Você não tem uma cidade.');

  const tipo = q.trim().toLowerCase();
  const info = ESTRUTURAS[tipo];
  if (!info) return reply('❌ Estrutura inválida.');

  if (!cidade.estruturas[tipo] || cidade.estruturas[tipo].quantidade <= 0) {
    return reply('❌ Você não tem essa estrutura.');
  }

  cidade.estruturas[tipo].quantidade -= 1;
  if (cidade.estruturas[tipo].quantidade <= 0) delete cidade.estruturas[tipo];

  cidade.populacao = calcularPopulacao(cidade);
  cidade.felicidade = calcularFelicidade(cidade);

  const preco = Math.floor(info.precoBase * 0.5);
  user.coins += preco;

  salvarUsuario(sender, user);
  salvarCidade(sender, cidade);

  return reply(
    `🗑️ *DEMOLIDO!*\n\n` +
    `${info.emoji} ${info.nome} removido\n` +
    `💰 Recebeu: ${preco.toLocaleString('pt-BR')} coins`
  );
}

// =========================================
// COMANDO: !melhorarestrutura <tipo>
// =========================================
export async function executeMelhorarEstrutura(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const cidade = getCidade(sender);

  if (!cidade) return reply('❌ Você não tem uma cidade.');

  const tipo = q.trim().toLowerCase();
  const info = ESTRUTURAS[tipo];
  if (!info) return reply('❌ Estrutura inválida.');

  if (!cidade.estruturas[tipo] || cidade.estruturas[tipo].quantidade <= 0) {
    return reply('❌ Você não tem essa estrutura.');
  }

  const dados = cidade.estruturas[tipo];
  const nivelAtual = dados.nivel;
  const custo = Math.floor(info.precoBase * Math.pow(2, nivelAtual));

  if (user.coins < custo) {
    return reply(`❌ Precisa de ${custo.toLocaleString('pt-BR')} coins.\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`);
  }

  user.coins -= custo;
  dados.nivel += 1;
  cidade.populacao = calcularPopulacao(cidade);
  cidade.felicidade = calcularFelicidade(cidade);

  salvarUsuario(sender, user);
  salvarCidade(sender, cidade);

  return reply(
    `⬆️ *MELHORADO!*\n\n` +
    `${info.emoji} ${info.nome}\n` +
    `📈 Nível: ${nivelAtual} → ${dados.nivel}\n` +
    `💰 Custo: ${custo.toLocaleString('pt-BR')}`
  );
}

// =========================================
// COMANDO: !proposta
// =========================================
export async function executeProposta(ctx) {
  const { reply, sender } = ctx;
  const cidade = getCidade(sender);

  if (!cidade) return reply('❌ Você não tem uma cidade.');

  if (cidade.propostas.length === 0) {
    return reply(
      `📭 *SEM PROPOSTAS*\n\n` +
      `Nenhum empresário apareceu ainda.\n\n` +
      `⏳ Novos empresários aparecem a cada 4 horas.`
    );
  }

  const p = cidade.propostas[0];
  const tempoRestante = Math.floor((p.expiraEm - Date.now()) / (60 * 60 * 1000));

  let texto = `💼 *PROPOSTA DE INVESTIMENTO*\n\n` +
    `👔 Empresário: *${p.empresario}*\n` +
    `${p.emoji} Projeto: *${p.nome}*\n` +
    `⭐ Raridade: ${p.raridade.toUpperCase()}\n\n` +
    `📖 _"${p.descricao}"_\n\n` +
    `💰 *Oferta:* ${p.oferta.toLocaleString('pt-BR')} coins\n` +
    `👥 *População:* +${p.bonusPopulacao.toLocaleString('pt-BR')}\n` +
    `😊 *Felicidade:* ${p.bonusFelicidade >= 0 ? '+' : ''}${p.bonusFelicidade}\n`;

  if (p.bonusRenda > 0) {
    texto += `💵 *Renda extra:* +${p.bonusRenda.toLocaleString('pt-BR')}/h\n`;
  }

  texto += `\n⏳ Expira em: ${tempoRestante}h\n\n` +
    `✅ Aceitar: ${PREFIX}aceitarproposta\n` +
    `❌ Recusar: ${PREFIX}recusarproposta`;

  return reply(texto);
}

// =========================================
// COMANDO: !aceitarproposta
// =========================================
export async function executeAceitarProposta(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const cidade = getCidade(sender);

  if (!cidade) return reply('❌ Você não tem uma cidade.');
  if (cidade.propostas.length === 0) return reply('❌ Nenhuma proposta ativa.');

  const p = cidade.propostas[0];

  if (Date.now() > p.expiraEm) {
    cidade.propostas = [];
    salvarCidade(sender, cidade);
    return reply('⏰ A proposta expirou!');
  }

  // Aplica os bônus
  user.coins += p.oferta;
  cidade.bonusPopulacao = (cidade.bonusPopulacao || 0) + p.bonusPopulacao;
  cidade.bonusFelicidade = (cidade.bonusFelicidade || 0) + p.bonusFelicidade;
  cidade.bonusRenda = (cidade.bonusRenda || 0) + p.bonusRenda;
  cidade.totalPropostasAceitas += 1;

  // Recalcula
  cidade.populacao = calcularPopulacao(cidade);
  cidade.felicidade = calcularFelicidade(cidade);

  // Remove a proposta
  cidade.propostas = [];

  salvarUsuario(sender, user);
  salvarCidade(sender, cidade);

  return reply(
    `🤝 *PROPOSTA ACEITA!*\n\n` +
    `👔 ${p.empresario} fechou negócio com você!\n\n` +
    `${p.emoji} *${p.nome}* foi construído.\n\n` +
    `💰 +${p.oferta.toLocaleString('pt-BR')} coins\n` +
    `👥 +${p.bonusPopulacao.toLocaleString('pt-BR')} pop\n` +
    `😊 ${p.bonusFelicidade >= 0 ? '+' : ''}${p.bonusFelicidade} felicidade\n` +
    (p.bonusRenda > 0 ? `💵 +${p.bonusRenda.toLocaleString('pt-BR')}/h\n` : '') +
    `\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// COMANDO: !recusarproposta
// =========================================
export async function executeRecusarProposta(ctx) {
  const { reply, sender } = ctx;
  const cidade = getCidade(sender);

  if (!cidade) return reply('❌ Você não tem uma cidade.');
  if (cidade.propostas.length === 0) return reply('❌ Nenhuma proposta ativa.');

  const p = cidade.propostas[0];
  cidade.propostas = [];
  salvarCidade(sender, cidade);

  return reply(
    `❌ *PROPOSTA RECUSADA*\n\n` +
    `Você recusou a oferta de ${p.empresario}.\n` +
    `Talvez apareça outro empresário em breve...`
  );
}
