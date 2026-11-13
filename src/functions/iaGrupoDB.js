import fs from 'node:fs';

const DB_PATH = './database/iaGrupo.json';
const GLOBAL_PATH = './database/iaGlobal.json';

// Garante que a pasta database exista
function ensureDirs() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true });
}

// --- NOME GLOBAL (DONO) ---
export function getNomePadraoGlobal() {
  ensureDirs();
  if (!fs.existsSync(GLOBAL_PATH)) return "Freddy";
  try {
    const data = JSON.parse(fs.readFileSync(GLOBAL_PATH, 'utf8'));
    return data.nome || "Freddy";
  } catch { return "Freddy"; }
}

export function setNomePadraoGlobal(nome) {
  ensureDirs();
  fs.writeFileSync(GLOBAL_PATH, JSON.stringify({ nome }, null, 2));
}

// --- BANCO DE DADOS DOS GRUPOS ---
function loadDB() {
  ensureDirs();
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ grupos: {} }, null, 2));
    return { grupos: {} };
  }
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch { return { grupos: {} }; }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function getConfigIAGrupo(jid) {
  const db = loadDB();
  const padrao = getNomePadraoGlobal();
  
  if (!db.grupos[jid]) {
    db.grupos[jid] = {
      modo: 0,
      nome: padrao,
      nomePersonalizado: false,
      personalidade: 'padrao',
      personalidadeCustom: ''
    };
    saveDB(db);
  } else if (!db.grupos[jid].nomePersonalizado) {
    // Se o dono mudou o nome global, atualiza nos grupos que usam o padrão
    if (db.grupos[jid].nome !== padrao) {
      db.grupos[jid].nome = padrao;
      saveDB(db);
    }
  }
  return db.grupos[jid];
}

export function setModoIAGrupo(jid, modo) {
  const db = loadDB();
  if (!db.grupos[jid]) getConfigIAGrupo(jid);
  db.grupos[jid].modo = modo;
  saveDB(db);
}

export function setNomeIAGrupo(jid, nome) {
  const db = loadDB();
  if (!db.grupos[jid]) getConfigIAGrupo(jid);
  if (nome) {
    db.grupos[jid].nome = nome;
    db.grupos[jid].personalidade = db.grupos[jid].personalidade || 'padrao';
    db.grupos[jid].nomePersonalizado = true;
  } else {
    db.grupos[jid].nome = getNomePadraoGlobal();
    db.grupos[jid].nomePersonalizado = false;
  }
  saveDB(db);
}

export function setPersonalidadeIAGrupo(jid, personalidade, customText = '') {
  const db = loadDB();
  if (!db.grupos[jid]) getConfigIAGrupo(jid);
  db.grupos[jid].personalidade = personalidade;
  db.grupos[jid].personalidadeCustom = customText;
  saveDB(db);
}
