import { PREFIX, BOT_NAME, GRUPO_SUPORTE, GEMINI_API_KEY } from '../config.js';

// =========================================
// ESTADO
// =========================================
const conversas = {};
const modoIA = new Set();

// =========================================
// PERSONALIDADE DO FREDDY
// =========================================
const PERSONALIDADE = `Você é o Freddy, assistente virtual oficial do bot de WhatsApp "${BOT_NAME}".

REGRAS:
- Amigável, educado, prestativo
- Fala PT-BR claro e simples
- Usa 1-2 emojis por mensagem
- Nunca xinga, nunca ofende
- Respostas curtas (máx 5 linhas)

SOBRE O BOT:
- Prefixo: "${PREFIX}"
- Menus: ${PREFIX}menuadmin, ${PREFIX}menugame, ${PREFIX}menurg, ${PREFIX}menubaixar, ${PREFIX}menudono
- Básicos: ${PREFIX}ping, ${PREFIX}say, ${PREFIX}perfil, ${PREFIX}meunivel
- RPG: trabalhar, banco, pets, fazenda, cidade, pesca, clãs, casamento
- Jogos: jogo da velha, quebra-cabeça, verdade ou desafio, forca, quiz animal
- Downloads: ytmp3, ytmp4, snapchat, gdrive, reddit
- Figurinhas: ${PREFIX}s (criar), ${PREFIX}take (renomear)
- Pokémon, FNAF, aluguel

COMO GANHAR COINS:
- ${PREFIX}trabalhar (a cada 1h)
- ${PREFIX}daily (125 coins por dia)
- ${PREFIX}apostar, ${PREFIX}investir
- ${PREFIX}coletarimpostos (cidade)
- ${PREFIX}coletar (fazenda)
- ${PREFIX}venderpeixes (pesca)
- Jogos do menugame

Responda SEMPRE de forma curta.`;

// =========================================
// FALLBACK LOCAL (respostas prontas)
// =========================================
const FALLBACKS = [
  {
    tags: ['coins', 'dinheiro', 'ganhar coin'],
    resposta: `💰 *COMO GANHAR COINS:*\n\n• ${PREFIX}daily\n• ${PREFIX}trabalhar\n• ${PREFIX}apostar\n• ${PREFIX}investir\n• ${PREFIX}coletarimpostos\n• Jogos do ${PREFIX}menugame`
  },
  {
    tags: ['figurinha', 'sticker'],
    resposta: `🖼️ *CRIAR FIGURINHA:*\n\n1. Envie foto/vídeo\n2. Marque ela\n3. Digite ${PREFIX}s\n\n🏷️ Renomear: ${PREFIX}take <nome>`
  },
  {
    tags: ['menu'],
    resposta: `📂 *MENUS:*\n\n• ${PREFIX}menuadmin\n• ${PREFIX}menugame\n• ${PREFIX}menurg\n• ${PREFIX}menubaixar\n• ${PREFIX}menudono`
  },
  {
    tags: ['rpg'],
    resposta: `🗡️ *RPG:*\n\n• ${PREFIX}perfilrpg\n• ${PREFIX}trabalhar\n• ${PREFIX}pets\n• ${PREFIX}fazendas\n• ${PREFIX}cidade\n• ${PREFIX}pescar`
  },
  {
    tags: ['aluguel'],
    resposta: `💰 *ALUGUEL:*\n\n• ${PREFIX}aluguel\n• ${PREFIX}rg_aluguel <num> <tempo>\n• ${PREFIX}rn_aluguel\n• ${PREFIX}rm_aluguel`
  },
  {
    tags: ['pokemon'],
    resposta: `🎮 *POKÉMON:*\n\n• ${PREFIX}pokemon\n• ${PREFIX}meuspokemons\n• ${PREFIX}capturar\n• ${PREFIX}lojapokemon`
  },
  {
    tags: ['fazenda'],
    resposta: `🌾 *FAZENDA:*\n\n• ${PREFIX}fazendas\n• ${PREFIX}lojaanimais\n• ${PREFIX}melhorias\n• ${PREFIX}coletar`
  },
  {
    tags: ['cidade'],
    resposta: `🏙️ *CIDADE:*\n\n• ${PREFIX}criarcidade\n• ${PREFIX}construir\n• ${PREFIX}coletarimpostos\n• ${PREFIX}proposta`
  },
  {
    tags: ['pesca'],
    resposta: `🎣 *PESCA:*\n\n• ${PREFIX}comprariscas\n• ${PREFIX}pescar\n• ${PREFIX}aquario\n• ${PREFIX}venderpeixes`
  },
  {
    tags: ['cla', 'clã'],
    resposta: `🏰 *CLÃS:*\n\n• ${PREFIX}criarcla <nome> | <emoji>\n• ${PREFIX}entrarcla\n• ${PREFIX}meucla\n• ${PREFIX}rankingclas`
  },
  {
    tags: ['casamento'],
    resposta: `💍 *CASAMENTO:*\n\n• ${PREFIX}casar @user\n• ${PREFIX}meucasamento\n• ${PREFIX}divorciar`
  },
  {
    tags: ['jogo'],
    resposta: `🎮 *JOGOS:*\n\n• ${PREFIX}velha\n• ${PREFIX}quebracabeca\n• ${PREFIX}vdd\n• ${PREFIX}eununca\n• ${PREFIX}forca\n• ${PREFIX}quizanimal`
  },
  {
    tags: ['download', 'baixar'],
    resposta: `📥 *DOWNLOADS:*\n\n• ${PREFIX}ytmp3\n• ${PREFIX}ytmp4\n• ${PREFIX}snapchat\n• ${PREFIX}gdrive\n• ${PREFIX}reddit`
  },
  {
    tags: ['nivel', 'xp'],
    resposta: `🎓 *NÍVEL:*\n\n• ${PREFIX}meunivel\n\n💡 Cada comando = +10 XP`
  },
  {
    tags: ['pocao', 'poção', 'buff'],
    resposta: `💊 *POÇÕES:*\n\n• ${PREFIX}lojapocoes\n• ${PREFIX}comprarpocao\n• ${PREFIX}meusbuffs`
  },
  {
    tags: ['emprestimo'],
    resposta: `🏦 *EMPRÉSTIMO:*\n\n• ${PREFIX}emprestimo <valor>\n• ${PREFIX}pagaremprestimo`
  },
  {
    tags: ['admin', 'adm'],
    resposta: `🛡️ *ADMIN:*\n\n• ${PREFIX}ban\n• ${PREFIX}mute\n• ${PREFIX}advertir\n• ${PREFIX}abrir\n• ${PREFIX}fechar\n• ${PREFIX}admins`
  },
  {
    tags: ['fnaf'],
    resposta: `🐻 *FNAF:*\n\n• ${PREFIX}modofnaf start\n• ${PREFIX}vercamera\n• ${PREFIX}porta\n• ${PREFIX}luz`
  },
  {
    tags: ['oi', 'ola', 'olá', 'eae', 'bom dia', 'boa tarde', 'boa noite'],
    resposta: `🤖 Olá! Sou o Freddy, assistente do bot!\n\n💡 Pergunte:\n• como ganhar coins\n• como criar figurinha\n• o que tem no RPG`
  },
  {
    tags: ['obrigado', 'valeu', 'vlw'],
    resposta: `😊 De nada! Use ${PREFIX}menu para ver os comandos.`
  }
];

function buscarFallback(pergunta) {
  const p = pergunta.toLowerCase();
  for (const item of FALLBACKS) {
    for (const tag of item.tags) {
      if (p.includes(tag)) return item.resposta;
    }
  }
  return `🤖 Não entendi!\n\n💡 Pergunte sobre:\n• ganhar coins\n• criar figurinha\n• RPG\n• aluguel\n• admin\n\nOu use ${PREFIX}menu.`;
}

// =========================================
// GEMINI API
// =========================================
async function perguntarGemini(pergunta, historico) {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('COLE_A')) {
      throw new Error('API Key do Gemini não configurada');
    }

    // Monta o histórico
    const contents = [];

    // Adiciona a personalidade como contexto inicial
    contents.push({
      role: 'user',
      parts: [{ text: PERSONALIDADE }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Entendido! Sou o Freddy, pronto para ajudar. 🤖' }]
    });

    // Adiciona histórico da conversa
    for (const msg of historico) {
      contents.push({ role: 'user', parts: [{ text: msg.user }] });
      contents.push({ role: 'model', parts: [{ text: msg.bot }] });
    }

    // Adiciona a pergunta atual
    contents.push({
      role: 'user',
      parts: [{ text: pergunta }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
          topP: 0.95
        }
      }),
      signal: AbortSignal.timeout(25000)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errText.substring(0, 100)}`);
    }

    const data = await resp.json();

    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!texto) throw new Error('Resposta vazia do Gemini');

    return texto.trim();

  } catch (error) {
    console.log('[FREDDY-GEMINI] Erro:', error.message);
    return null;
  }
}

// =========================================
// FUNÇÃO PRINCIPAL
// =========================================
async function perguntarFreddy(pergunta, historico = []) {
  // Tenta o Gemini
  const resposta = await perguntarGemini(pergunta, historico);
  if (resposta) return resposta;

  // Se falhar, usa o fallback local
  console.log('[FREDDY] Gemini falhou. Usando resposta local...');
  return buscarFallback(pergunta);
}

// =========================================
// COMANDO: /ia <pergunta>
// =========================================
export async function executeIA(ctx) {
  const { reply, sender, q, pushName, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jid !== GRUPO_SUPORTE) {
    return reply(
      `🤖 *FREDDY*\n\n` +
      `Eu só funciono no *grupo de suporte*!`
    );
  }

  if (!q.trim()) {
    return reply(
      `🤖 *FREDDY — ASSISTENTE VIRTUAL*\n\n` +
      `Olá, ${pushName}! Estou aqui pra ajudar!\n\n` +
      `📌 *COMO USAR:*\n${PREFIX}ia <pergunta>\n\n` +
      `💡 *EXEMPLOS:*\n` +
      `• ${PREFIX}ia como ganhar coins?\n` +
      `• ${PREFIX}ia como criar figurinha?\n` +
      `• ${PREFIX}ia o que é o menurg?`
    );
  }

  await reply('🤖 Freddy está pensando...');

  if (!conversas[sender]) conversas[sender] = [];
  const historico = conversas[sender].slice(-5);

  const resposta = await perguntarFreddy(q, historico);

  conversas[sender].push({ user: q, bot: resposta });
  if (conversas[sender].length > 10) conversas[sender].shift();

  return reply(`🤖 *FREDDY:*\n\n${resposta}`);
}

// =========================================
// COMANDO: /iamodo on/off
// =========================================
export async function executeIAModo(ctx) {
  const { reply, sender, q, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jid !== GRUPO_SUPORTE) {
    return reply('🤖 O Modo IA só funciona no grupo de suporte!');
  }

  const arg = q.trim().toLowerCase();

  if (arg === 'on') {
    modoIA.add(sender);
    return reply(
      `🤖 *MODO IA ATIVADO*\n\n` +
      `Agora é só mandar mensagem sem prefixo que eu respondo!\n\n` +
      `🔕 Desativar: ${PREFIX}iamodo off`
    );
  }

  if (arg === 'off') {
    modoIA.delete(sender);
    return reply('🔕 *Modo IA desativado.*');
  }

  const ativo = modoIA.has(sender);
  return reply(
    `🤖 *MODO IA — FREDDY*\n\n` +
    `📊 Status: ${ativo ? '✅ ATIVADO' : '❌ DESATIVADO'}\n\n` +
    `💡 ${PREFIX}iamodo on | ${PREFIX}iamodo off`
  );
}

export function estaNoModoIA(sender) {
  return modoIA.has(sender);
}

export async function responderAutomatico(client, msg, sender, pushName, texto) {
  if (!conversas[sender]) conversas[sender] = [];
  const historico = conversas[sender].slice(-5);

  const resposta = await perguntarFreddy(texto, historico);

  conversas[sender].push({ user: texto, bot: resposta });
  if (conversas[sender].length > 10) conversas[sender].shift();

  await client.sendMessage(msg.key.remoteJid, {
    text: `🤖 *FREDDY:*\n\n${resposta}`
  });
}

// =========================================
// COMANDO: /ialimpar
// =========================================
export async function executeIALimpar(ctx) {
  const { reply, sender, msg } = ctx;
  const jid = msg.key.remoteJid;

  if (jid !== GRUPO_SUPORTE) {
    return reply('🤖 O comando só funciona no grupo de suporte!');
  }

  conversas[sender] = [];
  return reply('🧹 *Histórico limpo!*');
}
