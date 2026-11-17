import { PREFIX, BOT_NAME } from '../config.js';
import {
  getUsuario,
  salvarUsuario,
  verificarBonusDiario,
  transferirCoins,
  lerDB,
  salvarDB
} from '../functions/rpg.js';
import {
  CARGOS,
  FOTOS_CARGOS,
  getCargo,
  getProximoCargo,
  CASAS,
  PETS
} from '../functions/rpgJobs.js';

// 🕹️ IMPORTAÇÃO DO SISTEMA DE BOTÕES
import { enviarBotoes, botaoResposta } from '../functions/botoes.js';

// =========================================
// 🎲 FUNÇÃO PARA GERAR BOTÕES DE COMANDOS ALEATÓRIOS
// =========================================
function gerarBotoesComandosRPG(comandoAtual) {
  const comandosDisponiveis = [
    { id: 'trabalhar', text: '💼 TRABALHAR' },
    { id: 'banco', text: '🏦 BANCO' },
    { id: 'empregos', text: '📋 EMPREGOS' },
    { id: 'perfilrpg', text: '👤 PERFIL' },
    { id: 'pets', text: '🐾 PETS' },
    { id: 'casas', text: '🏠 CASAS' },
    { id: 'explorar', text: '🗺️ EXPLORAR' },
    { id: 'inventario', text: '🎒 INVENTÁRIO' }
  ];

  const filtrados = comandosDisponiveis.filter(c => c.id !== comandoAtual);
  const sorteados = filtrados.sort(() => 0.5 - Math.random()).slice(0, 2);
  
  return sorteados.map(c => botaoResposta(c.text, `${PREFIX}${c.id}`));
}

// =========================================
// !perfilrpg
// =========================================
export async function executePerfil(ctx) {
  const { client, msg, sender, pushName, jid } = ctx;
  const user = getUsuario(sender);

  const casa = CASAS[user.casa] || CASAS.barraco;
  const cargo = getCargo(user.nivelEmprego || 1);
  const proximo = getProximoCargo(user.nivelEmprego || 1);
  const petAtivo = user.petAtivo !== null ? user.pets[user.petAtivo] : null;

  const progresso = proximo
    ? `${user.trabalhosFeitos || 0}/${cargo.trabalhosNecessarios}`
    : 'MAX';

  const texto = `╭━━━〔 👤 *PERFIL RPG* 〕━━━╮\n` +
    `┃\n` +
    `┃ 👤 Nome: *${pushName}*\n` +
    `┃ 💰 Carteira: *${user.coins.toLocaleString('pt-BR')}*\n` +
    `┃ 🏦 Banco: *${user.banco.toLocaleString('pt-BR')}/5000*\n` +
    `┃ 🏠 Casa: *${casa.nome}*\n` +
    `┃\n` +
    `┃ 💼 *EMPREGO*\n` +
    `┃ • Cargo: *${cargo.nome}* (Nv. ${cargo.nivel})\n` +
    `┃ • Salário: ${cargo.salario} coins\n` +
    `┃ • Trabalhos: ${progresso}\n` +
    `┃\n` +
    `┃ 🐾 Pets: *${user.pets.length}/${casa.bonusPets}*\n` +
    `┃ ${petAtivo ? `🐶 Pet ativo: ${petAtivo.emoji} ${petAtivo.nome}` : '❌ Nenhum pet ativo'}\n` +
    `┃ 🏆 Vitórias: ${user.vitoriasPet || 0} | 💀 Derrotas: ${user.derrotasPet || 0}\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`;

  const botoes = gerarBotoesComandosRPG('perfilrpg');

  try {
    await enviarBotoes(client, jid, {
      corpo: texto,
      rodape: '© Pikachu Bot',
      mencoes: [sender],
      botoes: botoes
    }, msg);
  } catch (e) {
    return client.sendMessage(jid, { text: texto, mentions: [sender] }, { quoted: msg });
  }
}

// =========================================
// !trabalhar
// =========================================
export async function executeTrabalhar(ctx) {
  const { client, msg, sender, pushName, reply, jid } = ctx;
  const user = getUsuario(sender);

  const agora = Date.now();
  const cooldown = 60 * 60 * 1000;

  if (agora - (user.ultimoSalario || 0) < cooldown) {
    const restanteMs = cooldown - (agora - user.ultimoSalario);
    const minutos = Math.ceil(restanteMs / 60000);
    const horas = Math.floor(minutos / 60);
    const min = minutos % 60;

    const tempoTexto = horas > 0 ? `${horas}h ${min}min` : `${min}min`;
    return reply(`⏳ Você precisa descansar!\n\n⏰ Volte em *${tempoTexto}* para trabalhar novamente.`);
  }

  const cargo = getCargo(user.nivelEmprego || 1);
  const proximo = getProximoCargo(user.nivelEmprego || 1);

  user.coins += cargo.salario;
  user.ultimoSalario = agora;
  user.trabalhosFeitos = (user.trabalhosFeitos || 0) + 1;

  let textoExtra = '';

  if (proximo && user.trabalhosFeitos >= cargo.trabalhosNecessarios) {
    user.nivelEmprego = (user.nivelEmprego || 1) + 1;
    user.trabalhosFeitos = 0;

    const novoCargo = getCargo(user.nivelEmprego);
    textoExtra = `\n\n🎉 *PROMOÇÃO!* 🎉\n\n📈 Você subiu para *${novoCargo.nome}*!\n💰 Novo salário: ${novoCargo.salario} coins`;
  }

  salvarUsuario(sender, user);

  const foto = FOTOS_CARGOS[cargo.nivel] || FOTOS_CARGOS[1];

  const texto = `💼 *DIA DE TRABALHO!*\n\n` +
    `👤 Funcionário: *${pushName}*\n` +
    `📋 Cargo: *${cargo.nome}* (Nv. ${cargo.nivel})\n` +
    `💰 Salário recebido: *+${cargo.salario} coins*\n` +
    `💼 Carteira: ${user.coins}\n\n` +
    `📊 Progresso: ${user.trabalhosFeitos}/${cargo.trabalhosNecessarios}` +
    textoExtra;

  const botoes = gerarBotoesComandosRPG('trabalhar');

  try {
    await enviarBotoes(client, jid, {
      corpo: texto,
      rodape: '© Pikachu Bot',
      mencoes: [sender],
      botoes: botoes
    }, msg);
  } catch {
    try {
      return await client.sendMessage(jid, { image: { url: foto }, caption: texto }, { quoted: msg });
    } catch {
      return reply(texto);
    }
  }
}

// =========================================
// !empregos
// =========================================
export async function executeEmpregos(ctx) {
  const { client, msg, sender, reply, jid } = ctx;
  const user = getUsuario(sender);
  const cargoAtual = getCargo(user.nivelEmprego || 1);

  let texto = `💼 *TABELA DE CARGOS*\n\n`;
  texto += `📌 *Seu cargo atual:* ${cargoAtual.nome} (Nv. ${cargoAtual.nivel})\n\n`;

  CARGOS.forEach(c => {
    const marcador = c.nivel === cargoAtual.nivel ? '▶️' : '  ';
    texto += `${marcador} Nv.${c.nivel} — *${c.nome}*\n`;
    texto += `     💰 Salário: ${c.salario} coins\n`;
    if (c.trabalhosNecessarios < 999) {
      texto += `     📊 Subir: ${c.trabalhosNecessarios} trabalhos\n`;
    } else {
      texto += `     📊 Cargo máximo\n`;
    }
    texto += `\n`;
  });

  texto += `💡 Use: ${PREFIX}trabalhar (cooldown de 1 hora)`;

  const botoes = gerarBotoesComandosRPG('empregos');

  try {
    await enviarBotoes(client, jid, {
      corpo: texto,
      rodape: '© Pikachu Bot',
      mencoes: [sender],
      botoes: botoes
    }, msg);
  } catch {
    try {
      return await client.sendMessage(jid, { image: { url: FOTOS_CARGOS[1] }, caption: texto }, { quoted: msg });
    } catch {
      return reply(texto);
    }
  }
}

// =========================================
// !apostar <valor>
// =========================================
export async function executeApostar(ctx) {
  const { reply, sender, q, client, jid, msg } = ctx;
  const user = getUsuario(sender);

  const valor = parseInt(q.trim());

  if (!valor || valor <= 0) {
    const botoes = [
      botaoResposta('💸 100 coins', `${PREFIX}apostar 100`),
      botaoResposta('💸 250 coins', `${PREFIX}apostar 250`),
      botaoResposta('💸 500 coins', `${PREFIX}apostar 500`),
      botaoResposta('💸 1000 coins', `${PREFIX}apostar 1000`)
    ];
    
    const texto = `🎰 *APOSTAR*\n\nEscolha um valor para apostar (limite 1000):\n💼 Seu saldo: *${user.coins.toLocaleString('pt-BR')}* coins`;

    try {
      return await enviarBotoes(client, jid, {
        corpo: texto,
        rodape: '© Pikachu Bot',
        botoes: botoes
      }, msg);
    } catch {
      return reply(`❌ Use: ${PREFIX}apostar <valor>`);
    }
  }

  if (valor > user.coins) return reply(`❌ Você não tem ${valor} coins. Saldo: ${user.coins}`);

  // CHANCE DE ACERTO: 25%
  const ganhou = Math.random() < 0.25;

  if (ganhou) {
    user.coins += valor;
    salvarUsuario(sender, user);
    return reply(`🎉 *VOCÊ GANHOU!* 🎉\n\n💰 +${valor} coins\n💼 Saldo: ${user.coins}`);
  } else {
    user.coins -= valor;
    salvarUsuario(sender, user);
    return reply(`😢 *VOCÊ PERDEU!*\n\n💸 -${valor} coins\n💼 Saldo: ${user.coins}`);
  }
}

// =========================================
// !investir <valor>
// =========================================
export async function executeInvestir(ctx) {
  const { reply, sender, q, client, jid, msg } = ctx;
  const user = getUsuario(sender);

  const valor = parseInt(q.trim());

  if (!valor || valor <= 0) {
    const botoes = [
      botaoResposta('📈 100 coins', `${PREFIX}investir 100`),
      botaoResposta('📈 250 coins', `${PREFIX}investir 250`),
      botaoResposta('📈 500 coins', `${PREFIX}investir 500`),
      botaoResposta('📈 1000 coins', `${PREFIX}investir 1000`)
    ];
    
    const texto = `📈 *INVESTIR*\n\nEscolha um valor para investir (limite 1000):\n💼 Seu saldo: *${user.coins.toLocaleString('pt-BR')}* coins`;

    try {
      return await enviarBotoes(client, jid, {
        corpo: texto,
        rodape: '© Pikachu Bot',
        botoes: botoes
      }, msg);
    } catch {
      return reply(`❌ Use: ${PREFIX}investir <valor>`);
    }
  }

  if (valor > user.coins) return reply(`❌ Saldo insuficiente. Você tem ${user.coins}.`);

  user.coins -= valor;
  
  // CHANCE DE ACERTO: 35%
  const lucro = Math.random() < 0.35 ? valor * 2 : 0;

  if (lucro > 0) {
    user.coins += lucro;
    salvarUsuario(sender, user);
    return reply(`📈 *INVESTIMENTO LUCRATIVO!*\n\n💵 Investiu: ${valor}\n💰 Retorno: ${lucro}\n💼 Saldo: ${user.coins}`);
  } else {
    salvarUsuario(sender, user);
    return reply(`📉 *INVESTIMENTO FALHOU!*\n\n💸 Perdeu ${valor} coins.\n💰 Saldo: ${user.coins}`);
  }
}

// =========================================
// !roubar @user
// =========================================
export async function executeRoubar(ctx) {
  const { reply, sender, msg } = ctx;
  const user = getUsuario(sender);

  const agora = Date.now();
  const cooldown = 10 * 60 * 1000;
  if (agora - (user.ultimoRoubo || 0) < cooldown) {
    const restante = Math.ceil((cooldown - (agora - user.ultimoRoubo)) / 60000);
    return reply(`⏳ Aguarde ${restante} minutos para roubar novamente.`);
  }

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`❌ Marque alguém! Ex: ${PREFIX}roubar @joao`);

  const alvo = mentions[0];
  if (alvo === sender) return reply('❌ Você não pode roubar a si mesmo.');

  const userAlvo = getUsuario(alvo);
  if (userAlvo.coins < 50) return reply('❌ O alvo é muito pobre.');

  user.ultimoRoubo = agora;

  if (Math.random() < 0.4) {
    const roubado = Math.floor(userAlvo.coins * 0.2);
    user.coins += roubado;
    userAlvo.coins -= roubado;
    salvarUsuario(sender, user);
    salvarUsuario(alvo, userAlvo);
    return reply(`🥷 *ROUBO BEM-SUCEDIDO!*\n\n💰 Roubou *${roubado} coins*!\n💼 Saldo: ${user.coins}`);
  } else {
    const multa = Math.min(100, user.coins);
    user.coins -= multa;
    salvarUsuario(sender, user);
    return reply(`🚔 *VOCÊ FOI PEGO!*\n\n💸 Multa: -${multa} coins\n💰 Saldo: ${user.coins}`);
  }
}

// =========================================
// !pix @user <valor>
// =========================================
function soDigitos(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function ehTelefone(jid) {
  return typeof jid === 'string' && jid.endsWith('@s.whatsapp.net');
}

async function resolverContaMarcada(ctx, mencionado) {
  const { client, msg, groupMetadata } = ctx;
  const digitos = soDigitos(mencionado);
  const candidatos = [];

  if (ehTelefone(mencionado)) {
    candidatos.push(`${digitos}@s.whatsapp.net`);
  } else {
    const procurar = meta => meta?.participants?.find(p =>
      [p.id, p.lid, p.phoneNumber, p.participantAlt, p.jid].some(x => x && soDigitos(x) === digitos)
    );

    let part = procurar(groupMetadata);
    if (!part && String(msg?.key?.remoteJid || '').endsWith('@g.us')) {
      try { part = procurar(await client.groupMetadata(msg.key.remoteJid)); } catch (e) {}
    }

    const tel = part && [part.phoneNumber, part.participantAlt, part.jid, part.id].find(ehTelefone);
    if (tel) candidatos.push(`${soDigitos(tel)}@s.whatsapp.net`);
  }

  candidatos.push(mencionado);

  const db = lerDB();
  const existente = candidatos.find(c => db.usuarios[c]);
  if (existente) return existente;
  return ehTelefone(candidatos[0]) ? candidatos[0] : null;
}

export async function executePix(ctx) {
  const { reply, sender, msg, q, pushName, client } = ctx;

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply(
      `💸 *COMO USAR O PIX*\n\n` +
      `Use: ${PREFIX}pix @pessoa <valor>\n\n` +
      `💡 Exemplo: ${PREFIX}pix @joao 500`
    );
  }

  const alvo = mentions[0];

  const partes = q.trim().split(/\s+/);
  const valor = parseInt(partes[partes.length - 1]);

  if (!valor || valor <= 0) {
    return reply(`❌ Valor inválido!\n\nUse: ${PREFIX}pix @pessoa <valor>`);
  }

  if (valor < 10) return reply('💸 Valor mínimo: 10 coins');

  const contaAlvo = await resolverContaMarcada(ctx, alvo);
  if (!contaAlvo) {
    return reply(
      `❌ Não consegui identificar a conta de @${soDigitos(alvo)}.\n\n` +
      `💡 Peça para ela usar algum comando do bot e tente de novo.`,
      { mentions: [alvo] }
    );
  }

  if (soDigitos(contaAlvo) === soDigitos(sender) || soDigitos(alvo) === soDigitos(sender)) {
    return reply('❌ Você não pode fazer pix para si mesmo!');
  }

  const idsBot = [soDigitos(client.user?.id), soDigitos(client.user?.lid)].filter(Boolean);
  if (idsBot.includes(soDigitos(contaAlvo)) || idsBot.includes(soDigitos(alvo))) {
    return reply('❌ Você não pode enviar pix para o bot!');
  }

  const saldoRemetente = getUsuario(sender).coins;
  if (saldoRemetente < valor) {
    return reply(
      `❌ *SALDO INSUFICIENTE*\n\n` +
      `💰 Você tem: *${saldoRemetente.toLocaleString('pt-BR')}* coins\n` +
      `💸 Precisa de: *${valor.toLocaleString('pt-BR')}* coins`
    );
  }

  getUsuario(contaAlvo);
  const r = transferirCoins(sender, contaAlvo, valor);
  if (!r.ok) {
    return reply(
      `❌ *SALDO INSUFICIENTE*\n\n` +
      `💰 Você tem: *${(r.saldo || 0).toLocaleString('pt-BR')}* coins\n` +
      `💸 Precisa de: *${valor.toLocaleString('pt-BR')}* coins`
    );
  }

  const saldoNovoRemetente = r.saldoDe;
  const saldoNovoDestinatario = r.saldoPara;

  const tagAlvo = soDigitos(alvo);
  const numeroAlvo = soDigitos(contaAlvo);

  const idTransacao = `PIX${Date.now().toString().slice(-10)}`;
  const agora = new Date();
  const dataFormatada = agora.toLocaleDateString('pt-BR');
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const comprovante =
    `┌───〔 💸 *COMPROVANTE PIX* 〕\n` +
    `│\n` +
    `├─── ♡ 🏦 *TRANSAÇÃO* ♡\n` +
    `│    └──➤ 🔢 ID: ${idTransacao}\n` +
    `│    └──➤ 📅 Data: ${dataFormatada} ⏰ ${horaFormatada}\n` +
    `│\n` +
    `├─── ♡ 📤 *REMETENTE* ♡\n` +
    `│    └──➤ 👤 ${pushName}\n` +
    `│    └──➤ 📱 ${soDigitos(sender)}\n` +
    `│\n` +
    `├─── ♡ 📥 *DESTINATÁRIO* ♡\n` +
    `│    └──➤ 👤 @${tagAlvo}\n` +
    `│    └──➤ 📱 ${numeroAlvo}\n` +
    `│\n` +
    `├─── ♡ 💰 *VALORES* ♡\n` +
    `│    └──➤ 💸 Enviado: *${valor.toLocaleString('pt-BR')} coins*\n` +
    `│    └──➤ 💼 Seu saldo: *${saldoNovoRemetente.toLocaleString('pt-BR')} coins*\n` +
    `│\n` +
    `└───〔 ✅ *TRANSFERÊNCIA REALIZADA* 〕`;

  try {
    const comprovanteDestinatario =
      `┌───〔 🎉 *PIX RECEBIDO!* 〕\n` +
      `│\n` +
      `├─── ♡ 🏦 *TRANSAÇÃO* ♡\n` +
      `│    └──➤ 🔢 ID: ${idTransacao}\n` +
      `│    └──➤ 📅 Data: ${dataFormatada} ⏰ ${horaFormatada}\n` +
      `│\n` +
      `├─── ♡ 📥 *RECEBIDO DE* ♡\n` +
      `│    └──➤ 👤 ${pushName}\n` +
      `│    └──➤ 📱 ${soDigitos(sender)}\n` +
      `│\n` +
      `├─── ♡ 💰 *VALORES* ♡\n` +
      `│    └──➤ 💸 Recebido: *${valor.toLocaleString('pt-BR')} coins*\n` +
      `│    └──➤ 💼 Seu saldo: *${saldoNovoDestinatario.toLocaleString('pt-BR')} coins*\n` +
      `│\n` +
      `└───〔 🔒 *Freddy Bank © 2026* 〕`;

    await client.sendMessage(msg.key.remoteJid, {
      text: comprovanteDestinatario,
      mentions: [alvo]
    }, { quoted: msg });
  } catch (e) {
    console.error('[PIX] Erro ao notificar:', e.message);
  }

  return reply(comprovante, { mentions: [alvo] });
}

// =========================================
// !banco depositar/sacar
// =========================================
export async function executeBanco(ctx) {
  const { client, msg, sender, reply, q, jid } = ctx;
  const user = getUsuario(sender);

  const partes = q.trim().split(/\s+/);
  const acao = partes[0]?.toLowerCase();
  const valor = parseInt(partes[1]);

  if (acao === 'depositar') {
    if (!valor || valor <= 0) return reply(`❌ Use: ${PREFIX}banco depositar <valor>`);
    if (valor > user.coins) return reply(`❌ Você não tem ${valor} coins.`);
    if (user.banco + valor > 5000) return reply('❌ O banco só aceita até *5000 coins*.');

    user.coins -= valor;
    user.banco += valor;
    salvarUsuario(sender, user);
    
    const botoes = gerarBotoesComandosRPG('banco');
    try {
      await enviarBotoes(client, jid, {
        corpo: `🏦 *DEPÓSITO*\n\n💰 Depositado: ${valor}\n🏦 Banco: ${user.banco}/5000`,
        rodape: '© Pikachu Bot',
        botoes: botoes
      }, msg);
    } catch {
      return reply(`🏦 *DEPÓSITO*\n\n💰 Depositado: ${valor}\n🏦 Banco: ${user.banco}/5000`);
    }
    return;
  }

  if (acao === 'sacar') {
    if (!valor || valor <= 0) return reply(`❌ Use: ${PREFIX}banco sacar <valor>`);
    if (valor > user.banco) return reply(`❌ Você só tem ${user.banco} no banco.`);

    user.banco -= valor;
    user.coins += valor;
    salvarUsuario(sender, user);

    const botoes = gerarBotoesComandosRPG('banco');
    try {
      await enviarBotoes(client, jid, {
        corpo: `🏦 *SAQUE*\n\n💰 Sacado: ${valor}\n🏦 Banco: ${user.banco}/5000`,
        rodape: '© Pikachu Bot',
        botoes: botoes
      }, msg);
    } catch {
      return reply(`🏦 *SAQUE*\n\n💰 Sacado: ${valor}\n🏦 Banco: ${user.banco}/5000`);
    }
    return;
  }

  const textoMenu = 
    `🏦 *BANCO*\n\n` +
    `💰 Carteira: ${user.coins}\n` +
    `🏦 Banco: ${user.banco}/5000\n\n` +
    `Comandos:\n` +
    `• ${PREFIX}banco depositar <valor>\n` +
    `• ${PREFIX}banco sacar <valor>`;

  const botoes = gerarBotoesComandosRPG('banco');
  try {
    await enviarBotoes(client, jid, {
      corpo: textoMenu,
      rodape: '© Pikachu Bot',
      botoes: botoes
    }, msg);
  } catch {
    return reply(textoMenu);
  }
}

// =========================================
// !adotar <pet>
// =========================================
export async function executeAdotar(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const casa = CASAS[user.casa];

  if (user.pets.length >= casa.bonusPets) {
    return reply(`❌ Sua casa (${casa.nome}) só permite ${casa.bonusPets} pets.`);
  }

  const nome = q.trim().toLowerCase();
  const pet = PETS[nome];

  if (!pet) return reply(`❌ Pet inválido. Use: ${PREFIX}pets`);
  if (user.coins < pet.preco) return reply(`❌ Precisa de ${pet.preco} coins. Saldo: ${user.coins}`);

  user.coins -= pet.preco;
  user.pets.push({
    tipo: nome,
    nome: pet.nome,
    emoji: pet.emoji,
    hp: pet.hp,
    atk: pet.atk,
    def: pet.def,
    felicidade: 50,
    fome: 50
  });

  if (user.petAtivo === null) user.petAtivo = user.pets.length - 1;
  salvarUsuario(sender, user);

  return reply(`🎉 Você adotou um *${pet.emoji} ${pet.nome}*!\n💰 Saldo: ${user.coins}`);
}

// =========================================
// !pets
// =========================================
export async function executePets(ctx) {
  const { client, msg, sender, jid } = ctx;
  const user = getUsuario(sender);

  if (user.pets.length === 0) return ctx.reply(`❌ Você não tem pet!\nUse: ${PREFIX}adotar <pet>`);

  let texto = `🐾 *SEUS PETS*\n\n`;
  user.pets.forEach((p, i) => {
    const ativo = user.petAtivo === i ? ' ✅' : '';
    texto += `${i + 1}. ${p.emoji} *${p.nome}*${ativo}\n`;
    texto += `   ❤️ HP: ${p.hp} | ⚔️ ATK: ${p.atk} | 🛡️ DEF: ${p.def}\n`;
    texto += `   😊 Felicidade: ${p.felicidade}/100 | 🍖 Fome: ${p.fome}/100\n\n`;
  });

  const botoes = gerarBotoesComandosRPG('pets');
  try {
    await enviarBotoes(client, jid, {
      corpo: texto,
      rodape: '© Pikachu Bot',
      mencoes: [sender],
      botoes: botoes
    }, msg);
  } catch {
    return ctx.reply(texto);
  }
}

// =========================================
// !trocarpet <n>
// =========================================
export async function executeTrocarPet(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);

  const num = parseInt(q.trim());
  if (!num || num < 1 || num > user.pets.length) {
    return reply(`❌ Use: ${PREFIX}trocarpet <número>`);
  }

  user.petAtivo = num - 1;
  salvarUsuario(sender, user);

  const p = user.pets[num - 1];
  return reply(`✅ Pet ativo: ${p.emoji} *${p.nome}*`);
}

// =========================================
// !batalhapet @user
// =========================================
export async function executeBatalhaPet(ctx) {
  const { reply, sender, msg, pushName } = ctx;
  const user = getUsuario(sender);

  if (user.petAtivo === null) return reply('❌ Você precisa de um pet ativo.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`❌ Marque alguém! Ex: ${PREFIX}batalhapet @joao`);

  const oponente = mentions[0];
  if (oponente === sender) return reply('❌ Você não pode batalhar contra si mesmo.');

  const userO = getUsuario(oponente);
  if (userO.petAtivo === null) return reply('❌ O oponente não tem pet ativo.');

  const p1 = user.pets[user.petAtivo];
  const p2 = userO.pets[userO.petAtivo];

  const poder1 = p1.hp + p1.atk * 2 + p1.def + p1.felicidade / 5;
  const poder2 = p2.hp + p2.atk * 2 + p2.def + p2.felicidade / 5;

  const vencedor = poder1 >= poder2 ? 'p1' : 'p2';
  const premio = 200;

  if (vencedor === 'p1') {
    user.coins += premio;
    userO.coins = Math.max(0, userO.coins - premio);
    user.vitoriasPet = (user.vitoriasPet || 0) + 1;
    userO.derrotasPet = (userO.derrotasPet || 0) + 1;
  } else {
    userO.coins += premio;
    user.coins = Math.max(0, user.coins - premio);
    userO.vitoriasPet = (userO.vitoriasPet || 0) + 1;
    user.derrotasPet = (user.derrotasPet || 0) + 1;
  }

  salvarUsuario(sender, user);
  salvarUsuario(oponente, userO);

  return reply(
    `⚔️ *BATALHA DE PETS*\n\n` +
    `👤 *${pushName}*\n   ${p1.emoji} ${p1.nome} (Poder: ${poder1.toFixed(0)})\n\n` +
    `🆚\n\n` +
    `👤 *Oponente*\n   ${p2.emoji} ${p2.nome} (Poder: ${poder2.toFixed(0)})\n\n` +
    `🏆 *VENCEDOR:* ${vencedor === 'p1' ? pushName : 'Oponente'}\n` +
    `💰 Prêmio: ${premio} coins`
  );
}

// =========================================
// !comprarcasa <casa>
// =========================================
export async function executeComprarCasa(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);

  const nome = q.trim().toLowerCase();
  const casa = CASAS[nome];

  if (!casa) return reply(`❌ Casa inválida. Veja: ${PREFIX}casas`);
  if (user.coins < casa.preco) return reply(`❌ Precisa de ${casa.preco} coins. Saldo: ${user.coins}`);

  user.coins -= casa.preco;
  user.casa = nome;
  salvarUsuario(sender, user);

  return reply(`🏠 Você comprou a casa *${casa.nome}*!\n💰 Saldo: ${user.coins}`);
}

// =========================================
// !casas
// =========================================
export async function executeCasas(ctx) {
  const { client, msg, sender, jid, reply } = ctx;

  let texto = `🏠 *CASAS DISPONÍVEIS*\n\n`;
  for (const [k, v] of Object.entries(CASAS)) {
    texto += `• *${v.nome}* — ${v.preco} coins\n   🐾 Limite de pets: ${v.bonusPets}\n\n`;
  }

  const botoes = gerarBotoesComandosRPG('casas');
  try {
    await enviarBotoes(client, jid, {
      corpo: texto,
      rodape: '© Pikachu Bot',
      mencoes: [sender],
      botoes: botoes
    }, msg);
  } catch {
    return reply(texto);
  }
  }
