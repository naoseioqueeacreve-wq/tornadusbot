import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './database/levelDB.json';

// Lista dos 15 níveis (Títulos)
export const CARGOS_LEVEL = [
  "Noob", "Aprendiz", "Iniciante", "Curioso", "Participativo",
  "Ativo", "Experiente", "Veterano", "Elite", "Mestre",
  "Grão-Mestre", "Lenda", "Mítico", "Divino", "Deus do Grupo"
];

function loadDB() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ grupos: {}, usuarios: {} }, null, 2));
    return { grupos: {}, usuarios: {} };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Ativa/Desativa o sistema no grupo
export function toggleLevelMsg(jid, ativo) {
  const db = loadDB();
  if (!db.grupos[jid]) db.grupos[jid] = {};
  db.grupos[jid].levelAtivo = ativo;
  saveDB(db);
  return true;
}

export function isLevelAtivo(jid) {
  const db = loadDB();
  return db.grupos[jid]?.levelAtivo || false;
}

// Adiciona XP e verifica se subiu de nível
export function adicionarXPLevel(sender, jid, tipo) {
  const db = loadDB();
  if (!db.usuarios[sender]) db.usuarios[sender] = { xp: 0, nivel: 1 };

  const user = db.usuarios[sender];
  
  // Quantidade de XP por tipo de mensagem
  let xpGanho = 1; // Texto
  if (tipo === 'sticker') xpGanho = 2;
  if (tipo === 'image') xpGanho = 3;

  user.xp += xpGanho;

  // Fórmula para subir de nível: Nivel * 100 XP
  const xpNecessario = user.nivel * 100;
  let subiu = false;

  if (user.xp >= xpNecessario && user.nivel < 15) {
    user.xp -= xpNecessario;
    user.nivel += 1;
    subiu = true;
  }

  saveDB(db);
  return { subiu, nivel: user.nivel, cargo: CARGOS_LEVEL[user.nivel - 1] };
}

// Ver o nível de alguém
export function getLevelUser(sender) {
  const db = loadDB();
  if (!db.usuarios[sender]) return { xp: 0, nivel: 1, cargo: CARGOS_LEVEL[0] };
  const user = db.usuarios[sender];
  return { 
    xp: user.xp, 
    nivel: user.nivel, 
    cargo: CARGOS_LEVEL[user.nivel - 1],
    xpProximo: user.nivel * 100
  };
    }
