import { PREFIX } from '../config.js';
import { getUsuario, salvarUsuario } from '../functions/rpg.js';

// =========================================
// ESTADO DOS JOGOS
// =========================================
const jogos = {};

// =========================================
// UTILITÁRIO
// =========================================
function normalizarJid(jid) {
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0];
}

// =========================================
// 1. PEDRA PAPEL TESOURA
// =========================================
export async function executePPT(ctx) {
  const { reply, msg, sender, pushName, q, client } = ctx;
  const user = getUsuario(sender);

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) {
    return reply(
      `✊✋✌️ *PEDRA PAPEL TESOURA*\n\n` +
      `Use: ${PREFIX}ppt @user <valor>\n` +
      `💡 Exemplo: ${PREFIX}ppt @joao 200`
    );
  }

  const oponente = mentions[0];
  if (oponente === sender) return reply('❌ Não pode jogar consigo mesmo!');

  const partes = q.trim().split(/\s+/);
  const valor = parseInt(partes[1]) || 100;

  if (valor < 50) return reply('💰 Aposta mínima: 50 coins');
  if (user.coins < valor) return reply(`❌ Você tem só ${user.coins} coins!`);

  const userO = getUsuario(oponente);
  if (userO.coins < valor) return reply('❌ O oponente não tem coins suficientes!');

  const opcoes = ['pedra ✊', 'papel ✋', 'tesoura ✌️'];
  const escolha1 = opcoes[Math.floor(Math.random() * 3)];
  const escolha2 = opcoes[Math.floor(Math.random() * 3)];

  let resultado = '';
  let vencedor = 'empate';

  if (escolha1 === escolha2) vencedor = 'empate';
  else if (
    (escolha1.includes('pedra') && escolha2.includes('tesoura')) ||
    (escolha1.includes('papel') && escolha2.includes('pedra')) ||
    (escolha1.includes('tesoura') && escolha2.includes('papel'))
  ) vencedor = 'p1';
  else vencedor = 'p2';

  if (vencedor === 'p1') {
    user.coins += valor;
    userO.coins -= valor;
    salvarUsuario(sender, user);
    salvarUsuario(oponente, userO);
    resultado = `🏆 *${pushName} VENCEU!*`;
  } else if (vencedor === 'p2') {
    user.coins -= valor;
    userO.coins += valor;
    salvarUsuario(sender, user);
    salvarUsuario(oponente, userO);
    resultado = `🏆 *Oponente VENCEU!*`;
  } else {
    resultado = '🤝 *EMPATE!*';
  }

  return reply(
    `✊✋✌️ *PEDRA PAPEL TESOURA*\n\n` +
    `👤 ${pushName}: ${escolha1}\n` +
    `🎯 Oponente: ${escolha2}\n\n` +
    `${resultado}\n` +
    `💰 Valor: ${valor.toLocaleString('pt-BR')}\n\n` +
    `💼 Seu saldo: ${user.coins.toLocaleString('pt-BR')}`,
    { mentions: [oponente] }
  );
}

// =========================================
// 2. ADIVINHA O NÚMERO
// =========================================
export async function executeAdivinha(ctx) {
  const { reply, msg, sender } = ctx;
  const jid = msg.key.remoteJid;

  if (jogos[`adivinha_${jid}`]) {
    return reply(`⚠️ Já tem um jogo em andamento! Responda com: ${PREFIX}chutar <número>`);
  }

  const numero = Math.floor(Math.random() * 100) + 1;
  jogos[`adivinha_${jid}`] = { numero, tentativas: 0 };

  return reply(
    `🎯 *ADIVINHE O NÚMERO*\n\n` +
    `Pensei em um número de *1 a 100*!\n\n` +
    `💡 Use: ${PREFIX}chutar <número>\n` +
    `🏆 Prêmio: 500 coins`
  );
}

export async function executeChutar(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogos[`adivinha_${jid}`];

  if (!jogo) return reply('❌ Nenhum jogo ativo.');

  const chute = parseInt(q.trim());
  if (!chute || chute < 1 || chute > 100) {
    return reply('❌ Digite um número entre 1 e 100!');
  }

  jogo.tentativas++;

  if (chute === jogo.numero) {
    delete jogos[`adivinha_${jid}`];
    const user = getUsuario(sender);
    user.coins += 500;
    salvarUsuario(sender, user);

    return reply(
      `🎉 *ACERTOU!*\n\n` +
      `🎯 O número era: *${jogo.numero}*\n` +
      `📊 Tentativas: ${jogo.tentativas}\n` +
      `💰 Prêmio: 500 coins`
    );
  }

  const dica = chute < jogo.numero ? '📈 MAIOR!' : '📉 MENOR!';

  if (jogo.tentativas >= 10) {
    delete jogos[`adivinha_${jid}`];
    return reply(
      `😢 *PERDEU!*\n\n` +
      `🎯 O número era: *${jogo.numero}*\n` +
      `📊 Tentativas: 10`
    );
  }

  return reply(
    `🎯 *TENTATIVA ${jogo.tentativas}/10*\n\n` +
    `${dica}\n` +
    `💡 Continue tentando!`
  );
}

// =========================================
// 3. ROLETA RUSSA
// =========================================
export async function executeRoletaRussa(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);

  const valor = parseInt(q.trim()) || 100;
  if (valor < 50) return reply('🔫 Aposta mínima: 50 coins');
  if (valor > user.coins) return reply(`❌ Você tem só ${user.coins} coins!`);

  user.coins -= valor;

  const perdeu = Math.random() < 0.1667;

  if (perdeu) {
    salvarUsuario(sender, user);
    return reply(
      `🔫 *ROLETA RUSSA*\n\n` +
      `💥 *BANG!* Você perdeu!\n\n` +
      `💸 Perdeu: ${valor.toLocaleString('pt-BR')} coins\n` +
      `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
    );
  }

  const premio = valor * 2;
  user.coins += premio;
  salvarUsuario(sender, user);

  return reply(
    `🔫 *ROLETA RUSSA*\n\n` +
    `✨ *CLICK!* Você sobreviveu!\n\n` +
    `💰 Ganhou: ${premio.toLocaleString('pt-BR')} coins\n` +
    `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// 4. BLACKJACK (21)
// =========================================
export async function executeBlackjack(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);

  const valor = parseInt(q.trim()) || 100;
  if (valor < 50) return reply('🃏 Aposta mínima: 50 coins');
  if (valor > user.coins) return reply(`❌ Você tem só ${user.coins} coins!`);

  user.coins -= valor;

  const carta = () => Math.floor(Math.random() * 10) + 1;
  const jogador = carta() + carta();
  const banca = carta() + carta();

  let resultado = '';
  let premio = 0;

  if (jogador > 21) {
    resultado = '💥 Você estourou! (acima de 21)';
  } else if (banca > 21) {
    resultado = '🎉 A banca estourou!';
    premio = valor * 2;
  } else if (jogador > banca) {
    resultado = '🏆 Você venceu!';
    premio = valor * 2;
  } else if (jogador === banca) {
    resultado = '🤝 Empate!';
    premio = valor;
  } else {
    resultado = '❌ A banca venceu!';
  }

  user.coins += premio;
  salvarUsuario(sender, user);

  return reply(
    `🃏 *BLACKJACK*\n\n` +
    `👤 Você: *${jogador}*\n` +
    `🏦 Banca: *${banca}*\n\n` +
    `${resultado}\n` +
    (premio > 0 ? `💰 Retorno: ${premio.toLocaleString('pt-BR')} coins\n` : `💸 Perdeu: ${valor.toLocaleString('pt-BR')} coins\n`) +
    `\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
  );
}

// =========================================
// 5. PALAVRA EMBARALHADA
// =========================================
const PALAVRAS = [
  'BANANA', 'ELEFANTE', 'GIRAFA', 'BICICLETA', 'COMPUTADOR',
  'BORBOLETA', 'GELADEIRA', 'GUITARRA', 'MONTANHA', 'JANELA',
  'ESTOMAGO', 'FOGUETE', 'LARANJA', 'PIPOCA', 'TARTARUGA',
  'CACHORRO', 'SAPATO', 'CANETA', 'RELOGIO', 'CHUVEIRO',
  'PAREDE', 'TRAVESSEIRO', 'ASTRONAUTA', 'CHOCOLATE', 'BICICLETA'
];

export async function executePalavra(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jogos[`palavra_${jid}`]) {
    return reply(`⚠️ Já tem um jogo ativo! Use: ${PREFIX}desembaralhar <palavra>`);
  }

  const original = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
  const embaralhada = original.split('').sort(() => Math.random() - 0.5).join('');

  jogos[`palavra_${jid}`] = { original, criadoEm: Date.now() };

  return reply(
    `🔀 *PALAVRA EMBARALHADA*\n\n` +
    `Adivinhe a palavra:\n\n` +
    `✨ *${embaralhada}*\n\n` +
    `💡 Use: ${PREFIX}desembaralhar <palavra>\n` +
    `🏆 Prêmio: 400 coins`
  );
}

export async function executeDesembaralhar(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogos[`palavra_${jid}`];

  if (!jogo) return reply('❌ Nenhum jogo ativo.');

  if (q.trim().toUpperCase() === jogo.original) {
    delete jogos[`palavra_${jid}`];
    const user = getUsuario(sender);
    user.coins += 400;
    salvarUsuario(sender, user);

    return reply(
      `🎉 *ACERTOU!*\n\n` +
      `✅ Palavra: *${jogo.original}*\n` +
      `💰 Prêmio: 400 coins\n` +
      `💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`
    );
  }

  return reply('❌ Errou! Tente novamente.');
}

// =========================================
// 6. ANAGRAMA
// =========================================
const ANAGRAMAS = [
  { original: 'AMOR', embaralhado: 'ROMA' },
  { original: 'ROMA', embaralhado: 'AMOR' },
  { original: 'PERTO', embaralhado: 'PORET' },
  { original: 'PODER', embaralhado: 'DEPOR' },
  { original: 'PORTA', embaralhado: 'PATRO' },
  { original: 'VIVA', embaralhado: 'AVIV' },
  { original: 'MOCA', embaralhado: 'COMA' },
  { original: 'COMA', embaralhado: 'MOCA' },
  { original: 'CAMA', embaralhado: 'AMAC' },
  { original: 'SAPO', embaralhado: 'PASO' },
  { original: 'LAGO', embaralhado: 'GALO' },
  { original: 'GALO', embaralhado: 'LAGO' }
];

export async function executeAnagrama(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jogos[`anagrama_${jid}`]) {
    return reply(`⚠️ Já tem um jogo ativo! Use: ${PREFIX}resp-anagrama <palavra>`);
  }

  const item = ANAGRAMAS[Math.floor(Math.random() * ANAGRAMAS.length)];
  jogos[`anagrama_${jid}`] = { original: item.original };

  return reply(
    `🔤 *ANAGRAMA*\n\n` +
    `Qual palavra se forma com essas letras?\n\n` +
    `✨ *${item.embaralhado}*\n\n` +
    `💡 Use: ${PREFIX}resp-anagrama <palavra>\n` +
    `🏆 Prêmio: 300 coins`
  );
}

export async function executeRespAnagrama(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogos[`anagrama_${jid}`];

  if (!jogo) return reply('❌ Nenhum jogo ativo.');

  if (q.trim().toUpperCase() === jogo.original) {
    delete jogos[`anagrama_${jid}`];
    const user = getUsuario(sender);
    user.coins += 300;
    salvarUsuario(sender, user);

    return reply(
      `🎉 *ACERTOU!*\n\n` +
      `✅ Palavra: *${jogo.original}*\n` +
      `💰 Prêmio: 300 coins`
    );
  }

  return reply('❌ Errou! Tente novamente.');
}

// =========================================
// 7. MATEMÁTICA RÁPIDA
// =========================================
export async function executeMatematica(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jogos[`mat_${jid}`]) {
    return reply(`⚠️ Já tem um desafio ativo! Responda com: ${PREFIX}resp-matematica <número>`);
  }

  const a = Math.floor(Math.random() * 50) + 1;
  const b = Math.floor(Math.random() * 50) + 1;
  const operacoes = [
    { sinal: '+', resultado: a + b },
    { sinal: '-', resultado: a - b },
    { sinal: '×', resultado: a * b }
  ];
  const op = operacoes[Math.floor(Math.random() * operacoes.length)];

  jogos[`mat_${jid}`] = { resultado: op.resultado, criadoEm: Date.now() };

  return reply(
    `🧮 *MATEMÁTICA RÁPIDA*\n\n` +
    `Qual o resultado?\n\n` +
    `✨ *${a} ${op.sinal} ${b}*\n\n` +
    `💡 Use: ${PREFIX}resp-matematica <número>\n` +
    `🏆 Prêmio: 200 coins`
  );
}

export async function executeRespMatematica(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogos[`mat_${jid}`];

  if (!jogo) return reply('❌ Nenhum desafio ativo.');

  const resp = parseInt(q.trim());
  if (resp === jogo.resultado) {
    delete jogos[`mat_${jid}`];
    const user = getUsuario(sender);
    user.coins += 200;
    salvarUsuario(sender, user);

    return reply(
      `🎉 *ACERTOU!*\n\n` +
      `✅ Resultado: *${jogo.resultado}*\n` +
      `💰 Prêmio: 200 coins`
    );
  }

  return reply('❌ Errou! Tente novamente.');
}

// =========================================
// 8. BANDEIRA
// =========================================
const BANDEIRAS = [
  { emoji: '🇧🇷', pais: 'brasil' },
  { emoji: '🇦🇷', pais: 'argentina' },
  { emoji: '🇺🇸', pais: 'estados unidos' },
  { emoji: '🇯🇵', pais: 'japão' },
  { emoji: '🇩🇪', pais: 'alemanha' },
  { emoji: '🇫🇷', pais: 'frança' },
  { emoji: '🇮🇹', pais: 'itália' },
  { emoji: '🇬🇧', pais: 'inglaterra' },
  { emoji: '🇲🇽', pais: 'méxico' },
  { emoji: '🇨🇦', pais: 'canadá' },
  { emoji: '🇵🇹', pais: 'portugal' },
  { emoji: '🇪🇸', pais: 'espanha' },
  { emoji: '🇨🇳', pais: 'china' },
  { emoji: '🇰🇷', pais: 'coreia do sul' },
  { emoji: '🇷🇺', pais: 'rússia' }
];

export async function executeBandeira(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jogos[`bandeira_${jid}`]) {
    return reply(`⚠️ Já tem um jogo ativo! Use: ${PREFIX}resp-bandeira <país>`);
  }

  const item = BANDEIRAS[Math.floor(Math.random() * BANDEIRAS.length)];
  jogos[`bandeira_${jid}`] = { pais: item.pais };

  return reply(
    `🌍 *ADIVINHE A BANDEIRA*\n\n` +
    `Qual é o país?\n\n` +
    `✨ ${item.emoji}\n\n` +
    `💡 Use: ${PREFIX}resp-bandeira <país>\n` +
    `🏆 Prêmio: 300 coins`
  );
}

export async function executeRespBandeira(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogos[`bandeira_${jid}`];

  if (!jogo) return reply('❌ Nenhum jogo ativo.');

  if (q.trim().toLowerCase() === jogo.pais) {
    delete jogos[`bandeira_${jid}`];
    const user = getUsuario(sender);
    user.coins += 300;
    salvarUsuario(sender, user);

    return reply(
      `🎉 *ACERTOU!*\n\n` +
      `✅ País: *${jogo.pais.toUpperCase()}*\n` +
      `💰 Prêmio: 300 coins`
    );
  }

  return reply('❌ Errou! Tente novamente.');
}

// =========================================
// 9. MEMÓRIA — com edição da mensagem
// =========================================
const EMOJIS_MEMORIA = ['🍎', '🍌', '🍇', '🍓', '🍊', '🥝', '🍒', '🍑', '🍍', '🥭'];

export async function executeMemoria(ctx) {
  const { reply, msg, client } = ctx;
  const jid = msg.key.remoteJid;

  if (jogos[`memoria_${jid}`]) {
    return reply(`⚠️ Já tem um jogo ativo! Responda com: ${PREFIX}resp-memoria <emoji1> <emoji2> <emoji3> <emoji4>`);
  }

  // Escolhe 4 emojis aleatórios (sem repetir)
  const embaralhados = [...EMOJIS_MEMORIA].sort(() => Math.random() - 0.5).slice(0, 4);

  // Salva o estado do jogo
  jogos[`memoria_${jid}`] = {
    memoria: embaralhados,
    ativo: true,
    podeResponder: false,
    criadoEm: Date.now()
  };

  // Mensagem inicial com os emojis
  const textoInicial =
    `╭━━━〔 🧠 𝗝𝗢𝗚𝗢 𝗗𝗔 𝗠𝗘𝗠𝗢́𝗥𝗜𝗔 〕━━━╮\n` +
    `┃\n` +
    `┃ 📝 *DECORE A SEQUÊNCIA:*\n` +
    `┃\n` +
    `┃      ${embaralhados.join('  ')}\n` +
    `┃\n` +
    `┃ ⏰ Você tem *10 segundos*!\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`;

  // Envia a mensagem inicial e guarda a referência
  const mensagemEnviada = await client.sendMessage(jid, { text: textoInicial }, { quoted: msg });

  // 🔥 Depois de 10 segundos, EDITA a mensagem
  setTimeout(async () => {
    try {
      const textoEditado =
        `╭━━━〔 🧠 𝗝𝗢𝗚𝗢 𝗗𝗔 𝗠𝗘𝗠𝗢́𝗥𝗜𝗔 〕━━━╮\n` +
        `┃\n` +
        `┃ ❓ *QUAL ERA A SEQUÊNCIA?*\n` +
        `┃\n` +
        `┃      ❓ ❓ ❓ ❓\n` +
        `┃\n` +
        `┃ 💡 Responda com:\n` +
        `┃ ${PREFIX}resp-memoria 🍎 🍌 🍇 🍓\n` +
        `┃\n` +
        `┃ 🏆 Prêmio: *600 coins*\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━╯`;

      await client.sendMessage(jid, {
        text: textoEditado,
        edit: mensagemEnviada.key
      });

      // Libera a resposta
      const jogo = jogos[`memoria_${jid}`];
      if (jogo) jogo.podeResponder = true;

    } catch (e) {
      console.error('[MEMORIA] Erro ao editar:', e.message);
    }
  }, 10000); // 10 segundos
}

export async function executeRespMemoria(ctx) {
  const { reply, msg, sender, q, pushName, client } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogos[`memoria_${jid}`];

  if (!jogo) return reply('❌ Nenhum jogo ativo.');
  if (!jogo.podeResponder) return reply('⏰ Aguarde os 10 segundos terminarem!');

  const respostas = q.trim().split(/\s+/);
  const corretos = jogo.memoria.filter(e => respostas.includes(e));

  if (corretos.length === 4 && respostas.length === 4) {
    delete jogos[`memoria_${jid}`];
    const user = getUsuario(sender);
    user.coins += 600;
    salvarUsuario(sender, user);

    return reply(
      `╭━━━〔 🎉 𝗔𝗖𝗘𝗥𝗧𝗢𝗨! 〕━━━╮\n` +
      `┃\n` +
      `┃ ✅ Sequência correta:\n` +
      `┃    ${jogo.memoria.join('  ')}\n` +
      `┃\n` +
      `┃ 👤 Vencedor: ${pushName}\n` +
      `┃ 💰 Prêmio: *600 coins*\n` +
      `┃\n` +
      `╰━━━━━━━━━━━━━━━━━━━╯`
    );
  }

  delete jogos[`memoria_${jid}`];
  return reply(
    `╭━━━〔 😢 𝗘𝗥𝗥𝗢𝗨! 〕━━━╮\n` +
    `┃\n` +
    `┃ ❌ A sequência era:\n` +
    `┃    ${jogo.memoria.join('  ')}\n` +
    `┃\n` +
    `┃ 📊 Você acertou: *${corretos.length}/4*\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━╯`
  );
}

// =========================================
// 10. STOP
// =========================================
const CATEGORIAS_STOP = ['Nome', 'Animal', 'Fruta', 'Cidade', 'Cor'];
const LETRAS_STOP = ['A', 'B', 'C', 'D', 'F', 'G', 'M', 'P', 'R', 'S', 'T'];

export async function executeStop(ctx) {
  const { reply, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jogos[`stop_${jid}`]) {
    return reply(`⚠️ Já tem um Stop ativo! Use: ${PREFIX}resp-stop <nome> <animal> <fruta> <cidade> <cor>`);
  }

  const letra = LETRAS_STOP[Math.floor(Math.random() * LETRAS_STOP.length)];
  jogos[`stop_${jid}`] = { letra, criadoEm: Date.now() };

  return reply(
    `🛑 *STOP*\n\n` +
    `📝 Letra sorteada: *${letra}*\n\n` +
    `Responda 1 palavra de cada categoria:\n` +
    `• 👤 Nome\n` +
    `• 🐾 Animal\n` +
    `• 🍎 Fruta\n` +
    `• 🏙️ Cidade\n` +
    `• 🎨 Cor\n\n` +
    `💡 Use: ${PREFIX}resp-stop <nome> <animal> <fruta> <cidade> <cor>\n` +
    `🏆 Prêmio: 700 coins`
  );

  setTimeout(() => {
    if (jogos[`stop_${jid}`]) {
      delete jogos[`stop_${jid}`];
    }
  }, 2 * 60 * 1000);
}

export async function executeRespStop(ctx) {
  const { reply, msg, sender, q } = ctx;
  const jid = msg.key.remoteJid;
  const jogo = jogos[`stop_${jid}`];

  if (!jogo) return reply('❌ Nenhum Stop ativo.');

  const respostas = q.trim().split(/\s+/);
  if (respostas.length < 5) {
    return reply('❌ Você precisa dar 5 respostas!');
  }

  const letra = jogo.letra.toLowerCase();
  const validas = respostas.filter(r => r.toLowerCase().startsWith(letra));

  if (validas.length === 5) {
    delete jogos[`stop_${jid}`];
    const user = getUsuario(sender);
    user.coins += 700;
    salvarUsuario(sender, user);

    return reply(
      `🎉 *STOP COMPLETO!*\n\n` +
      `✅ Você acertou todas as 5 com a letra *${jogo.letra}*!\n` +
      `💰 Prêmio: 700 coins`
    );
  }

  return reply(
    `😢 *INCOMPLETO!*\n\n` +
    `📊 Você acertou ${validas.length}/5\n` +
    `💡 Todas devem começar com *${jogo.letra}*!`
  );
}
