import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/rpgAvancado.json';

const PADRAO = { usuarios: {} };

function garantir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(PADRAO, null, 2));
  }
}

export function lerDB() {
  garantir();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { usuarios: {} };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

export function getUsuario(userJid) {
  const db = lerDB();
  if (!db.usuarios[userJid]) {
    db.usuarios[userJid] = {
      caixas: 0,
      caixasLendarias: 0,
      explorando: false,
      ultimaExploracao: 0,
      monstrosDerrotados: 0,
      tesourosAchados: 0,
      arena: { vitorias: 0, derrotas: 0, sequencia: 0 },
      itensLoot: {},     // { espada: 2, pocao: 5 }
      totalLoot: 0
    };
    salvarDB(db);
  }
  return db.usuarios[userJid];
}

export function salvarUsuario(userJid, dados) {
  const db = lerDB();
  db.usuarios[userJid] = dados;
  salvarDB(db);
}

// =========================================
// EXPLORAÇÃO
// =========================================
export const REGIOES = {
  floresta: {
    nome: 'Floresta Sombria',
    emoji: '🌲',
    nivelMin: 1,
    recompensaMin: 500,
    recompensaMax: 3000,
    chanceMonstro: 0.3,
    chanceTesouro: 0.4,
    monstros: ['🐺 Lobo Selvagem', '🐻 Urso', '🦂 Escorpião', '🕷️ Aranha Gigante']
  },
  deserto: {
    nome: 'Deserto Escaldante',
    emoji: '🏜️',
    nivelMin: 3,
    recompensaMin: 2000,
    recompensaMax: 8000,
    chanceMonstro: 0.4,
    chanceTesouro: 0.35,
    monstros: ['🐍 Cobra', '🦂 Escorpião Rei', '🦎 Lagarto Gigante']
  },
  caverna: {
    nome: 'Caverna Profunda',
    emoji: '🕳️',
    nivelMin: 5,
    recompensaMin: 5000,
    recompensaMax: 20000,
    chanceMonstro: 0.5,
    chanceTesouro: 0.3,
    monstros: ['🦇 Morcego Gigante', '🐉 Dragão Bebê', '💀 Esqueleto']
  },
  vulcao: {
    nome: 'Vulcão',
    emoji: '🌋',
    nivelMin: 8,
    recompensaMin: 15000,
    recompensaMax: 60000,
    chanceMonstro: 0.55,
    chanceTesouro: 0.25,
    monstros: ['🔥 Elemental de Fogo', '🐲 Dragão', '👹 Demônio']
  },
  espaco: {
    nome: 'Espaço Sideral',
    emoji: '🌌',
    nivelMin: 12,
    recompensaMin: 40000,
    recompensaMax: 150000,
    chanceMonstro: 0.6,
    chanceTesouro: 0.2,
    monstros: ['👽 Alien', '🛸 Nave Hostil', '🌟 Devorador de Estrelas']
  }
};

// =========================================
// CAIXAS LOOT
// =========================================
export const ITENS_LOOT = {
  // Comuns
  pocao:      { nome: 'Poção de Vida',     emoji: '🧪', raridade: 'comum',    valor: 100 },
  moeda:      { nome: 'Moeda Antiga',       emoji: '🪙', raridade: 'comum',    valor: 250 },
  // Incomuns
  espada:     { nome: 'Espada de Ferro',    emoji: '⚔️', raridade: 'incomum',  valor: 1500 },
  escudo:     { nome: 'Escudo Reforçado',   emoji: '🛡️', raridade: 'incomum',  valor: 2000 },
  // Raros
  anel:       { nome: 'Anel Mágico',        emoji: '💍', raridade: 'raro',     valor: 8000 },
  grimorio:   { nome: 'Grimório Antigo',    emoji: '📕', raridade: 'raro',     valor: 12000 },
  // Épicos
  coroa:      { nome: 'Coroa Real',         emoji: '👑', raridade: 'epico',    valor: 35000 },
  amuleto:    { nome: 'Amuleto Lendário',   emoji: '🔮', raridade: 'epico',    valor: 50000 },
  // Lendário
  diamante:   { nome: 'Diamante Eterno',    emoji: '💎', raridade: 'lendario', valor: 200000 }
};

const PESOS_LOOT = {
  comum: 60,
  incomum: 25,
  raro: 10,
  epico: 4,
  lendario: 1
};

export function sortearItemLoot() {
  const roll = Math.random() * 100;
  let acumulado = 0;
  let raridadeEscolhida = 'comum';

  for (const [rar, peso] of Object.entries(PESOS_LOOT)) {
    acumulado += peso;
    if (roll <= acumulado) {
      raridadeEscolhida = rar;
      break;
    }
  }

  const candidatos = Object.entries(ITENS_LOOT).filter(([, i]) => i.raridade === raridadeEscolhida);
  const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)];
  return { chave: escolhido[0], ...escolhido[1] };
}
