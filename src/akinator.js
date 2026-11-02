import fs from 'node:fs';
import { PREFIX } from '../config.js';
import { registrarVitoriaBot, registrarVitoriaJogador, getRankingAkinator } from '../functions/akinatorDB.js';

const caminhoPersonagens = './src/database/personagens.json';
let PERSONAGENS = [];
try {
  PERSONAGENS = JSON.parse(fs.readFileSync(caminhoPersonagens, 'utf-8'));
} catch (e) {
  console.error('[AKINATOR] Erro ao ler personagens.json:', e.message);
}

// 18 Perguntas principais
const PERGUNTAS = {
  fict: "O seu personagem é fictício?",
  anime: "O seu personagem é de um anime?",
  vj: "O seu personagem é de um videogame?",
  desenho: "O seu personagem é de um desenho animado?",
  filme: "O seu personagem é de um filme?",
  serieTv: "O seu personagem é de uma série de TV?",
  religioso: "O seu personagem é uma figura religiosa?",
  membroFamilia: "O seu personagem é um membro da família (Pai, Mãe, Irmão)?",
  mais40: "O seu personagem tem mais de 40 anos?",
  bras: "O seu personagem é brasileiro?",
  japon: "O seu personagem é japonês?",
  amer: "O seu personagem é americano?",
  hum: "O seu personagem é um ser humano?",
  fem: "O seu personagem é do sexo feminino?",
  heroi: "O seu personagem é considerado um herói?",
  vilao: "O seu personagem é considerado um vilão?",
  mag: "O seu personagem tem poderes mágicos/sobrenaturais?",
  morto: "O seu personagem já morreu?",
  animal: "O seu personagem é um animal?"
};

// Relações contextuais (Se a resposta for SIM, ele tenta essas perguntas depois)
const RELACOES = {
  fict: ['anime', 'vj', 'desenho', 'filme', 'serieTv', 'membroFamilia'],
  anime: ['japon', 'mag', 'hum', 'heroi', 'vilao'],
  vj: ['japon', 'amer', 'hum', 'mag'],
  desenho: ['animal', 'amer', 'hum', 'membroFamilia'],
  filme: ['amer', 'membroFamilia', 'heroi', 'vilao'],
  serieTv: ['amer', 'hum', 'morto'],
  religioso: ['mais40', 'morto', 'hum'],
  membroFamilia: ['fict', 'hum', 'morto'],
  mais40: ['morto', 'polit'],
  heroi: ['vilao', 'mag', 'hum'],
  vilao: ['morto', 'mag'],
  hum: ['fem', 'mais40', 'animal']
};

const jogosAtivos = {};

function escolherPergunta(lista, perguntasFeitas, ultimaProp, ultimaResposta) {
  const disponiveis = Object.keys(PERGUNTAS).filter(p => !perguntasFeitas.includes(p));
  if (disponiveis.length === 0) return null;

  let candidatos = [];

  // Se a resposta foi "Sim" (1) ou "Provavelmente sim" (4), tenta as relacionadas
  if ((ultimaResposta === 1 || ultimaResposta === 4) && RELACOES[ultimaProp]) {
    candidatos = RELACOES[ultimaProp].filter(p => disponiveis.includes(p));
  }

  if (candidatos.length === 0) {
    candidatos = disponiveis;
  }

  let melhorPergunta = candidatos[0];
  let melhorDiferenca = Infinity;

  for (const prop of candidatos) {
    const sim = lista.filter(p => p[prop] === true).length;
    const nao = lista.length - sim;
    
    // Se a pergunta não elimina ninguém, pula
    if (sim === 0 || nao === 0) continue;

    const diferenca = Math.abs(sim - nao);
    if (diferenca < melhorDiferenca) {
      melhorDiferenca = diferenca;
      melhorPergunta = prop;
    }
  }

  return melhorPergunta;
}

export async function executeAkinator(ctx) {
  const { client, msg, jid, sender, pushName, reply } = ctx;

  if (jogosAtivos[sender]) delete jogosAtivos[sender];

  jogosAtivos[sender] = {
    lista: [...PERSONAGENS],
    perguntasFeitas: [],
    perguntaAtual: 'fict'
  };

  jogosAtivos[sender].perguntasFeitas.push('fict');

  await client.sendMessage(jid, { react: { text: '🧞‍♂️', key: msg.key } });

  return reply(
    `🧞‍♂️ *AKINATOR DO FREDDY* 🧞‍♂️\n\n` +
    `Pense em um personagem e eu vou tentar adivinhar!\n\n` +
    `*1ª Pergunta:*\n` +
    `👉 ${PERGUNTAS['fict']}\n\n` +
    `*1* - Sim\n` +
    `*2* - Não\n` +
    `*3* - Não sei\n` +
    `*4* - Provavelmente sim\n` +
    `*5* - Provavelmente não\n\n` +
    `_(Responda com: ${PREFIX}resp 1)_`
  );
}

export async function executeRespAkinator(ctx) {
  const { client, msg, jid, sender, pushName, q, reply } = ctx;

  if (!jogosAtivos[sender]) {
    return reply('❌ Você não tem um jogo ativo.\nUse *' + PREFIX + 'akinator* para começar!');
  }

  const resposta = parseInt(q);

  if (![1, 2, 3, 4, 5].includes(resposta)) {
    return reply('❌ Resposta inválida!\nUse *1* (Sim), *2* (Não), *3* (Não sei), *4* (Provavelmente sim) ou *5* (Provavelmente não).');
  }

  const jogo = jogosAtivos[sender];
  const propAtual = jogo.perguntaAtual;

  // Filtra a lista
  if (resposta === 1 || resposta === 4) {
    // Sim ou Provavelmente Sim
    jogo.lista = jogo.lista.filter(p => p[propAtual] === true);
  } else if (resposta === 2 || resposta === 5) {
    // Não ou Provavelmente Não
    jogo.lista = jogo.lista.filter(p => p[propAtual] === false || p[propAtual] === undefined);
  } 
  // Se for 3 (Não sei), não filtra nada

  if (jogo.lista.length === 1) {
    const personagem = jogo.lista[0];
    delete jogosAtivos[sender];
    registrarVitoriaBot(sender, pushName);
    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    return reply(
      `🧞‍♂️ *AKINATOR ACERTOU!* 🧞‍♂️\n\n` +
      `Você estava pensando em...\n\n` +
      `🥁 *${personagem.nome.toUpperCase()}*!`
    );
  }

  if (jogo.lista.length === 0) {
    delete jogosAtivos[sender];
    registrarVitoriaJogador(sender, pushName);
    await client.sendMessage(jid, { react: { text: '🤯', key: msg.key } });

    return reply(
      `🧞‍♂️ *AKINATOR ERROU!* 🧞‍♂️\n\n` +
      `Uau, você me venceu! Eu não consegui adivinhar.\n\n` +
      `🏆 Você ganhou 1 ponto no ranking!`
    );
  }

  const proximaProp = escolherPergunta(jogo.lista, jogo.perguntasFeitas, propAtual, resposta);
  
  if (!proximaProp) {
    jogo.lista.sort((a, b) => b.pop - a.pop);
    const palpite = jogo.lista[0];
    delete jogosAtivos[sender];
    registrarVitoriaBot(sender, pushName);

    return reply(
      `🧞‍♂️ *SERA QUE É...* 🧞‍♂️\n\n` +
      `Cheguei à conclusão de que é:\n\n` +
      `🥁 *${palpite.nome.toUpperCase()}*!`
    );
  }

  jogo.perguntaAtual = proximaProp;
  jogo.perguntasFeitas.push(proximaProp);

  return reply(
    `🧞‍♂️ *AKINATOR* 🧞‍♂️\n` +
    `_(Restam ${jogo.lista.length} possibilidades)_\n\n` +
    `👉 ${PERGUNTAS[proximaProp]}\n\n` +
    `*1* Sim | *2* Não | *3* Não sei\n` +
    `*4* Provavelmente sim | *5* Provavelmente não\n` +
    `Responda: *${PREFIX}resp 1*`
  );
}

export async function executeTopAkinator(ctx) {
  const { reply } = ctx;
  const ranking = getRankingAkinator();

  if (ranking.length === 0) return reply('🏆 Ninguém jogou o Akinator ainda!');

  let texto = `🏆 *RANKING AKINATOR* 🏆\n_(Quem mais venceu o bot)_\n\n`;
  for (let i = 0; i < Math.min(ranking.length, 10); i++) {
    const r = ranking[i];
    const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
    texto += `${medalha} *${r.nome}*\n└ 👑 Venceu: *${r.vitoriasJogador}*x\n└ 🧞‍♂️ Bot acertou: *${r.vitoriasBot}*x\n\n`;
  }
  return reply(texto);
}
