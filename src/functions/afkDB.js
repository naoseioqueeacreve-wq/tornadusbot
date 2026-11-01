import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'database', 'afk.json');
let cache = null;

function extrairNumero(jid) {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0];
}

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_PATH)) {
      cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } else {
      cache = {};
    }
  } catch (e) {
    console.error('[AFK] Erro ao carregar DB:', e.message);
    cache = {};
  }
  return cache;
}

function save() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error('[AFK] Erro ao salvar DB:', e.message);
  }
}

export function setAFK(jid, motivo, jidAlt = null) {
  load();
  const data = {
    motivo: motivo?.trim() || 'Sem motivo informado',
    timestamp: Date.now()
  };
  
  cache[jid] = data;
  console.log(`[AFK-DEBUG] 💾 SALVOU AFK -> JID: ${jid}`);

  if (jidAlt && jidAlt !== jid) {
    cache[jidAlt] = data; 
    console.log(`[AFK-DEBUG] 💾 SALVOU AFK (ALT) -> JID: ${jidAlt}`);
  }

  save();
  return data;
}

export function getAFK(jid) {
  load();
  
  if (cache[jid]) return cache[jid];

  const numero = extrairNumero(jid);
  for (const key in cache) {
    if (extrairNumero(key) === numero && numero !== '') {
      return cache[key];
    }
  }
  return null;
}

export function removeAFK(jid) {
  load();
  let removido = false;

  const numeroBusca = extrairNumero(jid);
  
  for (const key in cache) {
    if (key === jid || (extrairNumero(key) === numeroBusca && numeroBusca !== '')) {
      delete cache[key];
      removido = true;
    }
  }

  if (removido) {
    save();
    console.log(`[AFK-DEBUG] 🗑️ REMOVEU AFK -> JID: ${jid}`);
  }
  return removido;
}

export function isAFK(jid) {
  return !!getAFK(jid);
}

export function listarAFK() {
  load();
  return Object.entries(cache).map(([jid, data]) => ({ jid, ...data }));
}

export function formatarTempoAFK(timestamp) {
  const diff = Date.now() - timestamp;
  const seg = Math.floor(diff / 1000);
  const min = Math.floor(seg / 60);
  const hrs = Math.floor(min / 60);
  const dias = Math.floor(hrs / 24);

  if (dias > 0) return `${dias}d ${hrs % 24}h`;
  if (hrs > 0) return `${hrs}h ${min % 60}min`;
  if (min > 0) return `${min}min ${seg % 60}s`;
  return `${seg}s`;
}
