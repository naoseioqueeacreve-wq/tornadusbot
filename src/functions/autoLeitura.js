import fs from 'node:fs';
import path from 'node:path';

const ARQUIVO = './src/database/autoLeitura.json';
const MAX_REGISTROS = 500; // máximo de mensagens guardadas

const PADRAO = {
  ativo: false,
  ativadoPor: null,
  ativadoEm: 0,
  registros: []
};

function garantir() {
  const dir = path.dirname(ARQUIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, JSON.stringify(PADRAO, null, 2));
  }
}

function lerDB() {
  garantir();
  try {
    const dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
    return { ...PADRAO, ...dados };
  } catch {
    return { ...PADRAO };
  }
}

function salvarDB(dados) {
  garantir();
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

// =========================================
// ATIVAR / DESATIVAR
// =========================================
export function ativarAutoLeitura(quemAtivou) {
  const db = lerDB();
  db.ativo = true;
  db.ativadoPor = quemAtivou;
  db.ativadoEm = Date.now();
  salvarDB(db);
  return db;
}

export function desativarAutoLeitura() {
  const db = lerDB();
  db.ativo = false;
  salvarDB(db);
  return db;
}

export function estaAtiva() {
  try {
    return lerDB().ativo === true;
  } catch {
    return false;
  }
}

// =========================================
// REGISTRAR LEITURA
// =========================================
export function registrarLeitura({ tipo, autor, autorNumero, grupoNome, grupoJid, mensagem, isComando }) {
  if (!estaAtiva()) return false;

  try {
    const db = lerDB();

    const registro = {
      timestamp: Date.now(),
      tipo: tipo || 'MENSAGEM',
      autor: autor || 'Desconhecido',
      autorNumero: autorNumero || '-',
      grupoNome: grupoNome || 'Privado',
      grupoJid: grupoJid || '-',
      mensagem: (mensagem || '').substring(0, 500),
      isComando: !!isComando
    };

    db.registros.push(registro);

    // Limita a quantidade (mantém os mais recentes)
    if (db.registros.length > MAX_REGISTROS) {
      db.registros = db.registros.slice(-MAX_REGISTROS);
    }

    salvarDB(db);
    return true;
  } catch (e) {
    console.error('[AUTO-LEITURA] Erro ao registrar:', e.message);
    return false;
  }
}

// =========================================
// PEGAR REGISTROS
// =========================================
export function getRegistros(limite = 50) {
  const db = lerDB();
  return {
    ativo: db.ativo,
    ativadoPor: db.ativadoPor,
    ativadoEm: db.ativadoEm,
    total: db.registros.length,
    registros: db.registros.slice(-limite).reverse() // mais recentes primeiro
  };
}

// =========================================
// LIMPAR REGISTROS
// =========================================
export function limparRegistros() {
  const db = lerDB();
  db.registros = [];
  salvarDB(db);
  return true;
}

// =========================================
// STATUS
// =========================================
export function getStatus() {
  const db = lerDB();
  return {
    ativo: db.ativo,
    ativadoPor: db.ativadoPor,
    ativadoEm: db.ativadoEm,
    total: db.registros.length
  };
}
