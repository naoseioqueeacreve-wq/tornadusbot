import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/parcerias.json';

const PADRAO = {
  grupos: {}  // { grupoJid: { modoAtivo: bool, parceiros: { userJid: { limite: number, usadoHoje: number, ultimoReset: number } } } }
};

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
    return { grupos: {} };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

// =========================================
// MODO PARCERIA
// =========================================
export function getModoParceria(grupoJid) {
  const db = lerDB();
  return db.grupos[grupoJid]?.modoAtivo === true;
}

export function setModoParceria(grupoJid, ativo) {
  const db = lerDB();
  if (!db.grupos[grupoJid]) {
    db.grupos[grupoJid] = { modoAtivo: false, parceiros: {} };
  }
  db.grupos[grupoJid].modoAtivo = ativo === true;
  salvarDB(db);
  return db.grupos[grupoJid].modoAtivo;
}

// =========================================
// PARCERIAS
// =========================================
export function adicionarParceria(grupoJid, userJid, limitePorDia) {
  const db = lerDB();
  if (!db.grupos[grupoJid]) {
    db.grupos[grupoJid] = { modoAtivo: false, parceiros: {} };
  }

  db.grupos[grupoJid].parceiros[userJid] = {
    limite: limitePorDia,
    usadoHoje: 0,
    ultimoReset: Date.now()
  };

  salvarDB(db);
  return db.grupos[grupoJid].parceiros[userJid];
}

export function removerParceria(grupoJid, userJid) {
  const db = lerDB();
  if (!db.grupos[grupoJid] || !db.grupos[grupoJid].parceiros[userJid]) return false;

  delete db.grupos[grupoJid].parceiros[userJid];
  salvarDB(db);
  return true;
}

export function getParceiro(grupoJid, userJid) {
  const db = lerDB();
  return db.grupos[grupoJid]?.parceiros[userJid] || null;
}

export function listarParceiros(grupoJid) {
  const db = lerDB();
  const parceiros = db.grupos[grupoJid]?.parceiros || {};

  // Reseta os contadores se passou 1 dia
  const agora = Date.now();
  let mudou = false;

  for (const jid in parceiros) {
    const p = parceiros[jid];
    if (agora - p.ultimoReset >= 24 * 60 * 60 * 1000) {
      p.usadoHoje = 0;
      p.ultimoReset = agora;
      mudou = true;
    }
  }

  if (mudou) salvarDB(db);

  return Object.entries(parceiros).map(([jid, dados]) => ({
    jid,
    limite: dados.limite,
    usadoHoje: dados.usadoHoje
  }));
}

// =========================================
// VERIFICA E CONTA PARCERIA
// =========================================
export function temParceriaAtiva(grupoJid, userJid) {
  const parceiro = getParceiro(grupoJid, userJid);
  if (!parceiro) return false;

  // Reseta se passou 1 dia
  const agora = Date.now();
  if (agora - parceiro.ultimoReset >= 24 * 60 * 60 * 1000) {
    parceiro.usadoHoje = 0;
    parceiro.ultimoReset = agora;

    const db = lerDB();
    db.grupos[grupoJid].parceiros[userJid] = parceiro;
    salvarDB(db);
  }

  return parceiro.usadoHoje < parceiro.limite;
}

export function usarParceria(grupoJid, userJid) {
  const db = lerDB();
  if (!db.grupos[grupoJid] || !db.grupos[grupoJid].parceiros[userJid]) return false;

  const p = db.grupos[grupoJid].parceiros[userJid];
  p.usadoHoje += 1;
  salvarDB(db);
  return true;
}
