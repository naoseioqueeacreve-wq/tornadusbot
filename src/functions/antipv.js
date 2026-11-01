import fs from 'node:fs';
import path from 'node:path';

const ARQUIVO = './src/database/antipv.json';

const PADRAO = {
  ativo: false
};

function garantir() {
  const dir = path.dirname(ARQUIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, JSON.stringify(PADRAO, null, 2));
  }
}

export function lerDB() {
  garantir();
  try {
    const dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
    return { ...PADRAO, ...dados };
  } catch {
    return { ...PADRAO };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

// =========================================
// CONTROLE DO ANTI-PV
// =========================================
export function setAntiPV(status) {
  const db = lerDB();
  db.ativo = status === true;
  salvarDB(db);
  return db.ativo;
}

export function isAntiPVAtivo() {
  try {
    return lerDB().ativo === true;
  } catch {
    return false;
  }
}
