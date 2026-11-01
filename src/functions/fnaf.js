import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/fnaf.json';

const PADRAO = { partidas: {} };

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
    return { partidas: {} };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

// =========================================
// ANIMATRÔNICOS
// =========================================
export const ANIMATRONICOS = {
  freddy: {
    nome: 'Freddy Fazbear',
    emoji: '🐻',
    dificuldade: 0.3,
    cameraInicial: 1,
    foto: './src/assets/fnaf/freddy.jpg'
  },
  bonnie: {
    nome: 'Bonnie',
    emoji: '🐰',
    dificuldade: 0.5,
    cameraInicial: 2,
    foto: './src/assets/fnaf/bonnie.jpg'
  },
  chica: {
    nome: 'Chica',
    emoji: '🐔',
    dificuldade: 0.5,
    cameraInicial: 3,
    foto: './src/assets/fnaf/chica.jpg'
  },
  foxy: {
    nome: 'Foxy',
    emoji: '🦊',
    dificuldade: 0.6,
    cameraInicial: 4,
    foto: './src/assets/fnaf/foxy.jpg'
  },
  golden: {
    nome: 'Golden Freddy',
    emoji: '👻',
    dificuldade: 0.2,
    cameraInicial: 5,
    foto: './src/assets/fnaf/golden.jpg'
  }
};

// =========================================
// CÂMERAS
// =========================================
export const CAMERAS = {
  1: { nome: 'Show Stage',  emoji: '🎭', descricao: 'Palco principal' },
  2: { nome: 'Dining Area', emoji: '🍕', descricao: 'Área de refeições' },
  3: { nome: 'Pirate Cove', emoji: '🏴‍☠️', descricao: 'Cove do Foxy' },
  4: { nome: 'West Hall',   emoji: '🚪', descricao: 'Corredor Oeste' },
  5: { nome: 'East Hall',   emoji: '🚪', descricao: 'Corredor Leste' }
};

// =========================================
// CONFIGURAÇÕES DE ENERGIA
// =========================================
export const CONFIG_ENERGIA = {
  PORTA_POR_SEGUNDO:  0.15,
  LUZ_POR_SEGUNDO:    0.10,
  CAMERA_POR_SEGUNDO: 0.20,
  TEMPO_ATAQUE:       25
};

// =========================================
// TIMERS ATIVOS EM MEMÓRIA
// =========================================
export const timersAtivos = {};
export const tickTimersAtivos = {};
export const cameraTimers = {};

// =========================================
// INICIA PARTIDA
// =========================================
export function iniciarPartida(grupoJid, noite = 1) {
  const db = lerDB();

  db.partidas[grupoJid] = {
    ativo: true,
    noite,
    hora: 0,
    energia: 100,
    portas: { esquerda: false, direita: false },
    luz: false,
    animatronico: null,
    ataqueAtivo: false,
    ataqueCountdown: 0,
    cameraAtual: 1,
    cameraAberta: false,
    vencedores: []
  };

  salvarDB(db);
  return db.partidas[grupoJid];
}

// =========================================
// AVANÇA UMA HORA
// =========================================
export function avancarHora(grupoJid) {
  const db = lerDB();
  const partida = db.partidas[grupoJid];
  if (!partida || !partida.ativo) return null;

  partida.hora += 1;
  partida.energia -= 2 + Math.floor(Math.random() * 2);

  if (partida.energia <= 0) {
    partida.energia = 0;
    partida.ativo = false;
    salvarDB(db);
    return { derrota: true, motivo: 'energia', partida };
  }

  if (partida.hora >= 6) {
    partida.ativo = false;
    salvarDB(db);
    return { vitoria: true, noite: partida.noite };
  }

  salvarDB(db);
  return { continua: true, partida };
}

// =========================================
// FECHA/ABRE PORTA (escolhendo o lado)
// =========================================
export function togglePorta(grupoJid, lado) {
  const db = lerDB();
  const partida = db.partidas[grupoJid];
  if (!partida || !partida.ativo) return null;

  if (lado !== 'esquerda' && lado !== 'direita') return null;

  partida.portas[lado] = !partida.portas[lado];
  salvarDB(db);
  return partida;
}

// =========================================
// USA A LUZ
// =========================================
export function usarLuz(grupoJid) {
  const db = lerDB();
  const partida = db.partidas[grupoJid];
  if (!partida || !partida.ativo) return null;

  partida.luz = !partida.luz;
  salvarDB(db);
  return partida;
}

// =========================================
// ENCERRA A PARTIDA (limpa timers)
// =========================================
export function pararPartida(grupoJid) {
  const db = lerDB();
  delete db.partidas[grupoJid];
  salvarDB(db);

  if (timersAtivos[grupoJid]) {
    clearInterval(timersAtivos[grupoJid]);
    delete timersAtivos[grupoJid];
  }
  if (tickTimersAtivos[grupoJid]) {
    clearInterval(tickTimersAtivos[grupoJid]);
    delete tickTimersAtivos[grupoJid];
  }
  if (cameraTimers[grupoJid]) {
    clearTimeout(cameraTimers[grupoJid]);
    delete cameraTimers[grupoJid];
  }
}

// =========================================
// PEGA A PARTIDA
// =========================================
export function getPartida(grupoJid) {
  const db = lerDB();
  return db.partidas[grupoJid] || null;
}
