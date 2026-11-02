import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'database', 'gestao.json');
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
  } catch (e) { console.error('[GESTAO DB] Erro ao salvar:', e.message); }
}

function getGrupo(jid) {
  load();
  if (!cache[jid]) {
    cache[jid] = {
      atividade: { inicio: Date.now(), membros: {} },
      regras: { texto: '', auto: false }
    };
  }
  if (!cache[jid].atividade) cache[jid].atividade = { inicio: Date.now(), membros: {} };
  if (!cache[jid].regras) cache[jid].regras = { texto: '', auto: false };
  return cache[jid];
}

// --- ATIVIDADE ---
export function registrarAtividade(jid, num) {
  const g = getGrupo(jid);
  if (!g.atividade.membros[num]) g.atividade.membros[num] = { n: 0, ultima: null, desde: Date.now() };
  g.atividade.membros[num].n++;
  g.atividade.membros[num].ultima = Date.now();
  save();
}

export function registrarEntrada(jid, num) {
  const g = getGrupo(jid);
  if (!g.atividade.membros[num]) g.atividade.membros[num] = { n: 0, ultima: null, desde: Date.now() };
  g.atividade.membros[num].desde = Date.now();
  save();
}

export function getAtividade(jid) {
  return getGrupo(jid).atividade;
}

export function removerMembro(jid, ids) {
  const g = getGrupo(jid);
  for (const id of ids) {
    if (g.atividade.membros[id]) delete g.atividade.membros[id];
  }
  save();
}

// --- REGRAS ---
export function getRegras(jid) {
  return getGrupo(jid).regras;
}

export function setRegras(jid, texto, autor) {
  const g = getGrupo(jid);
  g.regras.texto = texto;
  g.regras.autor = autor;
  save();
}

export function delRegras(jid) {
  const g = getGrupo(jid);
  g.regras.texto = '';
  g.regras.auto = false;
  save();
}

export function setRegrasAuto(jid, bool) {
  const g = getGrupo(jid);
  g.regras.auto = bool;
  save();
}
// =========================================
// SISTEMA DE DADOS EXTRAS (Filtros, Despedida, etc)
// =========================================
export function getExtra(jid, chave, padrao = {}) {
  const g = getGrupo(jid);
  if (!g.extras) g.extras = {};
  if (!g.extras[chave]) {
    g.extras[chave] = JSON.parse(JSON.stringify(padrao)); // Cópia profunda
  }
  return JSON.parse(JSON.stringify(g.extras[chave])); // Retorna uma cópia para não mutar o cache sem salvar
}

export function setExtra(jid, chave, dados) {
  const g = getGrupo(jid);
  if (!g.extras) g.extras = {};
  g.extras[chave] = dados;
  save();
}
