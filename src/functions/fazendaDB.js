import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/fazendas.json';

const PADRAO = { fazendas: {} };

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
    return { fazendas: {} };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

export function getFazenda(userJid) {
  const db = lerDB();
  if (!db.fazendas[userJid]) {
    db.fazendas[userJid] = {
      tipo: null,           // 'pequena', 'media', etc.
      animais: [],          // [{ tipo: 'galinha', nome: 'X', compradoEm: Date }]
      melhorias: [],        // ['cerca', 'poco']
      ultimaColeta: Date.now(),
      producaoAcumulada: 0
    };
    salvarDB(db);
  }
  return db.fazendas[userJid];
}

export function salvarFazenda(userJid, dados) {
  const db = lerDB();
  db.fazendas[userJid] = dados;
  salvarDB(db);
}

// =========================================
// TIPOS DE FAZENDA
// =========================================
export const TIPOS_FAZENDA = {
  pequena:  { nome: 'Terreno Pequeno',  emoji: '🏡', preco: 5000,   capacidade: 3,  producaoBase: 1.0 },
  media:    { nome: 'Fazenda Média',    emoji: '🏠', preco: 15000,  capacidade: 6,  producaoBase: 1.5 },
  grande:   { nome: 'Fazenda Grande',   emoji: '🏘️', preco: 40000,  capacidade: 10, producaoBase: 2.0 },
  premium:  { nome: 'Fazenda Premium',  emoji: '🏛️', preco: 100000, capacidade: 15, producaoBase: 3.0 },
  mega:     { nome: 'Mega Fazenda',     emoji: '🌾', preco: 250000, capacidade: 25, producaoBase: 5.0 }
};

// =========================================
// ANIMAIS
// =========================================
export const ANIMAIS = {
  galinha: {
    nome: 'Galinha', emoji: '🐔', preco: 500,
    producao: 50,          // coins por hora
    produto: 'Ovos', produtoEmoji: '🥚'
  },
  pato: {
    nome: 'Pato', emoji: '🦆', preco: 700,
    producao: 65, produto: 'Ovos', produtoEmoji: '🥚'
  },
  porco: {
    nome: 'Porco', emoji: '🐷', preco: 1200,
    producao: 100, produto: 'Carne', produtoEmoji: '🥓'
  },
  ovelha: {
    nome: 'Ovelha', emoji: '🐑', preco: 1800,
    producao: 140, produto: 'Lã', produtoEmoji: '🧶'
  },
  cabra: {
    nome: 'Cabra', emoji: '🐐', preco: 2200,
    producao: 170, produto: 'Leite', produtoEmoji: '🥛'
  },
  vaca: {
    nome: 'Vaca', emoji: '🐮', preco: 3500,
    producao: 250, produto: 'Leite', produtoEmoji: '🥛'
  },
  cavalo: {
    nome: 'Cavalo', emoji: '🐴', preco: 5000,
    producao: 350, produto: 'Corrida', produtoEmoji: '🏇'
  },
  abelha: {
    nome: 'Abelha', emoji: '🐝', preco: 8000,
    producao: 600, produto: 'Mel', produtoEmoji: '🍯'
  }
};

// =========================================
// MELHORIAS
// =========================================
export const MELHORIAS = {
  cerca: {
    nome: 'Cerca Reforçada', emoji: '🚧', preco: 2000,
    descricao: '+10% de produção dos animais',
    bonus: 0.10
  },
  poco: {
    nome: 'Poço Artesiano', emoji: '💧', preco: 5000,
    descricao: '+15% de produção dos animais',
    bonus: 0.15
  },
  silo: {
    nome: 'Silo de Armazenamento', emoji: '🗼', preco: 10000,
    descricao: '+20% de produção dos animais',
    bonus: 0.20
  },
  celeiro: {
    nome: 'Celeiro Grande', emoji: '🏚️', preco: 25000,
    descricao: '+30% de produção dos animais',
    bonus: 0.30
  },
  trator: {
    nome: 'Trator Moderno', emoji: '🚜', preco: 50000,
    descricao: '+50% de produção dos animais',
    bonus: 0.50
  },
  irrigacao: {
    nome: 'Sistema de Irrigação', emoji: '💦', preco: 100000,
    descricao: '+100% de produção dos animais',
    bonus: 1.00
  }
};

// =========================================
// CALCULA A PRODUÇÃO TOTAL DA FAZENDA
// =========================================
export function calcularProducao(fazenda) {
  if (!fazenda.tipo) return 0;

  const tipo = TIPOS_FAZENDA[fazenda.tipo];
  if (!tipo) return 0;

  // Soma produção de todos os animais
  let producaoAnimais = 0;
  for (const animal of fazenda.animais) {
    const info = ANIMAIS[animal.tipo];
    if (info) producaoAnimais += info.producao;
  }

  // Multiplica pela produção base da fazenda
  let producaoTotal = producaoAnimais * tipo.producaoBase;

  // Aplica bônus das melhorias
  let bonusTotal = 0;
  for (const melhoria of fazenda.melhorias) {
    const info = MELHORIAS[melhoria];
    if (info) bonusTotal += info.bonus;
  }

  producaoTotal = producaoTotal * (1 + bonusTotal);

  // Retorna produção por hora
  return Math.floor(producaoTotal);
}

// =========================================
// CALCULA QUANTO TEMPO PASSOU DESDE A ÚLTIMA COLETA
// =========================================
export function calcularAcumulado(fazenda) {
  const agora = Date.now();
  const tempoPassado = agora - fazenda.ultimaColeta;
  const horasPassadas = tempoPassado / (60 * 60 * 1000); // em horas

  const producaoPorHora = calcularProducao(fazenda);
  const acumulado = Math.floor(producaoPorHora * horasPassadas);

  return acumulado;
}
