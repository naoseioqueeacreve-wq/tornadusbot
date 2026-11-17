import cron from 'node-cron';
import { sortearPokemon, RARIDADES, IMAGENS, getGeracaoAtual } from './pokemon.js';
import { lerDB, salvarDB, getGruposSpawn } from './pokemonDB.js';
import { iniciarRaids } from './pokemonRaid.js';
import { PREFIX } from '../config.js';
import { enviarBotoes, botaoResposta } from './botoes.js';

// Mantidos só por compatibilidade com quem ainda importa estes nomes.
export const gruposAtivos = new Set();
export function registrarGrupo(jid) {}

let currentClient = null;
let cronIniciado = false;

// Função para baixar a imagem contornando o bloqueio HTTP 429
async function baixarImagem(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[POKEMON] Erro ao baixar imagem:', error.message);
    return null;
  }
}

export function iniciarSpawn(client) {
  iniciarRaids(client);

  currentClient = client;
  if (cronIniciado) return;
  cronIniciado = true;

  console.log('[POKEMON] ⏱️ Cron Job de Spawn Automático iniciado (a cada 5 minutos).');

  cron.schedule('*/5 * * * *', async () => {
    try {
      if (getGruposSpawn().length === 0) return;

      let db = lerDB();
      const agora = Date.now();

      if (db.spawnAtual) {
        if (agora > db.spawnAtual.expiraEm) {
          const velho = db.spawnAtual.pokemon;
          const jidAntigo = db.spawnAtual.jid;
          db.spawnAtual = null;
          salvarDB(db);
          try {
            await currentClient.sendMessage(jidAntigo, { text: `💨 *${velho.emoji} ${velho.nome}* fugiu! Ninguém capturou a tempo.` });
          } catch (e) {}
          db = lerDB();
        } else {
          return;
        }
      }

      const grupos = getGruposSpawn();
      if (grupos.length === 0) return;
      const jid = grupos[Math.floor(Math.random() * grupos.length)];
      const pokemon = sortearPokemon();
      const r = RARIDADES[pokemon.raridade];

      db.spawnAtual = { jid, pokemon, expiraEm: Date.now() + 3 * 60 * 1000 };
      salvarDB(db);

      const texto = `⚡ *UM POKÉMON SELVAGEM APARECEU!* ⚡\n\n` +
        `📅 Geração de Hoje: *${getGeracaoAtual()}*\n\n` +
        `   ${pokemon.emoji} *${pokemon.nome}*\n` +
        `   ${r.emoji} Raridade: *${r.nome}* ${r.estrelas}\n` +
        `   ❤️ HP: ${pokemon.hp} | ⚔️ ATK: ${pokemon.atk}\n\n` +
        `⏰ Você tem *3 minutos* para capturar!\n` +
        `💡 Use: \`!capturar ${pokemon.nome}\`\n` +
        `_(Você pode escolher a bola: !capturar ${pokemon.nome} great)_`;

      const urlImagem = pokemon.img || pokemon.imagem || pokemon.gif || pokemon.url || (IMAGENS ? IMAGENS.spawn : null);
      let msgEnviada = null;

      if (urlImagem && typeof urlImagem === 'string' && urlImagem.startsWith('http')) {
        const buffer = await baixarImagem(urlImagem);
        if (buffer) {
          try {
            msgEnviada = await currentClient.sendMessage(jid, { image: buffer, caption: texto });
          } catch (err) {}
        }
      }

      if (!msgEnviada) {
        msgEnviada = await currentClient.sendMessage(jid, { text: texto });
      }

      // Envia os botões de captura citando a mensagem do Pokémon
      const botoes = [
        botaoResposta('🎯 Capturar Pokémon', `${PREFIX}capturar ${pokemon.nome.toLowerCase()}`)
      ];
      
      try {
        await enviarBotoes(currentClient, jid, {
          corpo: `⚡ *${pokemon.nome}* está esperando! O que deseja fazer?`,
          rodape: '© Pikachu Bot',
          botoes
        }, msgEnviada);
      } catch (e) {
        console.error('[POKEMON] Erro ao enviar botões de captura:', e.message);
      }

      console.log(`[POKEMON] ✅ Spawn automático enviado em ${jid}: ${pokemon.nome}`);

    } catch (error) {
      console.error('[POKEMON] ❌ Erro no loop do spawn:', error.message);
    }
  });
}

export async function forcarSpawn(client, jid) {
  const db = lerDB();
  if (db.spawnAtual && Date.now() < db.spawnAtual.expiraEm) return false;

  const pokemon = sortearPokemon();
  const r = RARIDADES[pokemon.raridade];
  db.spawnAtual = { jid, pokemon, expiraEm: Date.now() + 3 * 60 * 1000 };
  salvarDB(db);

  const texto = `⚡ *SPAWN FORÇADO (TESTE)* ⚡\n\n` +
    `📅 Geração de Hoje: *${getGeracaoAtual()}*\n\n` +
    `   ${pokemon.emoji} *${pokemon.nome}*\n` +
    `   ${r.emoji} Raridade: *${r.nome}* ${r.estrelas}\n` +
    `   ❤️ HP: ${pokemon.hp} | ⚔️ ATK: ${pokemon.atk}\n\n` +
    `💡 Use: \`!capturar ${pokemon.nome}\``;

  const urlImagem = pokemon.img || pokemon.imagem || pokemon.gif || pokemon.url || (IMAGENS ? IMAGENS.spawn : null);
  let msgEnviada = null;

  if (urlImagem && typeof urlImagem === 'string' && urlImagem.startsWith('http')) {
    const buffer = await baixarImagem(urlImagem);
    if (buffer) {
      try {
        msgEnviada = await client.sendMessage(jid, { image: buffer, caption: texto });
      } catch (err) {}
    }
  }
  
  if (!msgEnviada) {
    msgEnviada = await client.sendMessage(jid, { text: texto });
  }

  // Envia os botões de captura
  const botoes = [
    botaoResposta('🎯 Capturar Pokémon', `${PREFIX}capturar ${pokemon.nome.toLowerCase()}`)
  ];

  try {
    await enviarBotoes(client, jid, {
      corpo: `⚡ *${pokemon.nome}* está esperando! O que deseja fazer?`,
      rodape: '© Pikachu Bot',
      botoes
    }, msgEnviada);
  } catch (e) {
    console.error('[POKEMON] Erro ao enviar botões de captura:', e.message);
  }

  return true;
}
