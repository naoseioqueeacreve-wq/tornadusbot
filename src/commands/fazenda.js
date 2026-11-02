import { PREFIX } from '../config.js';
import {
  getUsuario,
  salvarUsuario
} from '../functions/rpg.js';
import {
  getFazenda,
  salvarFazenda,
  TIPOS_FAZENDA,
  ANIMAIS,
  MELHORIAS,
  calcularProducao,
  calcularAcumulado
} from '../functions/fazendaDB.js';

// =========================================
// COMANDO: !fazendas
// Lista as fazendas disponíveis
// =========================================
export async function executeFazendas(ctx) {
  const { reply, client, msg, sender } = ctx;
  const user = getUsuario(sender);
  const fazenda = getFazenda(sender);

  let texto = `🌾 *FAZENDAS DISPONÍVEIS*\n\n`;

  for (const [chave, f] of Object.entries(TIPOS_FAZENDA)) {
    const ativa = fazenda.tipo === chave ? ' 🟢 (SUA)' : '';
    texto += `${f.emoji} *${f.nome}*${ativa}\n`;
    texto += `   💰 Preço: ${f.preco.toLocaleString('pt-BR')} coins\n`;
    texto += `   🐄 Capacidade: ${f.capacidade} animais\n`;
    texto += `   📈 Produção: x${f.producaoBase}\n\n`;
  }

  texto += `💰 Seu saldo: *${user.coins.toLocaleString('pt-BR')}* coins\n\n`;
  texto += `💡 Use: ${PREFIX}comprarfazenda <nome>`;

  return reply(texto);
}

// =========================================
// COMANDO: !comprarfazenda <nome>
// =========================================
export async function executeComprarFazenda(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const fazenda = getFazenda(sender);

  const nome = q.trim().toLowerCase();

  if (!nome) {
    return reply(`❌ Use: ${PREFIX}comprarfazenda <nome>\n\nVeja a lista: ${PREFIX}fazendas`);
  }

  const tipo = TIPOS_FAZENDA[nome];
  if (!tipo) {
    return reply(`❌ Fazenda inválida. Veja a lista: ${PREFIX}fazendas`);
  }

  if (fazenda.tipo === nome) {
    return reply('⚠️ Você já tem essa fazenda!');
  }

  if (fazenda.tipo && fazenda.tipo !== nome) {
    return reply('⚠️ Você já tem uma fazenda! Venda a atual primeiro (em breve).');
  }

  if (user.coins < tipo.preco) {
    return reply(`❌ Você precisa de ${tipo.preco.toLocaleString('pt-BR')} coins. Saldo: ${user.coins.toLocaleString('pt-BR')}`);
  }

  user.coins -= tipo.preco;
  fazenda.tipo = nome;
  fazenda.ultimaColeta = Date.now();

  salvarUsuario(sender, user);
  salvarFazenda(sender, fazenda);

  return reply(
    `✅ *FAZENDA COMPRADA!*\n\n` +
    `${tipo.emoji} *${tipo.nome}*\n` +
    `🐄 Capacidade: ${tipo.capacidade} animais\n` +
    `📈 Produção: x${tipo.producaoBase}\n\n` +
    `💰 Saldo restante: ${user.coins.toLocaleString('pt-BR')} coins\n\n` +
    `💡 Agora compre animais: ${PREFIX}lojaanimais`
  );
}

// =========================================
// COMANDO: !minhafazenda
// Mostra a fazenda do jogador
// =========================================
export async function executeMinhaFazenda(ctx) {
  const { reply, sender, pushName } = ctx;
  const fazenda = getFazenda(sender);

  if (!fazenda.tipo) {
    return reply(
      `❌ Você ainda não tem uma fazenda!\n\n` +
      `💡 Compre uma: ${PREFIX}fazendas`
    );
  }

  const tipo = TIPOS_FAZENDA[fazenda.tipo];
  const producaoHora = calcularProducao(fazenda);
  const acumulado = calcularAcumulado(fazenda);

  let texto = `🌾 *FAZENDA DE ${pushName}*\n\n` +
    `${tipo.emoji} *Tipo:* ${tipo.nome}\n` +
    `🐄 *Animais:* ${fazenda.animais.length}/${tipo.capacidade}\n` +
    `📈 *Produção:* ${producaoHora.toLocaleString('pt-BR')} coins/hora\n` +
    `💰 *Acumulado:* ${acumulado.toLocaleString('pt-BR')} coins\n` +
    `🔧 *Melhorias:* ${fazenda.melhorias.length}/6\n\n`;

  if (fazenda.animais.length > 0) {
    texto += `🐾 *SEUS ANIMAIS:*\n`;
    for (const a of fazenda.animais) {
      const info = ANIMAIS[a.tipo];
      texto += `${info.emoji} ${a.nome} — ${info.producao.toLocaleString('pt-BR')}/h\n`;
    }
    texto += `\n`;
  }

  if (fazenda.melhorias.length > 0) {
    texto += `🔧 *MELHORIAS ATIVAS:*\n`;
    for (const m of fazenda.melhorias) {
      const info = MELHORIAS[m];
      texto += `${info.emoji} ${info.nome}\n`;
    }
    texto += `\n`;
  }

  texto += `💡 Colete: ${PREFIX}coletar\n💡 Animais: ${PREFIX}lojaanimais\n💡 Melhorias: ${PREFIX}melhorias`;

  return reply(texto);
}

// =========================================
// COMANDO: !lojaanimais
// =========================================
export async function executeLojaAnimais(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const fazenda = getFazenda(sender);

  let texto = `🐄 *LOJA DE ANIMAIS*\n\n`;
  texto += `💰 Seu saldo: *${user.coins.toLocaleString('pt-BR')}* coins\n\n`;

  for (const [chave, a] of Object.entries(ANIMAIS)) {
    texto += `${a.emoji} *${a.nome}*\n`;
    texto += `   💰 Preço: ${a.preco.toLocaleString('pt-BR')} coins\n`;
    texto += `   📈 Produção: ${a.producao.toLocaleString('pt-BR')} coins/h\n`;
    texto += `   📦 Produto: ${a.produtoEmoji} ${a.produto}\n\n`;
  }

  if (fazenda.tipo) {
    const tipo = TIPOS_FAZENDA[fazenda.tipo];
    texto += `📊 Sua fazenda: ${fazenda.animais.length}/${tipo.capacidade}\n`;
  }

  texto += `\n💡 Use: ${PREFIX}compraranimal <nome>`;

  return reply(texto);
}

// =========================================
// COMANDO: !compraranimal <nome>
// =========================================
export async function executeComprarAnimal(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const fazenda = getFazenda(sender);

  if (!fazenda.tipo) {
    return reply(`❌ Você precisa ter uma fazenda primeiro!\n\n💡 Compre: ${PREFIX}fazendas`);
  }

  const nome = q.trim().toLowerCase();
  if (!nome) {
    return reply(`❌ Use: ${PREFIX}compraranimal <nome>\n\nVeja: ${PREFIX}lojaanimais`);
  }

  const animal = ANIMAIS[nome];
  if (!animal) {
    return reply(`❌ Animal inválido. Veja: ${PREFIX}lojaanimais`);
  }

  const tipo = TIPOS_FAZENDA[fazenda.tipo];
  if (fazenda.animais.length >= tipo.capacidade) {
    return reply(`❌ Sua fazenda está cheia! (${tipo.capacidade} animais)\nMelhore a fazenda para caber mais.`);
  }

  if (user.coins < animal.preco) {
    return reply(`❌ Você precisa de ${animal.preco.toLocaleString('pt-BR')} coins. Saldo: ${user.coins.toLocaleString('pt-BR')}`);
  }

  user.coins -= animal.preco;
  fazenda.animais.push({
    tipo: nome,
    nome: `${animal.nome} #${fazenda.animais.length + 1}`,
    compradoEm: Date.now()
  });

  salvarUsuario(sender, user);
  salvarFazenda(sender, fazenda);

  return reply(
    `✅ *ANIMAL COMPRADO!*\n\n` +
    `${animal.emoji} *${animal.nome}*\n` +
    `📈 Produção: ${animal.producao.toLocaleString('pt-BR')} coins/h\n\n` +
    `💰 Saldo: ${user.coins.toLocaleString('pt-BR')}\n` +
    `🐄 Fazenda: ${fazenda.animais.length}/${tipo.capacidade}`
  );
}

// =========================================
// COMANDO: !melhorias
// =========================================
export async function executeMelhorias(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const fazenda = getFazenda(sender);

  let texto = `🔧 *MELHORIAS DISPONÍVEIS*\n\n`;
  texto += `💰 Seu saldo: *${user.coins.toLocaleString('pt-BR')}* coins\n\n`;

  for (const [chave, m] of Object.entries(MELHORIAS)) {
    const comprada = fazenda.melhorias.includes(chave);
    const status = comprada ? '✅' : '❌';
    texto += `${status} ${m.emoji} *${m.nome}*\n`;
    texto += `   💰 Preço: ${m.preco.toLocaleString('pt-BR')} coins\n`;
    texto += `   📈 ${m.descricao}\n\n`;
  }

  texto += `💡 Use: ${PREFIX}comprarmelhoria <nome>`;

  return reply(texto);
}

// =========================================
// COMANDO: !comprarmelhoria <nome>
// =========================================
export async function executeComprarMelhoria(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const fazenda = getFazenda(sender);

  if (!fazenda.tipo) {
    return reply(`❌ Você precisa ter uma fazenda primeiro!\n\n💡 Compre: ${PREFIX}fazendas`);
  }

  const nome = q.trim().toLowerCase();
  if (!nome) {
    return reply(`❌ Use: ${PREFIX}comprarmelhoria <nome>\n\nVeja: ${PREFIX}melhorias`);
  }

  const melhoria = MELHORIAS[nome];
  if (!melhoria) {
    return reply(`❌ Melhoria inválida. Veja: ${PREFIX}melhorias`);
  }

  if (fazenda.melhorias.includes(nome)) {
    return reply('⚠️ Você já tem essa melhoria!');
  }

  if (user.coins < melhoria.preco) {
    return reply(`❌ Você precisa de ${melhoria.preco.toLocaleString('pt-BR')} coins. Saldo: ${user.coins.toLocaleString('pt-BR')}`);
  }

  user.coins -= melhoria.preco;
  fazenda.melhorias.push(nome);

  salvarUsuario(sender, user);
  salvarFazenda(sender, fazenda);

  return reply(
    `✅ *MELHORIA COMPRADA!*\n\n` +
    `${melhoria.emoji} *${melhoria.nome}*\n` +
    `📈 ${melhoria.descricao}\n\n` +
    `💰 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// COMANDO: !coletar
// =========================================
export async function executeColetar(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const fazenda = getFazenda(sender);

  if (!fazenda.tipo) {
    return reply(`❌ Você precisa ter uma fazenda!\n\n💡 Compre: ${PREFIX}fazendas`);
  }

  if (fazenda.animais.length === 0) {
    return reply(`❌ Você não tem animais! Compre em: ${PREFIX}lojaanimais`);
  }

  const acumulado = calcularAcumulado(fazenda);

  if (acumulado < 1) {
    return reply(
      `⏳ *NADA PARA COLETAR AINDA*\n\n` +
      `📈 Produção: ${calcularProducao(fazenda).toLocaleString('pt-BR')} coins/hora\n` +
      `💡 Volte mais tarde!`
    );
  }

  user.coins += acumulado;
  fazenda.ultimaColeta = Date.now();

  salvarUsuario(sender, user);
  salvarFazenda(sender, fazenda);

  return reply(
    `🌾 *COLHEITA REALIZADA!*\n\n` +
    `💰 Você coletou: *${acumulado.toLocaleString('pt-BR')} coins*\n\n` +
    `💼 Saldo atual: ${user.coins.toLocaleString('pt-BR')} coins`
  );
}
