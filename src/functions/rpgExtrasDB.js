import fs from 'node:fs';
import path from 'node:path';

const DB_PESCA = './src/database/pesca.json';
const DB_CLAS = './src/database/clas.json';
const DB_CASAMENTO = './src/database/casamentos.json';

function garantirArquivo(caminho, padrao) {
  const dir = path.dirname(caminho);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(caminho)) {
    fs.writeFileSync(caminho, JSON.stringify(padrao, null, 2));
  }
}

function ler(caminho, padrao) {
  garantirArquivo(caminho, padrao);
  try {
    return JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  } catch {
    return padrao;
  }
}

function salvar(caminho, dados) {
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

// =========================================
// PESCA
// =========================================
export const PEIXES = {
  sardinha:   { nome: 'Sardinha',    emoji: '🐟', preco: 100,    raridade: 'comum',      chance: 40 },
  tilapia:    { nome: 'Tilápia',     emoji: '🐟', preco: 250,    raridade: 'comum',      chance: 25 },
  bagre:      { nome: 'Bagre',       emoji: '🐡', preco: 500,    raridade: 'incomum',    chance: 15 },
  dourado:    { nome: 'Dourado',     emoji: '🐠', preco: 1200,   raridade: 'incomum',    chance: 8 },
  salmao:     { nome: 'Salmão',      emoji: '🐟', preco: 2500,   raridade: 'raro',       chance: 5 },
  atum:       { nome: 'Atum',        emoji: '🐟', preco: 5000,   raridade: 'raro',       chance: 3 },
  pirarucu:   { nome: 'Pirarucu',    emoji: '🐡', preco: 12000,  raridade: 'epico',      chance: 2 },
  tubarao:    { nome: 'Tubarão',     emoji: '🦈', preco: 30000,  raridade: 'epico',      chance: 1 },
  peixe_anjo: { nome: 'Peixe Anjo',  emoji: '🐠', preco: 60000,  raridade: 'lendario',   chance: 0.7 },
  lula:       { nome: 'Lula Gigante',emoji: '🦑', preco: 150000, raridade: 'lendario',   chance: 0.3 },
  bota:       { nome: 'Bota Velha',  emoji: '🥾', preco: 0,      raridade: 'lixo',       chance: 0 },
  peixe_dourado: { nome: 'Peixe Dourado Lendário', emoji: '🐡', preco: 500000, raridade: 'mitico', chance: 0 }
};

export function getPesca(userJid) {
  const db = ler(DB_PESCA, { usuarios: {} });
  if (!db.usuarios[userJid]) {
    db.usuarios[userJid] = {
      aquario: [],
      totalPescado: 0,
      recorde: null,
      varas: 1,
      iscas: 0,
      ultimaPesca: 0
    };
    salvar(DB_PESCA, db);
  }
  return db.usuarios[userJid];
}

export function salvarPesca(userJid, dados) {
  const db = ler(DB_PESCA, { usuarios: {} });
  db.usuarios[userJid] = dados;
  salvar(DB_PESCA, db);
}

export function sortearPeixe() {
  // Se tiver chance, sorteia o peixe
  const roll = Math.random() * 100;
  let acumulado = 0;

  const peixes = Object.entries(PEIXES).filter(([k, p]) => p.chance > 0);

  for (const [chave, p] of peixes) {
    acumulado += p.chance;
    if (roll <= acumulado) return { chave, ...p };
  }

  return { chave: 'sardinha', ...PEIXES.sardinha };
}

// =========================================
// CLÃS
// =========================================
export function getClas() {
  return ler(DB_CLAS, { clas: {} });
}

export function salvarClas(dados) {
  salvar(DB_CLAS, dados);
}

export function getClaDoUsuario(userJid) {
  const db = getClas();
  for (const [nome, cla] of Object.entries(db.clas)) {
    if (cla.membros.includes(userJid)) return { nome, ...cla };
  }
  return null;
}

export function criarCla(nome, lider, emblema) {
  const db = getClas();
  if (db.clas[nome]) return false;

  db.clas[nome] = {
    lider,
    emblema,
    membros: [lider],
    banco: 0,
    nivel: 1,
    xp: 0,
    criadoEm: Date.now(),
    vitorias: 0,
    derrotas: 0
  };
  salvarClas(db);
  return true;
}

export function entrarCla(nomeCla, userJid) {
  const db = getClas();
  if (!db.clas[nomeCla]) return false;
  if (db.clas[nomeCla].membros.length >= 20) return 'cheio';
  if (db.clas[nomeCla].membros.includes(userJid)) return 'membro';

  db.clas[nomeCla].membros.push(userJid);
  salvarClas(db);
  return true;
}

export function sairCla(nomeCla, userJid) {
  const db = getClas();
  if (!db.clas[nomeCla]) return false;

  db.clas[nomeCla].membros = db.clas[nomeCla].membros.filter(m => m !== userJid);

  if (db.clas[nomeCla].membros.length === 0) {
    delete db.clas[nomeCla];
  } else if (db.clas[nomeCla].lider === userJid) {
    db.clas[nomeCla].lider = db.clas[nomeCla].membros[0];
  }

  salvarClas(db);
  return true;
}

export function listarClas() {
  const db = getClas();
  return Object.entries(db.clas).map(([nome, c]) => ({ nome, ...c }));
}

// =========================================
// CASAMENTO
// =========================================
export function getCasamentos() {
  return ler(DB_CASAMENTO, { casais: [] });
}

export function salvarCasamentos(dados) {
  salvar(DB_CASAMENTO, dados);
}

export function casar(user1, user2) {
  const db = getCasamentos();
  const existe1 = db.casais.find(c => c.user1 === user1 || c.user2 === user1);
  const existe2 = db.casais.find(c => c.user1 === user2 || c.user2 === user2);

  if (existe1) return 'ja_casado_user1';
  if (existe2) return 'ja_casado_user2';

  db.casais.push({
    user1,
    user2,
    casadoEm: Date.now(),
    aniversario: Date.now(),
    totalPresentes: 0
  });
  salvarCasamentos(db);
  return true;
}

export function divorciar(userJid) {
  const db = getCasamentos();
  const index = db.casais.findIndex(c => c.user1 === userJid || c.user2 === userJid);
  if (index === -1) return false;

  db.casais.splice(index, 1);
  salvarCasamentos(db);
  return true;
}

export function getCasamento(userJid) {
  const db = getCasamentos();
  return db.casais.find(c => c.user1 === userJid || c.user2 === userJid) || null;
}

export function getParceiro(userJid) {
  const casamento = getCasamento(userJid);
  if (!casamento) return null;
  return casamento.user1 === userJid ? casamento.user2 : casamento.user1;
}
