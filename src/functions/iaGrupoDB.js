import fs from 'node:fs';
import path from 'node:path';

const ARQUIVO = './src/database/ia_grupos.json';

function garantir() {
  const dir = path.dirname(ARQUIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, JSON.stringify({}, null, 2));
  }
}

export function lerDB() {
  garantir();
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
  } catch {
    return {};
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

// =========================================
// CONTROLE DO MODO IA
// =========================================
export function setModoIAGrupo(grupoJid, modo) {
  const db = lerDB();
  if (modo === 0) {
    delete db[grupoJid]; // Desativa
  } else {
    db[grupoJid] = modo;
  }
  salvarDB(db);
  return modo;
}

export function getModoIAGrupo(grupoJid) {
  const db = lerDB();
  return db[grupoJid] || 0;
}
