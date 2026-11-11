import fs from 'node:fs';

const DB_PATH = './database/customCommands.json';

function loadDB() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}), 'utf8');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch { 
    return {}; 
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// Adiciona ou atualiza um comando
export function addCustomCommand(name, response) {
  const db = loadDB();
  db[name.toLowerCase()] = response;
  saveDB(db);
  return true;
}

// Remove um comando
export function removeCustomCommand(name) {
  const db = loadDB();
  if (db[name.toLowerCase()]) {
    delete db[name.toLowerCase()];
    saveDB(db);
    return true;
  }
  return false;
}

// Pega a resposta do comando
export function getCustomCommand(name) {
  const db = loadDB();
  return db[name.toLowerCase()] || null;
}

// Lista todos os comandos criados
export function listCustomCommands() {
  const db = loadDB();
  return Object.keys(db);
}
