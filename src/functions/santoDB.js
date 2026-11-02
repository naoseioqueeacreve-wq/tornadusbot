import fs from 'node:fs';
import path from 'node:path';

const ARQUIVO = './src/database/santo_diario.json';

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

// Verifica se o usuário pode pegar o santo
export function verificarCooldownSanto(jid) {
  const db = lerDB();
  const numero = jid.split('@')[0].split(':')[0];
  const ultimoUso = db[numero];
  const agora = Date.now();
  const cooldown = 24 * 60 * 60 * 1000; // 24 horas

  if (ultimoUso && (agora - ultimoUso < cooldown)) {
    const restanteMs = cooldown - (agora - ultimoUso);
    const horas = Math.floor(restanteMs / (60 * 60 * 1000));
    const minutos = Math.floor((restanteMs % (60 * 60 * 1000)) / (60 * 1000));
    return { permitido: false, horas, minutos };
  }

  return { permitido: true };
}

// Registra que o usuário usou o comando
export function registrarUsoSanto(jid) {
  const db = lerDB();
  const numero = jid.split('@')[0].split(':')[0];
  db[numero] = Date.now();
  salvarDB(db);
}
