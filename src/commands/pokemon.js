import { PREFIX } from '../config.js';
import {
  POKEBOLAS, ITENS, RARIDADES, IMAGENS, calcularCaptura,
  adicionarXpTreinador, xpNecessario
} from '../functions/pokemon.js';
import {
  lerDB, salvarDB, getUsuario, salvarUsuario, setSpawnGrupo
} from '../functions/pokemonDB.js';
import { delay } from '@whiskeysockets/baileys';

// 🕹️ IMPORTAÇÃO DO SISTEMA DE BOTÕES
import { enviarBotoes, botaoLista, botaoResposta } from '../functions/botoes.js';

// =========================================
// FUNÇÃO AUXILIAR: INVENTÁRIO DE BOLAS
// =========================================
function textoInventario(user) {
  return `🎒 *Suas Pokébolas:*\n` +
    `🔴 Normal: ${user.pokebolas.normal || 0} | ` +
    `🔵 Great: ${user.pokebolas.great || 0} | ` +
    `🟡 Ultra: ${user.pokebolas.ultra || 0} | ` +
    `🟣 Master: ${user.pokebolas.master || 0}`;
}

// =========================================
// COMANDO: !pokemon (menu principal)
// =========================================
export async function executePokemon(ctx) {
  const { client, msg, sender, pushName } = ctx;
  const user = getUsuario(sender);
  const ativo = user.pokemonAtivo !== null ? user.pokemons[user.pokemonAtivo] : null;
  
  const xpAtual = user.xp || 0;
  const xpProx = xpNecessario(user.nivel);
  const faltaXp = xpProx - xpAtual;

  const texto = `╭━━━〔 🎮 *POKÉMON CENTER* 〕━━━╮\n` +
    `┃\n` +
    `┃ 👤 Treinador: *${pushName}*\n` +
    `┃ 🏅 Nível: *${user.nivel || 1}/50*\n` +
    `┃ 📊 XP: *${xpAtual}/${xpProx === Infinity ? 'MAX' : xpProx}*\n` +
    `┃ (Faltam ${faltaXp === Infinity ? '0' : faltaXp} XP)\n` +
    `┃ 💰 PokéCoins: *${user.pokecoins}*\n` +
    `┃ 🎒 Pokémons: *${user.pokemons.length}*\n` +
    `┃\n` +
    `┃ ${textoInventario(user).replace(/\n/g, '\n┃ ')}\n` +
    `┃\n` +
    `┃ 🐾 *Pokémon Ativo:*\n` +
    `┃ ${ativo ? `${ativo.emoji} ${ativo.nome} (Lv.${ativo.level})` : '❌ Nenhum selecionado'}\n` +
    `┃\n` +
    `┃ 📋 *COMANDOS*\n` +
    `┃ • ${PREFIX}meuspokemons\n` +
    `┃ • ${PREFIX}trocar <n>\n` +
    `┃ • ${PREFIX}alimentar <item>\n` +
    `┃ • ${PREFIX}batalhapokemon @user\n` +
    `┃ • ${PREFIX}lojapokemon\n` +
    `┃ • ${PREFIX}lojapokebola\n` +
    `┃ • ${PREFIX}capturar <nome> [bola]\n` +
    `┃\n` +
    `╰━━━━━━━━━━━━━━━━━━━━╯`;

  try {
    return await client.sendMessage(msg.key.remoteJid, { image: { url: IMAGENS.menu }, caption: texto }, { quoted: msg });
  } catch {
    return client.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
  }
}

// =========================================
// COMANDO: !meuspokemons
// =========================================
export async function executeMeusPokemons(ctx) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);

  if (user.pokemons.length === 0) {
    return reply('❌ Você ainda não tem nenhum Pokémon! Aguarde um spawn e use `!capturar <nome>`.');
  }

  let texto = `🎒 *SUA COLEÇÃO DE POKÉMONS*\n\n`;
  user.pokemons.forEach((p, i) => {
    const r = RARIDADES[p.raridade];
    const ativo = user.pokemonAtivo === i ? ' ✅' : '';
    texto += `${i + 1}. ${p.emoji} *${p.nome}* (Lv.${p.level})${ativo}\n`;
    texto += `   ${r.emoji} ${r.nome} ${r.estrelas}\n`;
    texto += `   ❤️ Felicidade: ${p.felicidade}/100\n`;
    texto += `   🍖 Fome: ${p.fome}/100\n`;
    texto += `   ⚔️ ATK: ${p.atk} | 🛡️ DEF: ${p.def} | ❤️ HP: ${p.hp}\n\n`;
  });

  return reply(texto);
}

// =========================================
// COMANDO: !trocar <número>
// =========================================
export async function executeTrocar(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);

  const num = parseInt(q.trim());
  if (!num || num < 1 || num > user.pokemons.length) {
    return reply(`❌ Use: !trocar <número>\nVeja sua lista com !meuspokemons`);
  }

  user.pokemonAtivo = num - 1;
  salvarUsuario(sender, user);

  const p = user.pokemons[num - 1];
  return reply(`✅ Pokémon ativo: ${p.emoji} *${p.nome}*`);
}

// =========================================
// COMANDO: !alimentar <item> (DÁ XP)
// =========================================
export async function executeAlimentar(ctx) {
  const { reply, sender, q } = ctx;
  const user = getUsuario(sender);

  if (user.pokemonAtivo === null) return reply('❌ Você não tem um Pokémon ativo. Use `!trocar <número>`.');

  const itemNome = q.trim().toLowerCase();
  const item = Object.entries(ITENS).find(([k, v]) => k === itemNome || v.nome.toLowerCase() === itemNome);
  if (!item) return reply('❌ Item inválido. Veja com `!lojapokemon`.');

  const [chave, dados] = item;
  if (!user.itens[chave] || user.itens[chave] <= 0) {
    return reply(`❌ Você não tem *${dados.nome}*. Compre com \`!comprar ${chave}\`.`);
  }

  user.itens[chave]--;
  const p = user.pokemons[user.pokemonAtivo];
  p.felicidade = Math.min(100, p.felicidade + dados.felicidade);
  p.fome = Math.min(100, p.fome + dados.fome);

  const resultadoXp = adicionarXpTreinador(user, dados.xp);
  salvarUsuario(sender, resultadoXp.user);

  let texto = `🍽️ *${p.emoji} ${p.nome}* comeu *${dados.emoji} ${dados.nome}*!\n\n` +
    `❤️ Felicidade: ${p.felicidade}/100\n` +
    `🍖 Fome: ${p.fome}/100\n` +
    `⭐ +${dados.xp} XP de Treinador`;

  if (resultadoXp.subiu) texto += `\n\n${resultadoXp.mensagem}`;

  return reply(texto);
}

// =========================================
// COMANDO: !lojapokemon (COM BOTÕES)
// =========================================
export async function executeLojaPokemon(ctx) {
  const { client, msg, sender, jid } = ctx;
  const user = getUsuario(sender);

  let texto = `🏪 *LOJA POKÉMON*\n` +
    `💰 Seu saldo: *${user.pokecoins} PokéCoins*\n\n`;

  Object.entries(ITENS).forEach(([k, v]) => {
    texto += `${v.emoji} *${v.nome}* — ${v.preco} PokéCoins\n`;
    texto += `   ❤️ +${v.felicidade} | 🍖 +${v.fome} | ⭐ +${v.xp} XP\n\n`;
  });

  texto += `💡 Selecione um item no botão abaixo para comprar:`;

  const secoes = [
    {
      titulo: "🍖 𝙄𝙏𝙀𝙉𝙎 ↴",
      linhas: Object.entries(ITENS).map(([k, v]) => ({
        titulo: `${v.emoji} ${v.nome}`,
        descricao: `Preço: ${v.preco} PokéCoins`,
        tag: "Comprar",
        id: `${PREFIX}comprar ${k}`
      }))
    }
  ];

  const botoes = [ botaoLista('『 𝑨𝑩𝑹𝑰𝑹 𝑳𝑶𝑱𝑨 』', secoes) ];

  try {
    await enviarBotoes(client, jid, {
      titulo: '🏪 Loja Pokémon',
      corpo: texto,
      rodape: '© Pikachu Bot',
      imagem: { url: IMAGENS.loja },
      botoes
    }, msg);
  } catch {
    return client.sendMessage(jid, { image: { url: IMAGENS.loja }, caption: texto }, { quoted: msg });
  }
}

// =========================================
// COMANDO: !lojapokebola (COM BOTÕES)
// =========================================
export async function executeLojaPokebola(ctx) {
  const { client, msg, sender, jid } = ctx;
  const user = getUsuario(sender);

  let texto = `🔴 *LOJA DE POKÉBOLAS*\n` +
    `💰 Seu saldo: *${user.pokecoins} PokéCoins*\n\n`;

  Object.entries(POKEBOLAS).forEach(([k, v]) => {
    texto += `${v.emoji} *${v.nome}* — ${v.preco.toLocaleString('pt-BR')} PokéCoins\n`;
    texto += `   🎯 Multiplicador: x${v.multiplicador}\n\n`;
  });

  texto += `💡 Selecione uma Pokébola no botão abaixo para comprar:`;

  const secoes = [
    {
      titulo: "🔴 𝙋𝙊𝙆𝙀́𝘽𝙊𝙇𝘼𝙎 ↴",
      linhas: Object.entries(POKEBOLAS).map(([k, v]) => ({
        titulo: `${v.emoji} ${v.nome}`,
        descricao: `Preço: ${v.preco.toLocaleString('pt-BR')} | Multiplicador: x${v.multiplicador}`,
        tag: "Comprar",
        id: `${PREFIX}comprar ${k}`
      }))
    }
  ];

  const botoes = [ botaoLista('『 𝑨𝑩𝑹𝑰𝑹 𝑳𝑶𝑱𝑨 』', secoes) ];

  try {
    await enviarBotoes(client, jid, {
      titulo: '⚡ Loja de Pokébolas',
      corpo: texto,
      rodape: '© Pikachu Bot',
      imagem: { url: IMAGENS.pokebola },
      botoes
    }, msg);
  } catch {
    return client.sendMessage(jid, { image: { url: IMAGENS.pokebola }, caption: texto }, { quoted: msg });
  }
}

// =========================================
// COMANDO: !comprar <item> [qtd] (COM BOTÕES DE QUANTIDADE)
// =========================================
export async function executeComprar(ctx) {
  const { reply, sender, q, client, jid, msg } = ctx;
  const user = getUsuario(sender);
  
  const partes = q.trim().toLowerCase().split(/\s+/);
  const nome = partes[0];
  const qtd = parseInt(partes[1]) || 0;

  const itemBola = Object.entries(POKEBOLAS).find(([k, v]) => k === nome || v.nome.toLowerCase() === nome);
  const itemComida = Object.entries(ITENS).find(([k, v]) => k === nome || v.nome.toLowerCase() === nome);

  const item = itemBola || itemComida;
  if (!item) return reply('❌ Item inválido. Veja com `!lojapokemon` ou `!lojapokebola`.');

  const [chave, dados] = item;

  // Se for pokebola e a pessoa ainda NÃO escolheu a quantidade, mostra os botões
  if (itemBola && qtd === 0) {
    const botoesQtd = [1, 2, 3, 4, 5].map(n => 
      botaoResposta(`🛒 Comprar ${n}x`, `${PREFIX}comprar ${chave} ${n}`)
    );
    
    const texto = `🛒 *QUANTIDADE*\n\nQuantas *${dados.emoji} ${dados.nome}* você deseja comprar?\n💰 Preço unitário: ${dados.preco} PokéCoins`;
    
    try {
      return await enviarBotoes(client, jid, {
        corpo: texto,
        rodape: '© Pikachu Bot',
        botoes: botoesQtd
      }, msg);
    } catch {
      return reply(texto + `\n\nUse: ${PREFIX}comprar ${chave} <qtd>`);
    }
  }

  // Se for comida ou se já escolheu a quantidade (pokebola)
  const quantidadeFinal = qtd > 0 ? qtd : 1;
  const precoTotal = dados.preco * quantidadeFinal;

  if (user.pokecoins < precoTotal) {
    return reply(`❌ Você precisa de ${precoTotal.toLocaleString('pt-BR')} PokéCoins. Saldo: ${user.pokecoins}.`);
  }

  user.pokecoins -= precoTotal;

  if (chave in POKEBOLAS) {
    user.pokebolas[chave] = (user.pokebolas[chave] || 0) + quantidadeFinal;
  } else {
    user.itens[chave] = (user.itens[chave] || 0) + quantidadeFinal;
  }

  salvarUsuario(sender, user);

  return reply(
    `✅ Comprou *${quantidadeFinal}x ${dados.emoji} ${dados.nome}*!\n` +
    `💰 Gasto: ${precoTotal.toLocaleString('pt-BR')} PokéCoins\n` +
    `💰 Saldo restante: ${user.pokecoins} PokéCoins\n\n${textoInventario(user)}`
  );
}

// =========================================
// COMANDO: !capturar <nome> [bola]
// =========================================
export async function executeCapturar(ctx) {
  const { client, msg, sender, q } = ctx;
  const db = lerDB();
  const user = getUsuario(sender);
  const jid = msg.key.remoteJid;

  if (!db.spawnAtual) return client.sendMessage(jid, { text: '❌ Nenhum Pokémon apareceu ainda. Aguarde!' });

  const spawn = db.spawnAtual;

  if (Date.now() > spawn.expiraEm) {
    db.spawnAtual = null;
    salvarDB(db);
    return client.sendMessage(jid, { text: '💨 O Pokémon fugiu! Ele ficou muito tempo sem ser capturado.' });
  }

  const args = q.trim().toLowerCase().split(/\s+/);
  const nomeDigitado = args[0];
  let bolaKey = args[1] || 'normal';

  if (!nomeDigitado) return client.sendMessage(jid, { text: `❌ Use: ${PREFIX}capturar <nome> [bola]` });
  if (nomeDigitado !== spawn.pokemon.nome.toLowerCase()) return client.sendMessage(jid, { text: `❌ O nome não corresponde ao Pokémon selvagem.` });

  if (!POKEBOLAS[bolaKey]) {
    return client.sendMessage(jid, { text: `❌ Pokébola inválida. Escolha entre: normal, great, ultra, master.` });
  }

  if (!user.pokebolas[bolaKey] || user.pokebolas[bolaKey] <= 0) {
    return client.sendMessage(jid, { 
      text: `❌ Você não tem *${POKEBOLAS[bolaKey].nome}*.\n\n${textoInventario(user)}\n\n💡 Compre com \`!comprar ${bolaKey}\`.`
    });
  }

  user.pokebolas[bolaKey]--;
  
  const chance = calcularCaptura(spawn.pokemon, bolaKey);
  const sucesso = Math.random() < chance;
  const urlPokebola = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${bolaKey === 'normal' ? 'poke' : bolaKey}-ball.png`;

  let textoFinal = '';

  if (sucesso) {
    const pokemon = { ...spawn.pokemon, level: 1, felicidade: 50, fome: 50 };
    user.pokemons.push(pokemon);
    db.spawnAtual = null;
    
    const resultadoXp = adicionarXpTreinador(user, 100);
    db.usuarios[sender] = resultadoXp.user; 

    const r = RARIDADES[pokemon.raridade];
    textoFinal = `🎉 *CAPTURADO!*\n\n${pokemon.emoji} *${pokemon.nome}*\n${r.emoji} ${r.nome} ${r.estrelas}\n❤️ HP: ${pokemon.hp} | ⚔️ ATK: ${pokemon.atk}\n\n🎒 Total: ${user.pokemons.length} Pokémons\n⭐ +100 XP\n\n${textoInventario(user)}`;
    
    if (resultadoXp.subiu) textoFinal += `\n\n${resultadoXp.mensagem}`;
    
  } else {
    if (Math.random() < 0.3) {
      db.spawnAtual = null;
      textoFinal = `💨 *${spawn.pokemon.emoji} ${spawn.pokemon.nome}* fugiu! Ele quebrou a bola e correu.\n\n${textoInventario(user)}`;
    } else {
      textoFinal = `😢 *${spawn.pokemon.emoji} ${spawn.pokemon.nome}* escapou da Pokébola!\n\n${textoInventario(user)}`;
    }
    db.usuarios[sender] = user; 
  }

  salvarDB(db);

  try {
    let mensagemAtual = await client.sendMessage(jid, { 
      image: { url: urlPokebola }, 
      caption: `🎯 *Jogando a ${POKEBOLAS[bolaKey].nome}...*` 
    }, { quoted: msg });

    await delay(1500);
    await client.sendMessage(jid, { edit: mensagemAtual.key, image: { url: urlPokebola }, caption: `🎯 *Jogando a ${POKEBOLAS[bolaKey].nome}...*\n\n🔄 *Balançando (1/3)...*` });

    await delay(1500);
    await client.sendMessage(jid, { edit: mensagemAtual.key, image: { url: urlPokebola }, caption: `🎯 *Jogando a ${POKEBOLAS[bolaKey].nome}...*\n\n🔄 *Balançando (2/3)...*` });

    await delay(1500);
    await client.sendMessage(jid, { edit: mensagemAtual.key, image: { url: urlPokebola }, caption: `🎯 *Jogando a ${POKEBOLAS[bolaKey].nome}...*\n\n🔄 *Balançando (3/3)...*` });

    await delay(1500);
    
    await client.sendMessage(jid, { edit: mensagemAtual.key, image: { url: urlPokebola }, caption: textoFinal });

  } catch (error) {
    console.error('[POKEMON] Erro na animação de captura:', error.message);
    await client.sendMessage(jid, { text: textoFinal });
  }
}

// =========================================
// COMANDO: !batalhapokemon @user (DÁ XP)
// =========================================
export async function executeBatalhaPokemon(ctx) {
  const { reply, sender, msg, pushName } = ctx;
  const user = getUsuario(sender);

  if (user.pokemonAtivo === null) return reply('❌ Você precisa de um Pokémon ativo.');

  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  if (mentions.length === 0) return reply(`❌ Marque alguém! Ex: ${PREFIX}batalhapokemon @joao`);

  const oponente = mentions[0];
  if (oponente === sender) return reply('❌ Você não pode batalhar contra si mesmo.');

  const userO = getUsuario(oponente);
  if (userO.pokemonAtivo === null) return reply('❌ O oponente não tem Pokémon ativo.');

  const p1 = user.pokemons[user.pokemonAtivo];
  const p2 = userO.pokemons[userO.pokemonAtivo];

  const poder1 = p1.hp + p1.atk + p1.def + p1.velocidade + (p1.felicidade / 5);
  const poder2 = p2.hp + p2.atk + p2.def + p2.velocidade + (p2.felicidade / 5);

  const vencedor = poder1 >= poder2 ? 'p1' : 'p2';
  const premio = 100;

  let resultadoXp;

  if (vencedor === 'p1') {
    p1.level += 1; p1.hp += 5; p1.atk += 3; p1.def += 3;
    user.pokecoins += premio;
    userO.pokecoins = Math.max(0, userO.pokecoins - premio);
    p2.atk = Math.max(1, p2.atk - 2); p2.def = Math.max(1, p2.def - 2); p2.felicidade = Math.max(0, p2.felicidade - 10);
    
    resultadoXp = adicionarXpTreinador(user, 250);
  } else {
    p2.level += 1; p2.hp += 5; p2.atk += 3; p2.def += 3;
    userO.pokecoins += premio;
    user.pokecoins = Math.max(0, user.pokecoins - premio);
    p1.atk = Math.max(1, p1.atk - 2); p1.def = Math.max(1, p1.def - 2); p1.felicidade = Math.max(0, p1.felicidade - 10);
    
    resultadoXp = adicionarXpTreinador(userO, 250);
  }

  salvarUsuario(sender, user);
  salvarUsuario(oponente, userO);

  let texto = `⚔️ *BATALHA POKÉMON*\n\n👤 *${pushName}*\n   ${p1.emoji} ${p1.nome} (Lv.${p1.level})\n   Poder: ${poder1.toFixed(0)}\n\n🆚\n\n👤 *Oponente*\n   ${p2.emoji} ${p2.nome} (Lv.${p2.level})\n   Poder: ${poder2.toFixed(0)}\n\n🏆 *VENCEDOR:* ${vencedor === 'p1' ? pushName : 'Oponente'}\n💰 Prêmio: ${premio} PokéCoins\n⭐ +250 XP de Treinador`;

  if (resultadoXp.subiu) texto += `\n\n${resultadoXp.mensagem}`;
  return reply(texto);
}

// =========================================
// COMANDO: !ataque1 / !ataque2 / !ataque3
// =========================================
export async function executeAtaque(ctx, numero) {
  const { reply, sender } = ctx;
  const user = getUsuario(sender);

  if (user.pokemonAtivo === null) return reply('❌ Você precisa de um Pokémon ativo.');

  const p = user.pokemons[user.pokemonAtivo];

  const ataques = {
    1: { nome: 'Investida', emoji: '💥', dano: p.atk * 0.8 },
    2: { nome: 'Ataque Rápido', emoji: '⚡', dano: p.atk * 1.2 },
    3: { nome: 'Golpe Poderoso', emoji: '💢', dano: p.atk * 1.5 }
  };

  const atk = ataques[numero];
  if (!atk) return reply('❌ Ataque inválido.');

  return reply(
    `⚔️ *${p.emoji} ${p.nome}* usou *${atk.emoji} ${atk.nome}*!\n\n` +
    `💥 Dano estimado: ${atk.dano.toFixed(0)}\n` +
    `⚔️ ATK do Pokémon: ${p.atk}`
  );
}

// =========================================
// COMANDO: !ativarspawn (POR GRUPO)
// =========================================
export async function executeAtivarSpawn(ctx) {
  const { reply, sender, msg, isGroup } = ctx;
  const { isOwner } = await import('../functions/permissions.js');
  if (!isOwner(sender)) return reply('❌ Apenas o dono do bot pode usar este comando.');
  if (!isGroup) return reply('❌ Use este comando dentro do grupo onde você quer ativar o spawn.');

  if (!setSpawnGrupo(msg.key.remoteJid, true)) {
    return reply('⚠️ O spawn já está ativado *neste grupo*.');
  }
  return reply('✅ *SPAWN ATIVADO NESTE GRUPO!*\n\nOs Pokémons vão aparecer aqui. Os outros grupos não são afetados.');
}

// =========================================
// COMANDO: !desativarspawn (POR GRUPO)
// =========================================
export async function executeDesativarSpawn(ctx) {
  const { reply, sender, msg, isGroup } = ctx;
  const { isOwner } = await import('../functions/permissions.js');
  if (!isOwner(sender)) return reply('❌ Apenas o dono do bot pode usar este comando.');
  if (!isGroup) return reply('❌ Use este comando dentro do grupo onde você quer desativar o spawn.');

  if (!setSpawnGrupo(msg.key.remoteJid, false)) {
    return reply('⚠️ O spawn já está desativado *neste grupo*.');
  }
  return reply('🔕 *SPAWN DESATIVADO NESTE GRUPO!*\n\nOs Pokémons não vão mais aparecer aqui.');
                                                 }
