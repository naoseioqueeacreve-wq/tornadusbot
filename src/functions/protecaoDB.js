import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'database', 'protecao.json');
export const TIPOS_MIDIA = ['figurinha', 'imagem', 'video', 'audio', 'documento', 'contato', 'localizacao'];

let cache = null;
const spamHistorico = {}; // Mantido em memória para ser rápido

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(DB_PATH)) {
      cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } else {
      cache = {};
    }
  } catch (e) { cache = {}; }
  return cache;
}

function save() {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2));
  } catch (e) { console.error('[PROTECAO DB] Erro ao salvar:', e.message); }
}

export function getProtecao(jid) {
  load();
  if (!cache[jid]) {
    cache[jid] = {
      antiSpam: { ativo: false, limite: 6, janela: 8, acao: 'avisar' },
      antiMidia: { figurinha: false, imagem: false, video: false, audio: false, documento: false, contato: false, localizacao: false },
      listaNegra: []
    };
  }
  // Garante que as propriedades existam caso o banco seja antigo
  if (!cache[jid].antiMidia) cache[jid].antiMidia = { figurinha: false, imagem: false, video: false, audio: false, documento: false, contato: false, localizacao: false };
  if (!cache[jid].listaNegra) cache[jid].listaNegra = [];
  return JSON.parse(JSON.stringify(cache[jid]));
}

export function salvarProtecao(jid, data) {
  load();
  cache[jid] = data;
  save();
}

export function registrarMensagemSpam(jid, sender, key, janela) {
  const id = `${jid}_${sender}`;
  const agora = Date.now();
  if (!spamHistorico[id]) spamHistorico[id] = [];
  
  spamHistorico[id] = spamHistorico[id].filter(m => agora - m.time < janela * 1000);
  spamHistorico[id].push({ time: agora, key });
  
  return spamHistorico[id];
}

export function resetarHistoricoSpam(jid, sender) {
  const id = `${jid}_${sender}`;
  delete spamHistorico[id];
}
// Antes:
// function desembrulhar(m) {

// Depois (adicione o export):
export function desembrulhar(m) {
  let atual = m || {};
  for (let i = 0; i < 4; i++) {
    const interno =
      atual.ephemeralMessage?.message ||
      atual.viewOnceMessage?.message ||
      atual.viewOnceMessageV2?.message ||
      atual.viewOnceMessageV2Extension?.message ||
      atual.documentWithCaptionMessage?.message;
    if (!interno) break;
    atual = interno;
  }
  return atual;
}
