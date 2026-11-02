import { PREFIX, BOT_NAME } from '../config.js';
import { getUsuario, salvarUsuario } from '../functions/rpg.js';
import { isAdmin, isOwner } from '../functions/permissions.js';
import { enviarMidia } from '../functions/midia.js';

// =========================================
// ESTADO DOS JOGOS
// =========================================
const desafiosVelha = {};
const jogosVelha = {};
const quebraCabecas = {};
const salasVDD = {};
const euNunca = {};
const forcas = {};
const quizAnimais = {};
const cooldownsJogos = {};

// =========================================
// UTILITÁRIO
// =========================================
function normalizarJid(jid) {
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0];
}

// =========================================
// COOLDOWN
// =========================================
function verificarCooldown(sender, minutos = 30) {
  const agora = Date.now();
  const cooldownMs = minutos * 60 * 1000;

  if (cooldownsJogos[sender] && agora - cooldownsJogos[sender] < cooldownMs) {
    const restanteMs = cooldownMs - (agora - cooldownsJogos[sender]);
    const minutosRestantes = Math.ceil(restanteMs / 60000);
    return { permitido: false, restante: minutosRestantes };
  }
  return { permitido: true };
}

function registrarCooldown(sender) {
  cooldownsJogos[sender] = Date.now();
}

// =========================================
// 1. JOGO DA VELHA
// =========================================
function exibirTabuleiro(tab) {
  const linha = (a, b, c) => `${a} ┃ ${b} ┃ ${c}`;
  const sep = '━━╋━━━╋━━';
  return linha(tab[0], tab[1], tab[2]) + '\n' + sep + '\n' +
         linha(tab[3], tab[4], tab[5]) + '\n' + sep + '\n' +
         linha(tab[6], tab[7], tab[8]);
}

function verificarVitoria(tab) {
  const combos = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of combos) {
    if (tab[a] === tab[b] && tab[b] === tab[c]) return tab[a];
  }
  return null;
}

export async function executeVelha(ctx) {
  const { reply, msg, sender, pushName } = ctx;
  const jid = msg.key.remoteJid;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (jogosVelha[jid]) return reply('⚠️ Já tem um Jogo da Velha em andamento!');
  if (desafiosVelha[jid]) return reply('⚠️ Já tem um desafio pendente!');

  if (ctx.q.trim().toLowerCase() === 'aceitar') {
    const desafio = desafiosVelha[jid];
    if (!desafio) return reply('❌ Nenhum desafio pendente.');
    if (normalizarJid(desafio.desafiado) !== normalizarJid(sender)) {
      return reply('❌ Esse desafio não é pra você!');
    }

    jogosVelha[jid] = {
      tabuleiro: ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'],
      j1: desafio.desafiante,
      j2: desafio.desafiado,
      nome1: desafio.nomeDesafiante,
      nome2: pushName,
      turno: desafio.desafiante,
      emoji1: '❌',
      emoji2: '⭕'
    };

    delete desafiosVelha[jid];

    return reply(
      `🎮 *JOGO DA VELHA INICIADO!*\n\n` +
      `❌ ${desafio.nomeDesafiante}\n` +
      `⭕ ${pushName}\n\n` +
      `📋 Tabuleiro:\n${exibirTabuleiro(jogosVelha[jid].tabuleiro)}\n\n` +
      `💡 *${desafio.nomeDesafiante}*, sua vez!\nUse: ${PREFIX}jogarvelha <1-9>`
    );
  }

  if (ctx.q.trim().toLowerCase() === 'recusar') {
    const desafio = desafiosVelha[jid];
    if (!desafio) return reply('❌ Nenhum desafio pendente.');
    if (normalizarJid(desafio.desafiado) !== normalizarJid(sender)) {
      return reply('❌ Esse desafio não é pra você!');
    }
    delete desafiosVelha[jid];
    return reply(`❌ *${pushName}* recusou o desafio.`);
  }

  if (mentions.length === 0) return reply(`❌ Use: ${PREFIX}velha @adversario`);

  const oponente = mentions[0];
  if (normalizarJid(oponente) === normalizarJid(sender)) {
    return reply('❌ Você não pode jogar contra si mesmo.');
  }

  desafiosVelha[jid] = {
    desafiante: sender,
    desafiado: oponente,
    nomeDesafiante: pushName,
    criadoEm: Date.now()
  };

  return reply(
    `🎮 *DESAFIO DE JOGO DA VELHA*\n\n` +
    `👤 Desafiante: ${pushName}\n` +
    `🎯 Desafiado: @${normalizarJid(oponente)}\n\n` +
    `💡 *${pushName}* te desafiou!\n\n` +
    `✅ Aceitar: ${PREFIX}velha aceitar\n` +
    `❌ Recusar: ${PREFIX}velha recusar\n\n` +
    `⚠️ Prêmio: 500 coins`,
    { mentions: [oponente] }
  );
}

export async function executeJogarVelha(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogosVelha[jid];

  if (!jogo) return reply('❌ Nenhum Jogo da Velha ativo.');

  const senderNorm = normalizarJid(sender);
  const turnoNorm = normalizarJid(jogo.turno);
  const j1Norm = normalizarJid(jogo.j1);
  const j2Norm = normalizarJid(jogo.j2);

  if (senderNorm !== j1Norm && senderNorm !== j2Norm) return reply('❌ Você não está jogando esta partida!');
  if (senderNorm !== turnoNorm) {
    const nomeAtual = turnoNorm === j1Norm ? jogo.nome1 : jogo.nome2;
    return reply(`❌ Não é sua vez! É a vez de *${nomeAtual}*.`);
  }

  const pos = parseInt(q.trim()) - 1;
  if (isNaN(pos) || pos < 0 || pos > 8) return reply('❌ Escolha de 1 a 9.');
  if (!['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'].includes(jogo.tabuleiro[pos])) {
    return reply('❌ Essa posição já está ocupada!');
  }

  const emoji = senderNorm === j1Norm ? jogo.emoji1 : jogo.emoji2;
  jogo.tabuleiro[pos] = emoji;

  const vencedor = verificarVitoria(jogo.tabuleiro);
  const cheio = jogo.tabuleiro.every(c => c === jogo.emoji1 || c === jogo.emoji2);

  if (vencedor) {
    const ganhador = vencedor === jogo.emoji1 ? jogo.nome1 : jogo.nome2;
    const jidVencedor = vencedor === jogo.emoji1 ? jogo.j1 : jogo.j2;
    const jidPerdedor = vencedor === jogo.emoji1 ? jogo.j2 : jogo.j1;

    const userV = getUsuario(jidVencedor);
    const userP = getUsuario(jidPerdedor);
    const premio = 500;
    userV.coins += premio;
    userP.coins = Math.max(0, userP.coins - premio);
    salvarUsuario(jidVencedor, userV);
    salvarUsuario(jidPerdedor, userP);

    registrarCooldown(jidVencedor);
    registrarCooldown(jidPerdedor);
    delete jogosVelha[jid];

    return reply(
      `🎉 *VITÓRIA DE ${ganhador.toUpperCase()}!*\n\n` +
      exibirTabuleiro(jogo.tabuleiro) +
      `\n\n💰 Prêmio: ${premio} coins\n⏳ Cooldown: 30 minutos`
    );
  }

  if (cheio) {
    registrarCooldown(jogo.j1);
    registrarCooldown(jogo.j2);
    delete jogosVelha[jid];
    return reply(`🤝 *EMPATE!*\n\n` + exibirTabuleiro(jogo.tabuleiro));
  }

  jogo.turno = senderNorm === j1Norm ? jogo.j2 : jogo.j1;
  const proximoNome = senderNorm === j1Norm ? jogo.nome2 : jogo.nome1;

  return reply(
    `📋 Tabuleiro:\n${exibirTabuleiro(jogo.tabuleiro)}\n\n` +
    `💡 Vez de *${proximoNome}*! Use: ${PREFIX}jogarvelha <1-9>`
  );
}

export async function executePararVelha(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;
  if (desafiosVelha[jid]) { delete desafiosVelha[jid]; return reply('🛑 Desafio cancelado.'); }
  if (!jogosVelha[jid]) return reply('❌ Nenhum jogo da velha ativo.');
  delete jogosVelha[jid];
  return reply('🛑 Jogo da Velha encerrado.');
}

// =========================================
// 2. QUEBRA-CABEÇA
// =========================================
const PAISAGENS = [
  { nome: 'Praia', emojis: '🏖️ 🌊 ☀️ 🐚 🌴 ⛱️ 🥥 🦀 🐠 🏄' },
  { nome: 'Floresta', emojis: '🌲 🌳 🍄 🦌 🐿️ 🦉 🪵 🌿 🦋 🌧️' },
  { nome: 'Montanha', emojis: '🏔️ ⛰️ 🧗 🌨️ 🦅 🌲 ❄️ 🏕️ 🔥 🗻' },
  { nome: 'Cidade', emojis: '🏙️ 🚗 🚦 🏢 🏬 🌃 🚕 🛣️ 🚧 🏦' },
  { nome: 'Fazenda', emojis: '🚜 🐄 🐔 🌾 🐖 🚜 🏚️ 🌽 🐑 🐓' },
  { nome: 'Espaço', emojis: '🚀 🌌 🌟 🛰️ 🌍 👽 ☄️ 🪐 🛸 🔭' },
  { nome: 'Deserto', emojis: '🏜️ 🌵 🐪 ☀️ 🦂 🐍 🔥 💀 🏝️ 🧭' },
  { nome: 'Fundo do Mar', emojis: '🐙 🦈 🐠 🐡 🦑 🐚 🐋 🌊 🦐 🐬' },
  { nome: 'Natal', emojis: '🎄 🎅 🎁 ⛄ 🦌 🔔 🕯️ 🎁 ❄️ 🎉' },
  { nome: 'Carnaval', emojis: '🎭 🎉 🎊 🎈 🥁 🎺 💃 🎶 🎨 🪩' }
];

export async function executeQuebraCabeca(ctx) {
  const { reply, msg, sender } = ctx;
  const jid = msg.key.remoteJid;
  if (quebraCabecas[jid]) return reply('⚠️ Já tem um quebra-cabeça ativo!');

  const cd = verificarCooldown(sender);
  if (!cd.permitido) return reply(`⏳ Aguarde *${cd.restante} minutos*.`);

  const paisagem = PAISAGENS[Math.floor(Math.random() * PAISAGENS.length)];
  const embaralhado = paisagem.emojis.split(' ').sort(() => Math.random() - 0.5).join(' ');

  quebraCabecas[jid] = { resposta: paisagem.nome.toLowerCase(), criadoEm: Date.now() };

  return reply(
    `🧩 *QUEBRA-CABEÇA*\n\nAdivinhe a paisagem:\n\n${embaralhado}\n\n` +
    `💡 Use: ${PREFIX}responder <resposta>\n🏆 Prêmio: 1000 coins\n⏳ Cooldown: 30 min`
  );
}

export async function executeResponder(ctx) {
  const { reply, msg, sender, q, pushName } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = quebraCabecas[jid];

  if (!jogo) return reply('❌ Nenhum quebra-cabeça ativo.');
  if (!q.trim()) return reply(`❌ Use: ${PREFIX}responder <resposta>`);

  if (q.trim().toLowerCase() === jogo.resposta) {
    const cd = verificarCooldown(sender);
    if (!cd.permitido) return reply(`⏳ Você está em cooldown! Aguarde *${cd.restante} min*.`);

    const user = getUsuario(sender);
    user.coins += 1000;
    salvarUsuario(sender, user);
    registrarCooldown(sender);
    delete quebraCabecas[jid];

    return reply(`🎉 *ACERTOU, ${pushName}!*\n\n✅ Resposta: *${jogo.resposta}*\n💰 1000 coins\n⏳ Cooldown: 30 min`);
  }
  return reply(`❌ Errou! Tente novamente.`);
}

export async function executePararQuebra(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;
  if (!quebraCabecas[jid]) return reply('❌ Nenhum quebra-cabeça ativo.');
  const resp = quebraCabecas[jid].resposta;
  delete quebraCabecas[jid];
  return reply(`🛑 Encerrado! Era: *${resp}*`);
}

// =========================================
// 3. VERDADE OU DESAFIO
// =========================================
const VERDADES = [
  'Qual foi a coisa mais vergonhosa que já fez?',
  'Já chorou assistindo desenho? Qual?',
  'Qual foi a última mentira que contou?',
  'Qual a pessoa mais chata do grupo na sua opinião?',
  'Já stalkeou alguém aqui?',
  'Qual o seu maior medo?',
  'Quantas vezes escovou os dentes hoje?',
  'Qual o apelido mais feio que já te deram?',
  'Já fingiu que gostou de um presente?',
  'Qual música mais vergonhosa tem na playlist?'
];

const DESAFIOS = [
  'Mande uma foto do seu pé agora',
  'Escreva uma poesia de 4 linhas sobre alguém do grupo',
  'Fale "eu sou gado" 10 vezes em áudio',
  'Mande print da sua última pesquisa',
  'Mude seu nome no grupo para "Sou Lindo(a)" por 1h',
  'Mande um áudio cantando funk',
  'Escreva um texto de 5 linhas usando só emojis',
  'Marque alguém e diga um elogio sincero',
  'Mande sua foto mais feia',
  'Fale "sou otário" 5 vezes em áudio'
];

export async function executeVDD(ctx) {
  const { reply, msg, sender, pushName, q, groupMetadata } = ctx;
  const jid = msg.key.remoteJid;
  const sub = q.trim().toLowerCase();
  const partes = sub.split(/\s+/);

  if (!sub || /^\d+$/.test(partes[0])) {
    const qtd = parseInt(partes[0]);
    if (!qtd || qtd < 2 || qtd > 10) {
      return reply(`🎭 Use: ${PREFIX}vdd <2-10> para criar a sala`);
    }
    if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) {
      return reply('❌ Apenas administradores podem criar uma sala.');
    }
    if (salasVDD[jid]) return reply('⚠️ Já tem uma sala ativa!');

    salasVDD[jid] = {
      maxJogadores: qtd, jogadores: [], nomes: {},
      criadoPor: sender, status: 'espera', ultimoSorteado: null, rodada: 0, pontos: {}
    };

    return reply(`🎭 *VDD CRIADO!*\n\n👥 Vagas: *${qtd}*\n📌 ${PREFIX}vdd entrar\n💡 ${PREFIX}vdd iniciar`);
  }

  if (sub === 'entrar') {
    const sala = salasVDD[jid];
    if (!sala) return reply('❌ Nenhuma sala ativa.');
    if (sala.status !== 'espera') return reply('⚠️ O jogo já começou!');
    if (sala.jogadores.includes(sender)) return reply('⚠️ Você já está na sala!');
    if (sala.jogadores.length >= sala.maxJogadores) return reply('❌ Sala cheia!');

    sala.jogadores.push(sender);
    sala.nomes[sender] = pushName;
    sala.pontos[sender] = 0;

    const faltam = sala.maxJogadores - sala.jogadores.length;
    if (faltam <= 0) return reply(`✅ *SALA CHEIA!*\n\nUse: ${PREFIX}vdd iniciar`);
    return reply(`✅ *${pushName}* entrou!\n👥 ${sala.jogadores.length}/${sala.maxJogadores}`);
  }

  if (sub === 'iniciar') {
    const sala = salasVDD[jid];
    if (!sala) return reply('❌ Nenhuma sala ativa.');
    if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) return reply('❌ Apenas admins.');
    if (sala.status !== 'espera') return reply('⚠️ Já começou!');
    if (sala.jogadores.length < 2) return reply('❌ Precisa de 2+ jogadores!');

    sala.status = 'jogando';
    sala.rodada = 1;
    const sorteado = sala.jogadores[Math.floor(Math.random() * sala.jogadores.length)];
    sala.ultimoSorteado = sorteado;

    return reply(
      `🎭 *VDD — RODADA 1*\n\n🎯 Sorteado: @${normalizarJid(sorteado)}\n\n` +
      `💡 *${sala.nomes[sorteado]}*: ${PREFIX}vd verdade ou ${PREFIX}vd desafio`,
      { mentions: [sorteado] }
    );
  }

  if (sub === 'parar') {
    const sala = salasVDD[jid];
    if (!sala) return reply('❌ Nenhuma sala ativa.');
    if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) return reply('❌ Apenas admins.');

    let ranking = '';
    if (Object.keys(sala.pontos).length > 0) {
      const sorted = Object.entries(sala.pontos).sort((a,b) => b[1] - a[1]);
      ranking = '\n\n🏆 *RANKING:*\n';
      sorted.forEach(([j, p], i) => {
        const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`;
        ranking += `${medalha} @${normalizarJid(j)} — ${p}\n`;
      });
    }
    const mentions = sala.jogadores;
    delete salasVDD[jid];
    return reply(`🛑 *JOGO ENCERRADO*${ranking}`, { mentions });
  }

  const sala = salasVDD[jid];
  if (sala) return reply(`🎭 Sala: ${sala.jogadores.length}/${sala.maxJogadores} | ${PREFIX}vdd entrar | ${PREFIX}vdd iniciar`);
  return reply(`❌ Use: ${PREFIX}vdd <2-10>`);
}

export async function executeVDDResponder(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const sala = salasVDD[jid];

  if (!sala) return reply('❌ Nenhum jogo ativo.');
  if (sala.status !== 'jogando') return reply('⚠️ Não começou.');
  if (!sala.ultimoSorteado) return reply('❌ Ninguém sorteado.');

  const senderNorm = normalizarJid(sender);
  const sorteadoNorm = normalizarJid(sala.ultimoSorteado);

  if (senderNorm !== sorteadoNorm) {
    return reply(`❌ É a vez de @${sorteadoNorm}`, { mentions: [sala.ultimoSorteado] });
  }

  const tipo = q.trim().toLowerCase();
  if (!['verdade', 'desafio'].includes(tipo)) return reply(`❌ ${PREFIX}vd verdade ou ${PREFIX}vd desafio`);

  sala.pontos[sala.ultimoSorteado] = (sala.pontos[sala.ultimoSorteado] || 0) + 1;

  const pergunta = tipo === 'verdade'
    ? VERDADES[Math.floor(Math.random() * VERDADES.length)]
    : DESAFIOS[Math.floor(Math.random() * DESAFIOS.length)];

  const emoji = tipo === 'verdade' ? '🎯' : '🔥';
  const titulo = tipo === 'verdade' ? 'VERDADE' : 'DESAFIO';

  sala.rodada += 1;
  let proximo = null;
  if (sala.jogadores.length > 1) {
    const candidatos = sala.jogadores.filter(j => normalizarJid(j) !== sorteadoNorm);
    proximo = candidatos[Math.floor(Math.random() * candidatos.length)];
    sala.ultimoSorteado = proximo;
  } else sala.ultimoSorteado = sala.jogadores[0];

  return reply(
    `${emoji} *${titulo} para @${senderNorm}*\n\n📖 _"${pergunta}"_\n\n` +
    `✅ +1 ponto!\n\n🎯 *RODADA ${sala.rodada}*\nPróximo: @${normalizarJid(sala.ultimoSorteado)}`,
    { mentions: [sender, sala.ultimoSorteado] }
  );
}

// =========================================
// 4. EU NUNCA
// =========================================
const FRASES_EU_NUNCA = [
  'Eu nunca beijei alguém aqui do grupo',
  'Eu nunca fiquei bêbado(a)',
  'Eu nunca menti pros meus pais',
  'Eu nunca roubei nada',
  'Eu nunca fui expulso(a) de grupo',
  'Eu nunca chorei por amor',
  'Eu nunca quebrei um celular',
  'Eu nunca dormi na rua',
  'Eu nunca passei vergonha em público',
  'Eu nunca fui pego(a) em mentira',
  'Eu nunca stalkeei ex',
  'Eu nunca tive um crush por alguém aqui'
];

export async function executeEuNunca(ctx) {
  const { reply, client, msg, sender } = ctx;
  const jid = msg.key.remoteJid;
  if (euNunca[jid]) return reply('⚠️ Já tem um "Eu Nunca" rolando!');

  const cd = verificarCooldown(sender);
  if (!cd.permitido) return reply(`⏳ Aguarde *${cd.restante} min*.`);

  const frase = FRASES_EU_NUNCA[Math.floor(Math.random() * FRASES_EU_NUNCA.length)];
  euNunca[jid] = { frase, votos: { '1': [], '2': [] }, criadoEm: Date.now() };

  await reply(
    `🍻 *EU NUNCA...*\n\n_"${frase}"_\n\n📊 *VOTE:*\n1️⃣ Já fiz\n2️⃣ Nunca fiz\n\n` +
    `💡 ${PREFIX}eununca 1 ou 2\n⏰ Termina em 3 minutos!`
  );

  setTimeout(async () => {
    const jogo = euNunca[jid];
    if (!jogo) return;
    const jaFiz = jogo.votos['1'].length;
    const nuncaFiz = jogo.votos['2'].length;
    let resultado = `🍻 *RESULTADO*\n\n_"${jogo.frase}"_\n\n1️⃣ Já fiz: ${jaFiz}\n2️⃣ Nunca fiz: ${nuncaFiz}\n\n`;
    if (jaFiz > nuncaFiz) resultado += `😏 A maioria já fez!`;
    else if (nuncaFiz > jaFiz) resultado += `😇 A maioria nunca fez!`;
    else resultado += `🤝 Empate!`;
    try { await client.sendMessage(jid, { text: resultado }); } catch (e) {}
    delete euNunca[jid];
  }, 3 * 60 * 1000);
}

export async function executeVotarEuNunca(ctx) {
  const { reply, msg, sender } = ctx;
  const jid = msg.key.remoteJid;
  const voto = ctx.q.trim();
  const jogo = euNunca[jid];
  if (!jogo) return reply('❌ Nenhum "Eu Nunca" ativo.');
  if (!['1', '2'].includes(voto)) return reply('❌ Vote com 1 ou 2.');
  if (jogo.votos[voto].includes(sender)) return reply('⚠️ Você já votou!');
  jogo.votos['1'] = jogo.votos['1'].filter(v => v !== sender);
  jogo.votos['2'] = jogo.votos['2'].filter(v => v !== sender);
  jogo.votos[voto].push(sender);
  return reply(`✅ Voto registrado!`);
}

// =========================================
// 5. FORCA
// =========================================
const PALAVRAS_FORCA = [
  'ABACAXI', 'ELEFANTE', 'GIRAFA', 'BICICLETA', 'COMPUTADOR',
  'BORBOLETA', 'CHUVEIRO', 'GUITARRA', 'MONTANHA', 'JANELA',
  'ESTOMAGO', 'FOGUETE', 'LARANJA', 'PIPOCA', 'TARTARUGA',
  'CACHORRO', 'SAMBA', 'CANETA', 'RELOGIO', 'TEMPESTADE'
];

export async function executeForca(ctx) {
  const { reply, msg, sender } = ctx;
  const jid = msg.key.remoteJid;
  if (forcas[jid]) return reply('⚠️ Já tem uma forca ativa!');

  const cd = verificarCooldown(sender);
  if (!cd.permitido) return reply(`⏳ Aguarde *${cd.restante} min*.`);

  const palavra = PALAVRAS_FORCA[Math.floor(Math.random() * PALAVRAS_FORCA.length)];
  forcas[jid] = { palavra, acertos: [], erros: [], tentativas: 6, jogoIndividual: false, jogador: null, iniciador: sender };

  return reply(
    `🔤 *FORCA*\n\n💀 Tentativas: 6\n📝 Palavra: *${palavra.split('').map(() => ' _ ').join('')}*\n\n` +
    `💡 ${PREFIX}letra <A-Z>\n🏆 Prêmio: 1500 coins\n⏳ Cooldown: 30 min`
  );
}

export async function executeForcaIndividual(ctx) {
  const { reply, msg, sender, pushName } = ctx;
  const jid = msg.key.remoteJid;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (forcas[jid]) return reply('⚠️ Já tem uma forca ativa!');
  if (mentions.length === 0) return reply(`❌ Use: ${PREFIX}forcaunica @pessoa`);

  const cd = verificarCooldown(sender);
  if (!cd.permitido) return reply(`⏳ Aguarde *${cd.restante} min*.`);

  const palavra = PALAVRAS_FORCA[Math.floor(Math.random() * PALAVRAS_FORCA.length)];
  forcas[jid] = { palavra, acertos: [], erros: [], tentativas: 6, jogoIndividual: true, jogador: mentions[0], nomeJogador: pushName, iniciador: sender };

  return reply(
    `🔤 *FORCA INDIVIDUAL*\n\n👤 Desafiado: @${normalizarJid(mentions[0])}\n\n` +
    `💀 Tentativas: 6\n📝 Palavra: *${palavra.split('').map(() => ' _ ').join('')}*\n\n` +
    `💡 ${PREFIX}letra <A-Z>\n🏆 Prêmio: 1500 coins`,
    { mentions: [mentions[0]] }
  );
}

export async function executeLetra(ctx) {
  const { reply, msg, sender, q, pushName } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = forcas[jid];
  if (!jogo) return reply('❌ Nenhuma forca ativa.');
  if (jogo.jogoIndividual && normalizarJid(jogo.jogador) !== normalizarJid(sender)) {
    return reply('❌ Só o desafiado pode jogar.');
  }

  const letra = q.trim().toUpperCase();
  if (!letra || letra.length !== 1 || !/[A-Z]/.test(letra)) return reply(`❌ ${PREFIX}letra <A-Z>`);
  if (jogo.acertos.includes(letra) || jogo.erros.includes(letra)) return reply('❌ Já tentou!');

  const acertou = jogo.palavra.includes(letra);
  if (acertou) jogo.acertos.push(letra);
  else { jogo.erros.push(letra); jogo.tentativas -= 1; }

  const exibicao = jogo.palavra.split('').map(l => jogo.acertos.includes(l) ? ` ${l} ` : ' _ ').join('');
  const ganhou = jogo.palavra.split('').every(l => jogo.acertos.includes(l));

  if (ganhou) {
    const jidPremio = jogo.jogoIndividual ? jogo.jogador : sender;
    const cd = verificarCooldown(jidPremio);
    if (!cd.permitido) { delete forcas[jid]; return reply(`⏳ Cooldown! (${cd.restante} min)`); }

    const user = getUsuario(jidPremio);
    user.coins += 1500;
    salvarUsuario(jidPremio, user);
    registrarCooldown(jidPremio);
    delete forcas[jid];

    return reply(`🎉 *VITÓRIA!*\n\n✅ Palavra: *${jogo.palavra}*\n💰 1500 coins\n👤 ${pushName}`);
  }

  if (jogo.tentativas <= 0) {
    delete forcas[jid];
    return reply(`💀 *PERDEU!*\n\nA palavra era: *${jogo.palavra}*`);
  }

  const boneco = ['😀','😃','😅','😨','😰','😱','💀'][6 - jogo.tentativas];
  return reply(`🔤 *FORCA*\n\n${boneco} Tentativas: ${jogo.tentativas}\n\n📝 *${exibicao}*\n\n✅ ${jogo.acertos.join(' ') || 'nenhum'}\n❌ ${jogo.erros.join(' ') || 'nenhum'}`);
}

export async function executePararForca(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;
  if (!forcas[jid]) return reply('❌ Nenhuma forca ativa.');
  const palavra = forcas[jid].palavra;
  delete forcas[jid];
  return reply(`🛑 Encerrado! Era: *${palavra}*`);
}

// =========================================
// 6. QUIZ ANIMAL
// =========================================
const ANIMAIS_QUIZ = [
  { emoji: '🦁', nome: 'leão', dicas: ['rei da selva', 'vive na savana'] },
  { emoji: '🐘', nome: 'elefante', dicas: ['maior mamífero terrestre', 'tem tromba'] },
  { emoji: '🦒', nome: 'girafa', dicas: ['pescoço longo', 'manchas'] },
  { emoji: '🐧', nome: 'pinguim', dicas: ['ave que não voa', 'vive no gelo'] },
  { emoji: '🦈', nome: 'tubarão', dicas: ['peixe predador', 'dentes afiados'] },
  { emoji: '🐙', nome: 'polvo', dicas: ['8 braços', 'vive no mar'] },
  { emoji: '🦅', nome: 'águia', dicas: ['ave de rapina', 'visão aguçada'] },
  { emoji: '🐢', nome: 'tartaruga', dicas: ['carrega casa', 'lenta'] },
  { emoji: '🦓', nome: 'zebra', dicas: ['listras', 'parecida com cavalo'] },
  { emoji: '🐆', nome: 'leopardo', dicas: ['felino veloz', 'manchas'] }
];

export async function executeQuizAnimal(ctx) {
  const { reply, msg, sender } = ctx;
  const jid = msg.key.remoteJid;
  if (quizAnimais[jid]) return reply('⚠️ Já tem um quiz rolando!');

  const cd = verificarCooldown(sender);
  if (!cd.permitido) return reply(`⏳ Aguarde *${cd.restante} min*.`);

  const animal = ANIMAIS_QUIZ[Math.floor(Math.random() * ANIMAIS_QUIZ.length)];
  quizAnimais[jid] = { resposta: animal.nome, emoji: animal.emoji, criadoEm: Date.now() };

  return reply(
    `🦁 *QUIZ ANIMAL*\n\nQual é o animal?\n\n   ${animal.emoji}\n\n` +
    `💡 Dicas:\n• ${animal.dicas[0]}\n• ${animal.dicas[1]}\n\n` +
    `Use: ${PREFIX}responderquiz <nome>\n🏆 800 coins`
  );
}

export async function executeResponderQuiz(ctx) {
  const { reply, msg, sender, q, pushName } = ctx;
  const jid = msg.key.remoteJid;
  const quiz = quizAnimais[jid];
  if (!quiz) return reply('❌ Nenhum quiz ativo.');
  if (!q.trim()) return reply(`❌ ${PREFIX}responderquiz <animal>`);

  if (q.trim().toLowerCase() === quiz.resposta) {
    const cd = verificarCooldown(sender);
    if (!cd.permitido) return reply(`⏳ Você está em cooldown (${cd.restante} min).`);

    const user = getUsuario(sender);
    user.coins += 800;
    salvarUsuario(sender, user);
    registrarCooldown(sender);
    delete quizAnimais[jid];

    return reply(`🎉 *ACERTOU, ${pushName}!*\n\n✅ ${quiz.emoji} *${quiz.resposta}*\n💰 800 coins`);
  }
  return reply(`❌ Errou! Tente novamente.`);
}

export async function executePararQuiz(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;
  if (!quizAnimais[jid]) return reply('❌ Nenhum quiz ativo.');
  const resp = quizAnimais[jid].resposta;
  delete quizAnimais[jid];
  return reply(`🛑 Encerrado! Era: *${resp}*`);
}

// =========================================
// 💕 INTERAÇÕES
// =========================================

// =========================================
// 7. ABRAÇAR
// =========================================
export async function executeAbracar(ctx) {
  const { reply, msg, pushName, client } = ctx;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentions.length === 0) return reply(`🤗 Use: ${PREFIX}abracar @pessoa`);

  const alvo = mentions[0];
  const nomeAlvo = `@${alvo.split('@')[0]}`;

  const frases = [
    'deu um abraço apertado em',
    'abraçou com muito carinho',
    'deu um super abraço em',
    'abraçou bem forte',
    'deu um abraço de urso em',
    'correu e abraçou',
    'abraçou com todo amor'
  ];
  const frase = frases[Math.floor(Math.random() * frases.length)];

  const legenda = `╭━━━〔 🤗 𝗔𝗕𝗥𝗔𝗖̧𝗢 〕━━━╮\n` +
    `┃\n` +
    `┃ 💞 ${pushName} ${frase}\n` +
    `┃    ${nomeAlvo}!\n` +
    `┃\n` +
    `┃ 💖 Que fofura!\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`;

  await enviarMidia(client, msg.key.remoteJid, 'abracar', legenda, [alvo], msg);
}

// =========================================
// 8. BEIJAR
// =========================================
export async function executeBeijar(ctx) {
  const { reply, msg, pushName, client } = ctx;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentions.length === 0) return reply(`😘 Use: ${PREFIX}beijar @pessoa`);

  const alvo = mentions[0];
  const nomeAlvo = `@${alvo.split('@')[0]}`;

  const frases = [
    'deu um beijo apaixonado em',
    'roubou um beijo de',
    'beijou com muito carinho',
    'deu um selinho em',
    'beijou de língua em',
    'deu um beijão em'
  ];
  const frase = frases[Math.floor(Math.random() * frases.length)];

  const legenda = `╭━━━〔 😘 𝗕𝗘𝗜𝗝𝗢 〕━━━╮\n` +
    `┃\n` +
    `┃ 💋 ${pushName} ${frase}\n` +
    `┃    ${nomeAlvo}!\n` +
    `┃\n` +
    `┃ 💕 Que romântico!\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`;

  await enviarMidia(client, msg.key.remoteJid, 'beijar', legenda, [alvo], msg);
}

// =========================================
// 9. ELOGIAR
// =========================================
const ELOGIOS = [
  'é uma pessoa incrível 🌟',
  'tem um sorriso contagiante 😊',
  'é muito inteligente 🧠',
  'tem um coração enorme 💖',
  'é super engraçado(a) 😂',
  'é uma pessoa muito especial ✨',
  'tem um jeito único de ser 🦋',
  'é muito talentoso(a) 🎨',
  'é uma ótima companhia 🤝',
  'é simplesmente perfeito(a) 💯',
  'é uma lenda do grupo 👑',
  'tem uma energia maravilhosa ⚡'
];

export async function executeElogiar(ctx) {
  const { reply, msg, pushName, client } = ctx;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentions.length === 0) return reply(`💐 Use: ${PREFIX}elogiar @pessoa`);

  const alvo = mentions[0];
  const nomeAlvo = `@${alvo.split('@')[0]}`;
  const elogio = ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)];

  const legenda = `╭━━━〔 💐 𝗘𝗟𝗢𝗚𝗜𝗢 〕━━━╮\n` +
    `┃\n` +
    `┃ ✨ Alguém especial recebeu\n` +
    `┃    um elogio!\n` +
    `┃\n` +
    `┃ 👤 ${nomeAlvo} ${elogio}\n` +
    `┃\n` +
    `┃ 💝 Enviado por: ${pushName}\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`;

  await enviarMidia(client, msg.key.remoteJid, 'elogiar', legenda, [alvo], msg);
}

// =========================================
// 10. SHIP — PORCENTAGEM ALEATÓRIA 1-100
// =========================================
export async function executeShip(ctx) {
  const { reply, msg, sender, pushName, client } = ctx;
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  let p1, p2, nome1, nome2;

  if (mentions.length >= 2) {
    p1 = mentions[0];
    p2 = mentions[1];
    nome1 = `@${p1.split('@')[0]}`;
    nome2 = `@${p2.split('@')[0]}`;
  } else if (mentions.length === 1) {
    p1 = sender;
    p2 = mentions[0];
    nome1 = pushName;
    nome2 = `@${p2.split('@')[0]}`;
  } else {
    return reply(`💘 Use: ${PREFIX}ship @p1 @p2\n💡 Ou: ${PREFIX}ship @pessoa`);
  }

  // 🎯 Porcentagem aleatória de 1 a 100
  const porcentagem = Math.floor(Math.random() * 100) + 1;

  // 📝 Texto do resultado por faixa
  let mensagem, emoji;
  if (porcentagem >= 95) { mensagem = 'ALMAS GÊMEAS! Casem AGORA!'; emoji = '💍'; }
  else if (porcentagem >= 85) { mensagem = 'Paixão à primeira vista!'; emoji = '❤️‍🔥'; }
  else if (porcentagem >= 75) { mensagem = 'Muito compatíveis! Adorei o casal!'; emoji = '💕'; }
  else if (porcentagem >= 60) { mensagem = 'Casalzão da porra!'; emoji = '💚'; }
  else if (porcentagem >= 50) { mensagem = 'Têm potencial! Invistam nisso!'; emoji = '💛'; }
  else if (porcentagem >= 40) { mensagem = 'Até que combina... 👀'; emoji = '🧡'; }
  else if (porcentagem >= 30) { mensagem = 'Hmm... vai ser complicado!'; emoji = '💔'; }
  else if (porcentagem >= 20) { mensagem = 'Melhor nem tentar...'; emoji = '🖤'; }
  else if (porcentagem >= 10) { mensagem = 'Isso é uma má ideia!'; emoji = '💀'; }
  else { mensagem = 'FUJAM! Vocês se odeiam!'; emoji = '☠️'; }

  // 📊 Barra visual
  const barraCheia = Math.floor(porcentagem / 10);
  const barraVazia = 10 - barraCheia;
  const barra = '🟩'.repeat(barraCheia) + '⬛'.repeat(barraVazia);

  const legenda =
    `╔═══════════════════╗\n` +
    `   💘 *S H I P* 💘\n` +
    `╚═══════════════════╝\n` +
    `\n` +
    `╭─────────────────────╮\n` +
    `│ 👤 ${nome1}\n` +
    `│ 💞 *AMA* 💞\n` +
    `│ 👤 ${nome2}\n` +
    `╰─────────────────────╯\n` +
    `\n` +
    `╭─「 💯 *COMPATIBILIDADE* 」\n` +
    `│\n` +
    `│ ${barra}\n` +
    `│ 🎯 *${porcentagem}%*\n` +
    `│\n` +
    `╰─────────────────────╯\n` +
    `\n` +
    `   ${emoji} *${mensagem}* ${emoji}\n` +
    `\n` +
    `╔═══════════════════╗\n` +
    `  💌 *Feito por ${BOT_NAME}* 💌\n` +
    `╚═══════════════════╝`;

  await enviarMidia(client, msg.key.remoteJid, 'ship', legenda, [p1, p2], msg);
}
