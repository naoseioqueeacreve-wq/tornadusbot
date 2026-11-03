import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/adminsys.json';

const PADRAO = { grupos: {} };

function garantir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(PADRAO, null, 2));
  }
}

export function lerDB() {
  garantir();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { grupos: {} };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

export function getGrupo(grupoJid) {
  const db = lerDB();
  if (!db.grupos[grupoJid]) {
    db.grupos[grupoJid] = {
      antiPalavrao: false,
      palavrasProibidas: [],
      bemVindo: false,
      legendaBV: 'Bem-vindo(a) {nome} ao grupo {grupo}! 🎉',
      fotoBV: null,
      botSoAdmins: false,
      antiFake: false,
      mutados: {},
      warns: {}   // { userJid: [{ motivo, por, em }] }
    };
    salvarDB(db);
  }
  // Garantir campos novos em grupos antigos
  if (!db.grupos[grupoJid].warns) {
    db.grupos[grupoJid].warns = {};
    salvarDB(db);
  }
  return db.grupos[grupoJid];
}

export function salvarGrupo(grupoJid, dados) {
  const db = lerDB();
  db.grupos[grupoJid] = dados;
  salvarDB(db);
}

// =========================================
// ANTI-PALAVRÃO
// =========================================
export function setAntiPalavrao(grupoJid, ativo) {
  const g = getGrupo(grupoJid);
  g.antiPalavrao = ativo;
  salvarGrupo(grupoJid, g);
}

export function addPalavra(grupoJid, palavra) {
  const g = getGrupo(grupoJid);
  const palavraLimpa = palavra.toLowerCase().trim();
  if (!g.palavrasProibidas.includes(palavraLimpa)) {
    g.palavrasProibidas.push(palavraLimpa);
    salvarGrupo(grupoJid, g);
    return true;
  }
  return false;
}

export function delPalavra(grupoJid, palavra) {
  const g = getGrupo(grupoJid);
  const palavraLimpa = palavra.toLowerCase().trim();
  const index = g.palavrasProibidas.indexOf(palavraLimpa);
  if (index !== -1) {
    g.palavrasProibidas.splice(index, 1);
    salvarGrupo(grupoJid, g);
    return true;
  }
  return false;
}

// =========================================
// BEM-VINDO
// =========================================
export function setBemVindo(grupoJid, ativo) {
  const g = getGrupo(grupoJid);
  g.bemVindo = ativo;
  salvarGrupo(grupoJid, g);
}

export function setLegendaBV(grupoJid, texto) {
  const g = getGrupo(grupoJid);
  g.legendaBV = texto;
  salvarGrupo(grupoJid, g);
}

export function setFotoBV(grupoJid, caminho) {
  const g = getGrupo(grupoJid);
  g.fotoBV = caminho;
  salvarGrupo(grupoJid, g);
}

// =========================================
// BOT SÓ ADMINS
// =========================================
export function setBotSoAdmins(grupoJid, ativo) {
  const g = getGrupo(grupoJid);
  g.botSoAdmins = ativo;
  salvarGrupo(grupoJid, g);
}

// =========================================
// ANTI-FAKE
// =========================================
export function setAntiFake(grupoJid, ativo) {
  const g = getGrupo(grupoJid);
  g.antiFake = ativo;
  salvarGrupo(grupoJid, g);
}

// =========================================
// MUTE
// =========================================
export function mutarUsuario(grupoJid, userJid) {
  const g = getGrupo(grupoJid);
  g.mutados[userJid] = { mutadoEm: Date.now() };
  salvarGrupo(grupoJid, g);
}

export function desmutarUsuario(grupoJid, userJid) {
  const g = getGrupo(grupoJid);
  delete g.mutados[userJid];
  salvarGrupo(grupoJid, g);
}

export function estaMutado(grupoJid, userJid) {
  const g = getGrupo(grupoJid);
  return !!g.mutados[userJid];
}

// =========================================
// ADVERTÊNCIAS (WARNS)
// =========================================
export function adicionarWarn(grupoJid, userJid, motivo, por) {
  const g = getGrupo(grupoJid);
  if (!g.warns[userJid]) g.warns[userJid] = [];

  g.warns[userJid].push({
    motivo: motivo || 'Sem motivo informado',
    por: por || 'Admin',
    em: Date.now()
  });

  salvarGrupo(grupoJid, g);
  return g.warns[userJid].length;
}

export function removerWarn(grupoJid, userJid) {
  const g = getGrupo(grupoJid);
  if (!g.warns[userJid] || g.warns[userJid].length === 0) return 0;

  g.warns[userJid].pop();

  if (g.warns[userJid].length === 0) {
    delete g.warns[userJid];
  }

  salvarGrupo(grupoJid, g);
  return g.warns[userJid]?.length || 0;
}

export function limparWarns(grupoJid, userJid) {
  const g = getGrupo(grupoJid);
  if (!g.warns[userJid]) return false;
  delete g.warns[userJid];
  salvarGrupo(grupoJid, g);
  return true;
}

export function getWarns(grupoJid, userJid) {
  const g = getGrupo(grupoJid);
  return g.warns[userJid] || [];
}

export function listarWarns(grupoJid) {
  const g = getGrupo(grupoJid);
  return Object.entries(g.warns).map(([jid, warns]) => ({
    jid,
    quantidade: warns.length,
    warns
  }));
}
// =========================================
// FUNÇÃO: SET ANTI-BOT
// =========================================
export function setAntiBot(jid, ativo) {
  // ATENÇÃO: Se no seu arquivo a função de ler for "loadDB" ou "readDB", troque aqui.
  // Geralmente se chama "lerDB".
  const db = lerDB(); 
  
  if (!db.grupos) db.grupos = {};
  if (!db.grupos[jid]) db.grupos[jid] = {};
  
  // Atualiza a configuração
  db.grupos[jid].antiBot = ativo;
  
  // ATENÇÃO: Se a função de salvar for "saveDB", troque aqui.
  salvarDB(db); 
  
  return true;
}
