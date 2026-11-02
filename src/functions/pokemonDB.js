import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/pokemon.json';

function garantirDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({
      usuarios: {},
      spawnAtual: null,
      spawnGrupos: [] // grupos onde o spawn está ligado
    }, null, 2));
  }
}

export function lerDB() {
  garantirDB();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { usuarios: {}, spawnAtual: null, spawnGrupos: [] };
  }
}

export function salvarDB(dados) {
  garantirDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

export function getUsuario(sender) {
  const db = lerDB();
  let modificou = false;

  if (!db.usuarios[sender]) {
    db.usuarios[sender] = {
      pokecoins: 500, // Moeda exclusiva do Pokémon
      pokemons: [],
      pokebolas: { normal: 5, great: 0, ultra: 0, master: 0 },
      itens: {},
      pokemonAtivo: null,
      nivel: 1, // Sistema de Level
      xp: 0     // XP para o próximo nível
    };
    modificou = true;
  }

  // --- MIGRAÇÃO DE CONTAS ANTIGAS ---
  // Se o usuário já existia mas não tinha level ou xp, adiciona agora
  if (db.usuarios[sender].nivel === undefined) {
    db.usuarios[sender].nivel = 1;
    modificou = true;
  }
  if (db.usuarios[sender].xp === undefined) {
    db.usuarios[sender].xp = 0;
    modificou = true;
  }
  // Garante que o pokecoins exista (caso ele usasse o outro sistema)
  if (db.usuarios[sender].pokecoins === undefined) {
    db.usuarios[sender].pokecoins = 500;
    modificou = true;
  }

  if (modificou) salvarDB(db);
  
  return db.usuarios[sender];
}

export function salvarUsuario(sender, dados) {
  const db = lerDB();
  db.usuarios[sender] = dados;
  salvarDB(db);
}

// =========================================
// SPAWN POR GRUPO
// Cada grupo liga/desliga o próprio spawn. A lista fica salva em
// db.spawnGrupos, então continua valendo depois de reiniciar o bot.
// (A chave global antiga "spawnAtivo" não é mais usada.)
// =========================================

// Lista (cópia) dos grupos com spawn ligado
export function getGruposSpawn() {
  const lista = lerDB().spawnGrupos;
  return Array.isArray(lista) ? [...lista] : [];
}

// O spawn está ligado nesse grupo?
export function spawnAtivoNoGrupo(jid) {
  return getGruposSpawn().includes(jid);
}

// Liga/desliga o spawn SÓ no grupo informado.
// Retorna true se mudou algo, ou false se já estava assim.
export function setSpawnGrupo(jid, ativo) {
  if (!jid) return false;

  const db = lerDB();
  const lista = Array.isArray(db.spawnGrupos) ? db.spawnGrupos : [];
  const estavaAtivo = lista.includes(jid);
  if (!!ativo === estavaAtivo) return false;

  db.spawnGrupos = ativo ? [...lista, jid] : lista.filter(g => g !== jid);

  // Ao desligar, cancela o Pokémon que estiver aparecendo nesse grupo
  if (!ativo && db.spawnAtual?.jid === jid) db.spawnAtual = null;

  salvarDB(db);
  return true;
}

// --- Compatibilidade com o código antigo ---
// Com JID: consulta só aquele grupo. Sem JID: true se algum grupo tem spawn.
export function getSpawnAtivo(jid) {
  return jid ? spawnAtivoNoGrupo(jid) : getGruposSpawn().length > 0;
}

// Exige o JID do grupo (nunca liga/desliga "em todos" por engano)
export function setSpawnAtivo(valor, jid) {
  if (!jid) {
    console.warn('[POKEMON] setSpawnAtivo precisa do JID do grupo. Use setSpawnGrupo(jid, ativo).');
    return false;
  }
  return setSpawnGrupo(jid, !!valor);
}
