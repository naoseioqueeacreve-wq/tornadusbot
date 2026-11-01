import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'database', 'autoFechar.json');
let cache = null;

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_PATH)) cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    else cache = {};
  } catch (e) { cache = {}; }
  return cache;
}

function save() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
  } catch (e) { console.error('[AUTOFECHAR DB] Erro ao salvar:', e.message); }
}

export function getConfig(jid) {
  load();
  if (!cache[jid]) {
    cache[jid] = { ativo: false, horaFechar: null, horaAbrir: null, ultimaAcao: null };
  }
  return cache[jid];
}

export function setAtivo(jid, bool) {
  const c = getConfig(jid);
  c.ativo = bool;
  save();
}

export function setHoraFechar(jid, hora) {
  const c = getConfig(jid);
  c.horaFechar = hora;
  save();
}

export function setHoraAbrir(jid, hora) {
  const c = getConfig(jid);
  c.horaAbrir = hora;
  save();
}

export function setUltimaAcao(jid, marca) {
  const c = getConfig(jid);
  c.ultimaAcao = marca;
  save();
}

export function listarGruposAtivos() {
  load();
  const ativos = [];
  for (const jid in cache) {
    if (cache[jid].ativo) ativos.push({ jid, ...cache[jid] });
  }
  return ativos;
}
