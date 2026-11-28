import { PREFIX } from '../config.js';
import { getUsuario, salvarUsuario } from '../functions/rpg.js';
import { enviarBotoes, botaoLista, botaoResposta } from '../functions/botoes.js';
import { 
  lerDB, 
  salvarDB,
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
// DADOS DO SISTEMA DE PESCA
// =========================================
const VARA_PESCA = {
  bambu: { nome: 'Vara de Bambu', emoji: '🎣', preco: 0, bonus: 1 },
  fibra: { nome: 'Vara de Fibra', emoji: '🎣', preco: 5000, bonus: 1.5 },
  carbono: { nome: 'Vara de Carbono', emoji: '🎣', preco: 25000, bonus: 2 },
  titanio: { nome: 'Vara de Titânio', emoji: '⚙️', preco: 75000, bonus: 2.5 },
  lendaria: { nome: 'Vara Lendária', emoji: '✨', preco: 150000, bonus: 3.5 },
  divina: { nome: 'Vara Divina', emoji: '🌟', preco: 500000, bonus: 5 }
};

const TIPOS_ISCA = {
  minhoca: { nome: 'Minhoca', emoji: '🪱', preco: 20, raridades: ['lixo', 'comum', 'incomum'] },
  camarao: { nome: 'Camarão', emoji: '🦐', preco: 150, raridades: ['comum', 'incomum', 'raro'] },
  lula: { nome: 'Lula', emoji: '🦑', preco: 500, raridades: ['raro', 'epico'] },
  peixe_vivo: { nome: 'Peixe Vivo', emoji: '🐟', preco: 1500, raridades: ['epico', 'lendario'] },
  dourada: { nome: 'Isca Dourada', emoji: '🌟', preco: 5000, raridades: ['lendario', 'mitico'] }
};

const LISTA_PEIXES = [
  // LIXO
  { nome: 'Bota Velha', emoji: '👢', raridade: 'lixo', precoMin: 0, precoMax: 0 },
  { nome: 'Lata Enferrujada', emoji: '🥫', raridade: 'lixo', precoMin: 0, precoMax: 0 },
  { nome: 'Pneu Furado', emoji: '🛞', raridade: 'lixo', precoMin: 0, precoMax: 0 },
  
  // COMUM
  { nome: 'Sardinha', emoji: '🐟', raridade: 'comum', precoMin: 50, precoMax: 100 },
  { nome: 'Tilápia', emoji: '🐟', raridade: 'comum', precoMin: 80, precoMax: 150 },
  { nome: 'Robalo', emoji: '🐟', raridade: 'comum', precoMin: 100, precoMax: 200 },
  
  // INCOMUM
  { nome: 'Baiacu', emoji: '🐡', raridade: 'incomum', precoMin: 250, precoMax: 400 },
  { nome: 'Traíra', emoji: '🐟', raridade: 'incomum', precoMin: 300, precoMax: 500 },
  { nome: 'Carpa', emoji: '🐟', raridade: 'incomum', precoMin: 350, precoMax: 600 },
  
  // RARO
  { nome: 'Truta', emoji: '🐟', raridade: 'raro', precoMin: 800, precoMax: 1200 },
  { nome: 'Salmão', emoji: '🐟', raridade: 'raro', precoMin: 1000, precoMax: 1500 },
  { nome: 'Enguia Elétrica', emoji: '⚡', raridade: 'raro', precoMin: 1200, precoMax: 1800 },
  
  // ÉPICO
  { nome: 'Tubarão', emoji: '🦈', raridade: 'epico', precoMin: 3500, precoMax: 5000 },
  { nome: 'Peixe Espada', emoji: '⚔️', raridade: 'epico', precoMin: 4000, precoMax: 6000 },
  { nome: 'Arraia Gigante', emoji: '🥏', raridade: 'epico', precoMin: 4500, precoMax: 7000 },
  
  // LENDÁRIO
  { nome: 'Peixe Dourado', emoji: '✨', raridade: 'lendario', precoMin: 15000, precoMax: 20000 },
  { nome: 'Celacanto', emoji: '🦕', raridade: 'lendario', precoMin: 18000, precoMax: 25000 },
  { nome: 'Peixe Fantasma', emoji: '👻', raridade: 'lendario', precoMin: 20000, precoMax: 30000 },
  
  // MÍTICO
  { nome: 'Leviatã Bebê', emoji: '🐉', raridade: 'mitico', precoMin: 50000, precoMax: 80000 },
  { nome: 'Kraken Filhote', emoji: '🐙', raridade: 'mitico', precoMin: 70000, precoMax: 100000 },
  { nome: 'Dragão Marinho', emoji: '🐲', raridade: 'mitico', precoMin: 90000, precoMax: 150000 }
];

// =========================================
// FUNÇÕES AUXILIARES DO BANCO DE DADOS DE PESCA
// =========================================
function getPescaJogador(sender) {
  const db = lerDB();
  if (!db.pesca) db.pesca = {};
  if (!db.pesca[sender]) {
    db.pesca[sender] = {
      ultimaPesca: 0,
      varaAtual: 'bambu',
      iscas: { minhoca: 10, camarao: 0, lula: 0, peixe_vivo: 0, dourada: 0 },
      aquario: [],
      totalPescado: 0,
      recorde: null
    };
    salvarDB(db);
  }
  return db.pesca[sender];
}

function salvarPescaJogador(sender, dados) {
  const db = lerDB();
  db.pesca[sender] = dados;
  salvarDB(db);
}

// =========================================
// SISTEMA DE PESCA
// =========================================
export async function executePescar(ctx) {
  const { reply, sender, client, msg, jid, q } = ctx;
  const pesca = getPescaJogador(sender);

  const cooldown = 60 * 1000;
  const agora = Date.now();

  if (agora - pesca.ultimaPesca < cooldown) {
    const restante = Math.ceil((cooldown - (agora - pesca.ultimaPesca)) / 1000);
    return reply(`🎣 O peixe ainda não voltou! Aguarde *${restante}s*.`);
  }

  const iscaEscolhida = q.trim().toLowerCase();

  if (!iscaEscolhida || !TIPOS_ISCA[iscaEscolhida]) {
    const secoes = [
      {
        titulo: "🪱 𝙀𝙎𝘾𝙊𝙇𝙃𝘼 𝘼 𝙄𝙎𝘾𝘼 ↴",
        linhas: Object.entries(TIPOS_ISCA).map(([k, v]) => ({
          titulo: `${v.emoji} ${v.nome} (${pesca.iscas[k] || 0}x)`,
          descricao: `Atrai: ${v.raridades.join(', ')}`,
          tag: "Pescar",
          id: `${PREFIX}pescar ${k}`
        }))
      }
    ];

    const botoes = [ botaoLista('『 𝑱𝑶𝑮𝑨𝑹 𝑨 𝑰𝑺𝑪𝑨 』', secoes) ];
    const texto = `🎣 *PESCARIA*\n\n🪝 *Vara Atual:* ${VARA_PESCA[pesca.varaAtual].emoji} ${VARA_PESCA[pesca.varaAtual].nome} (Bônus x${VARA_PESCA[pesca.varaAtual].bonus})\n\nEscolha qual isca deseja usar:`;

    try {
      return await enviarBotoes(client, jid, {
        titulo: '🎣 Ir Pescar',
        corpo: texto,
        rodape: '© Pikachu Bot',
        mencoes: [sender],
        botoes
      }, msg);
    } catch {
      return reply(texto + `\n\nUse: ${PREFIX}pescar <${Object.keys(TIPOS_ISCA).join('|')}>`);
    }
  }

  if (!pesca.iscas[iscaEscolhida] || pesca.iscas[iscaEscolhida] <= 0) {
    return reply(`❌ Você não tem *${TIPOS_ISCA[iscaEscolhida].nome}*.\n💡 Compre na loja: ${PREFIX}lojapesca`);
  }

  pesca.iscas[iscaEscolhida]--;
  pesca.ultimaPesca = agora;

  const raridadesPermitidas = TIPOS_ISCA[iscaEscolhida].raridades;
  const peixesFiltrados = LISTA_PEIXES.filter(p => raridadesPermitidas.includes(p.raridade));
  
  const peixeSorteado = peixesFiltrados[Math.floor(Math.random() * peixesFiltrados.length)];
  
  const bonusVara = VARA_PESCA[pesca.varaAtual].bonus;
  const precoFinal = peixeSorteado.precoMin > 0 
    ? Math.floor((Math.random() * (peixeSorteado.precoMax - peixeSorteado.precoMin) + peixeSorteado.precoMin) * bonusVara)
    : 0;

  if (peixeSorteado.raridade === 'lixo') {
    salvarPescaJogador(sender, pesca);
    return reply(`🎣 Você fisgou... ${peixeSorteado.emoji} *${peixeSorteado.nome}* 😢\n\nMelhor sorte na próxima! (Isca perdida)`);
  }

  pesca.aquario.push({
    nome: peixeSorteado.nome,
    emoji: peixeSorteado.emoji,
    preco: precoFinal,
    raridade: peixeSorteado.raridade,
    pescadoEm: agora
  });
  pesca.totalPescado += 1;

  if (!pesca.recorde || precoFinal > pesca.recorde.preco) {
    pesca.recorde = { nome: peixeSorteado.nome, emoji: peixeSorteado.emoji, preco: precoFinal };
  }

  salvarPescaJogador(sender, pesca);

  const raridadeEmoji = { comum: '⚪', incomum: '🟢', raro: '🔵', epico: '🟣', lendario: '🟡', mitico: '🌈' };

  return reply(
    `🎣 *VOCÊ PESCOU!*\n\n` +
    `${peixeSorteado.emoji} *${peixeSorteado.nome}*\n` +
    `${raridadeEmoji[peixeSorteado.raridade]} Raridade: ${peixeSorteado.raridade.toUpperCase()}\n` +
    `💰 Valor: ${precoFinal.toLocaleString('pt-BR')} coins\n\n` +
    `🎒 Aquário: ${pesca.aquario.length} peixes\n` +
    `🪱 Iscas restantes: ${pesca.iscas[iscaEscolhida]}`
  );
}

export async function executeAquario(ctx) {
  const { reply, sender, client, msg, jid } = ctx;
  const pesca = getPescaJogador(sender);

  if (pesca.aquario.length === 0) return reply('🎣 Seu aquário está vazio! Use `!pescar` para pescar.');

  let texto = `🐠 *SEU AQUÁRIO*\n\n`;
  texto += `🪝 *Vara:* ${VARA_PESCA[pesca.varaAtual].nome}\n`;
  texto += `📊 Total de peixes: ${pesca.aquario.length}\n`;

  if (pesca.recorde) texto += `🏆 Recorde: ${pesca.recorde.emoji} ${pesca.recorde.nome} (${pesca.recorde.preco.toLocaleString('pt-BR')})\n`;

  texto += `\n🐟 *PEIXES GUARDADOS:*\n`;
  const agrupado = {};
  for (const p of pesca.aquario) {
    if (!agrupado[p.nome]) agrupado[p.nome] = { ...p, quantidade: 0 };
    agrupado[p.nome].quantidade += 1;
  }

  for (const p of Object.values(agrupado)) {
    texto += `${p.emoji} ${p.nome} x${p.quantidade} — ${p.preco.toLocaleString('pt-BR')} cada\n`;
  }

  const total = pesca.aquario.reduce((s, p) => s + p.preco, 0);
  texto += `\n💰 Valor total: ${total.toLocaleString('pt-BR')} coins`;

  const botoes = [ botaoResposta('💰 Vender Todos', `${PREFIX}venderpeixes`) ];

  try {
    return await enviarBotoes(client, jid, {
      titulo: '🐠 Aquário',
      corpo: texto,
      rodape: '© Pikachu Bot',
      mencoes: [sender],
      botoes
    }, msg);
  } catch {
    return reply(texto + `\n💡 Vender: ${PREFIX}venderpeixes`);
  }
}

export async function executeVenderPeixes(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);
  const pesca = getPescaJogador(sender);

  if (pesca.aquario.length === 0) return reply('❌ Seu aquário está vazio!');

  const total = pesca.aquario.reduce((s, p) => s + p.preco, 0);
  const quantidade = pesca.aquario.length;

  user.coins += total;
  pesca.aquario = [];

  salvarUsuario(sender, user);
  salvarPescaJogador(sender, pesca);

  return reply(`💰 *PEIXES VENDIDOS!*\n\n🐟 Qtd: ${quantidade}\n💵 Total: *${total.toLocaleString('pt-BR')} coins*\n\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`);
}

export async function executeLojaPesca(ctx) {
  const { client, msg, sender, jid, q } = ctx;
  const pesca = getPescaJogador(sender);
  
  const aba = q.trim().toLowerCase();

  if (aba === 'iscas') {
    const secoes = [
      {
        titulo: "🪱 𝙄𝙎𝘾𝘼𝙎 ↴",
        linhas: Object.entries(TIPOS_ISCA).map(([k, v]) => ({
          titulo: `${v.emoji} ${v.nome}`,
          descricao: `Preço: ${v.preco} | Atrai: ${v.raridades.join(', ')}`,
          id: `${PREFIX}comprarisca ${k} 10`
        }))
      }
    ];
    const botoes = [ botaoLista('『 𝑪𝑶𝑴𝑷𝑹𝑨𝑹 𝑰𝑺𝑪𝑨𝑺 』', secoes) ];
    return await enviarBotoes(client, jid, { titulo: '🪱 Loja de Iscas', corpo: 'Escolha o pacote de 10 iscas:', botoes }, msg);
  }

  const secoesVaras = [
    {
      titulo: "🎣 𝙑𝘼𝙍𝘼𝙎 ↴",
      linhas: Object.entries(VARA_PESCA).map(([k, v]) => ({
        titulo: `${v.emoji} ${v.nome}`,
        descricao: `Preço: ${v.preco.toLocaleString('pt-BR')} | Bônus: x${v.bonus}`,
        tag: pesca.varaAtual === k ? "Equipada" : "Comprar",
        id: `${PREFIX}comprarvara ${k}`
      }))
    }
  ];

  const botoes = [ botaoLista('『 𝑪𝑶𝑴𝑷𝑹𝑨𝑹 𝑽𝑨𝑹𝑨𝑺 』', secoesVaras), botaoResposta('🪱 Ver Iscas', `${PREFIX}lojapesca iscas`) ];
  
  let texto = `🏪 *LOJA DE PESCA*\n` +
    `🪝 *Sua Vara:* ${VARA_PESCA[pesca.varaAtual].nome}\n` +
    `🪱 *Iscas:* Minhoca: ${pesca.iscas.minhoca} | Camarão: ${pesca.iscas.camarao} | Lula: ${pesca.iscas.lula} | Peixe Vivo: ${pesca.iscas.peixe_vivo} | Dourada: ${pesca.iscas.dourada}\n\n` +
    `Selecione uma Vara para comprar ou clique em "Ver Iscas":`;

  try {
    await enviarBotoes(client, jid, {
      titulo: '🏪 Loja de Pesca',
      corpo: texto,
      rodape: '© Pikachu Bot',
      mencoes: [sender],
      botoes
    }, msg);
  } catch {
    return ctx.reply(texto);
  }
}

export async function executeComprarVara(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const pesca = getPescaJogador(sender);
  const varaKey = q.trim().toLowerCase();

  if (!VARA_PESCA[varaKey]) return reply('❌ Vara inválida.');
  if (pesca.varaAtual === varaKey) return reply('❌ Você já está usando essa vara!');

  const custo = VARA_PESCA[varaKey].preco;
  if (user.coins < custo) return reply(`❌ Você precisa de ${custo.toLocaleString('pt-BR')} coins.`);

  user.coins -= custo;
  pesca.varaAtual = varaKey;

  salvarUsuario(sender, user);
  salvarPescaJogador(sender, pesca);

  return reply(`✅ Você comprou e equipou a *${VARA_PESCA[varaKey].emoji} ${VARA_PESCA[varaKey].nome}*!`);
}

export async function executeComprarIsca(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);
  const pesca = getPescaJogador(sender);
  
  const partes = q.trim().toLowerCase().split(/\s+/);
  const tipo = partes[0];
  const qtd = parseInt(partes[1]) || 10; 

  if (!TIPOS_ISCA[tipo]) return reply('❌ Isca inválida.');

  const custo = TIPOS_ISCA[tipo].preco * qtd;
  if (user.coins < custo) return reply(`❌ Você precisa de ${custo.toLocaleString('pt-BR')} coins.`);

  user.coins -= custo;
  pesca.iscas[tipo] = (pesca.iscas[tipo] || 0) + qtd;

  salvarUsuario(sender, user);
  salvarPescaJogador(sender, pesca);

  return reply(`✅ Você comprou *${qtd}x ${TIPOS_ISCA[tipo].emoji} ${TIPOS_ISCA[tipo].nome}*!\n💼 Saldo: ${user.coins.toLocaleString('pt-BR')}`);
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
