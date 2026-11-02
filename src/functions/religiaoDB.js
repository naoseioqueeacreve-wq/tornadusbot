import fs from 'node:fs';
import path from 'node:path';

const ARQUIVO = './src/database/religiao.json';

function garantir() {
  const dir = path.dirname(ARQUIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, JSON.stringify({}, null, 2));
  }
}

function lerDB() {
  garantir();
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
  } catch {
    return {};
  }
}

function salvarDB(dados) {
  garantir();
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

export function setReligiao(jid, religiao) {
  const db = lerDB();
  const numero = jid.split('@')[0].split(':')[0];
  db[numero] = religiao;
  salvarDB(db);
}

export function getReligiao(jid) {
  const db = lerDB();
  const numero = jid.split('@')[0].split(':')[0];
  return db[numero] || null;
}
