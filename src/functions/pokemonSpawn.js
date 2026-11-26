import cron from 'node-cron';
import { sortearPokemon, RARIDADES, IMAGENS, getGeracaoAtual } from './pokemon.js';
import { lerDB, salvarDB, getGruposSpawn } from './pokemonDB.js';
import { iniciarRaids } from './pokemonRaid.js';
import { PREFIX } from '../config.js';
import { enviarBotoes, botaoLista } from './botoes.js';

export const gruposAtivos = new Set();
export function registrarGrupo(jid) {}

let currentClient = null;
let cronIniciado = false;

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

function gerarBotaoCaptura(nomePokemon) {
  const secoes = [
    {
      titulo: "🎒 𝙀𝙎𝘾𝙊𝙇𝙃𝘼 𝘼 𝙋𝙊𝙆𝙀́𝘽𝙊𝙇𝘼 ↴",
      linhas: [
        { titulo: "🔴 Pokébola Normal", descricao: "Tentar capturar com Pokébola", id: `${PREFIX}capturar ${nomePokemon} normal` },
        { titulo: "🔵 Great Ball", descricao: "Tentar capturar com Great Ball", id: `${PREFIX}capturar ${nomePokemon} great` },
        { titulo: "🟡 Ultra Ball", descricao: "Tentar capturar com Ultra Ball", id: `${PREFIX}capturar ${nomePokemon} ultra` },
        { titulo: "🟣 Master Ball", descricao: "Tentar capturar com Master Ball", id: `${PREFIX}capturar ${nomePokemon} master` }
      ]
    }
  ];
  return [ botaoLista('『 𝑪𝑨𝑷𝑻𝑼𝑹𝑨𝑹 』', secoes) ];
}

export function iniciarSpawn(client) {
  iniciarRaids(client);

  currentClient = client;
  if (cronIniciado) return;
  cronIniciado = true;

  console.log('[POKEMON] ⏱️ Cron Job de Spawn Automático iniciado (a cada 5 minutos).');

  cron.schedule('*/5 * * * *', async () => {
    try {
      const gruposAtivos = getGruposSpawn();
      if (gruposAtivos.length === 0) return;

      let db = lerDB();
      
      // Cria a estrutura de múltiplos spawns se não existir
      if (!db.spawnsAtivos) db.spawnsAtivos = {};

      // Compatibilidade com versão antiga (apenas um spawn)
      if (db.spawnAtual) {
        db.spawnsAtivos[db.spawnAtual.jid] = db.spawnAtual;
        delete db.spawnAtual;
      }

      const agora = Date.now();
      let salvou = false;

      // Vai passar por TODOS os grupos que ativaram o spawn
      for (const jid of gruposAtivos) {
        const spawnAtual = db.spawnsAtivos[jid];

        // Se já tem um Pokémon ativo no grupo
        if (spawnAtual) {
          if (agora > spawnAtual.expiraEm) {
            // Expirou, avisa que fugiu e apaga
            const velho = spawnAtual.pokemon;
            delete db.spawnsAtivos[jid];
            salvou = true;
            try {
              await currentClient.sendMessage(jid, { text: `💨 *${velho.emoji} ${velho.nome}* fugiu! Ninguém capturou a tempo.` });
            } catch (e) {}
          } else {
            // Ainda está ativo, não faz nada neste grupo
            continue;
          }
        }

        // Cria um novo Pokémon para este grupo
        const pokemon = sortearPokemon();
        const r = RARIDADES[pokemon.raridade];
        db.spawnsAtivos[jid] = { pokemon, expiraEm: Date.now() + 3 * 60 * 1000 };
        salvou = true;

        const texto = `⚡ *UM POKÉMON SELVAGEM APARECEU!* ⚡\n\n` +
          `📅 Geração de Hoje: *${getGeracaoAtual()}*\n\n` +
          `   ${pokemon.emoji} *${pokemon.nome}*\n` +
          `   ${r.emoji} Raridade: *${r.nome}* ${r.estrelas}\n` +
          `   ❤️ HP: ${pokemon.hp} | ⚔️ ATK: ${pokemon.atk}\n\n` +
          `⏰ Você tem *3 minutos* para capturar!\n` +
          `👇 Selecione a Pokébola no botão abaixo:`;

        const urlImagem = pokemon.img || pokemon.imagem || pokemon.gif || pokemon.url || (IMAGENS ? IMAGENS.spawn : null);
        let bufferImagem = null;

        if (urlImagem && typeof urlImagem === 'string' && urlImagem.startsWith('http')) {
          bufferImagem = await baixarImagem(urlImagem);
        }

        const botoes = gerarBotaoCaptura(pokemon.nome.toLowerCase());

        try {
          await enviarBotoes(currentClient, jid, {
            titulo: '⚡ Pokémon Selvagem',
            corpo: texto,
            rodape: '© Pikachu Bot',
            imagem: bufferImagem,
            botoes
          });
          console.log(`[POKEMON] ✅ Spawn enviado em ${jid}: ${pokemon.nome}`);
        } catch (err) {
          console.error(`[POKEMON] Erro ao enviar em ${jid}:`, err.message);
        }
      }

      if (salvou) salvarDB(db);

    } catch (error) {
      console.error('[POKEMON] ❌ Erro no loop do spawn:', error.message);
    }
  });
}

export async function forcarSpawn(client, jid) {
  const db = lerDB();
  if (!db.spawnsAtivos) db.spawnsAtivos = {};

  if (db.spawnsAtivos[jid] && Date.now() < db.spawnsAtivos[jid].expiraEm) return false;

  const pokemon = sortearPokemon();
  const r = RARIDADES[pokemon.raridade];
  db.spawnsAtivos[jid] = { pokemon, expiraEm: Date.now() + 3 * 60 * 1000 };
  salvarDB(db);

  const texto = `⚡ *SPAWN FORÇADO (TESTE)* ⚡\n\n` +
    `📅 Geração de Hoje: *${getGeracaoAtual()}*\n\n` +
    `   ${pokemon.emoji} *${pokemon.nome}*\n` +
    `   ${r.emoji} Raridade: *${r.nome}* ${r.estrelas}\n` +
    `   ❤️ HP: ${pokemon.hp} | ⚔️ ATK: ${pokemon.atk}\n\n` +
    `👇 Selecione a Pokébola no botão abaixo:`;

  const urlImagem = pokemon.img || pokemon.imagem || pokemon.gif || pokemon.url || (IMAGENS ? IMAGENS.spawn : null);
  let bufferImagem = null;

  if (urlImagem && typeof urlImagem === 'string' && urlImagem.startsWith('http')) {
    bufferImagem = await baixarImagem(urlImagem);
  }

  const botoes = gerarBotaoCaptura(pokemon.nome.toLowerCase());

  await enviarBotoes(client, jid, {
    titulo: '⚡ Spawn Forçado',
    corpo: texto,
    rodape: '© Pikachu Bot',
    imagem: bufferImagem,
    botoes
  });

  return true;
          }
