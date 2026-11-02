import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/rpg.json';

function garantirDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ usuarios: {} }, null, 2));
  }
}

export function lerDB() {
  garantirDB();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { usuarios: {} };
  }
}

export function salvarDB(dados) {
  garantirDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

// =========================================
// PEGA / CRIA USUÁRIO
// =========================================
export function getUsuario(sender) {
  const db = lerDB();
  if (!db.usuarios[sender]) {
    db.usuarios[sender] = {
      coins: 500,
      banco: 0,
      casa: 'barraco',
      pets: [],
      petAtivo: null,
      nivelEmprego: 1,
      trabalhosFeitos: 0,
      ultimoSalario: 0,
      ultimoDaily: 0,
      ultimoRoubo: 0,
      investimentos: 0,
      vitoriasPet: 0,
      derrotasPet: 0,
      dados: { mensagens: 0, comandos: 0, figurinhas: 0 }
    };
    salvarDB(db);
  }

  const u = db.usuarios[sender];
  let mudou = false;
  if (u.nivelEmprego === undefined) { u.nivelEmprego = 1; mudou = true; }
  if (u.trabalhosFeitos === undefined) { u.trabalhosFeitos = 0; mudou = true; }
  if (u.dados === undefined) { u.dados = { mensagens: 0, comandos: 0, figurinhas: 0 }; mudou = true; }
  if (mudou) salvarDB(db);

  return u;
}

export function salvarUsuario(sender, dados) {
  const db = lerDB();
  db.usuarios[sender] = dados;
  salvarDB(db);
}

// =========================================
// 🔥 TRANSFERÊNCIA DE COINS (PIX) - SEM PERDER DADOS
// =========================================
export function transferirCoins(deJid, paraJid, valor) {
  const db = lerDB();

  // Garante que o remetente existe
  if (!db.usuarios[deJid]) {
    db.usuarios[deJid] = {
      coins: 500, banco: 0, casa: 'barraco',
      pets: [], petAtivo: null, nivelEmprego: 1,
      trabalhosFeitos: 0, ultimoSalario: 0,
      ultimoDaily: 0, ultimoRoubo: 0,
      vitoriasPet: 0, derrotasPet: 0,
      dados: { mensagens: 0, comandos: 0, figurinhas: 0 }
    };
  }

  // Garante que o destinatário existe
  if (!db.usuarios[paraJid]) {
    db.usuarios[paraJid] = {
      coins: 500, banco: 0, casa: 'barraco',
      pets: [], petAtivo: null, nivelEmprego: 1,
      trabalhosFeitos: 0, ultimoSalario: 0,
      ultimoDaily: 0, ultimoRoubo: 0,
      vitoriasPet: 0, derrotasPet: 0,
      dados: { mensagens: 0, comandos: 0, figurinhas: 0 }
    };
  }

  const saldoDe = db.usuarios[deJid].coins;

  if (saldoDe < valor) {
    return { ok: false, motivo: 'SALDO_INSUFICIENTE', saldo: saldoDe };
  }

  // 💸 Transfere no MESMO objeto
  db.usuarios[deJid].coins -= valor;
  db.usuarios[paraJid].coins += valor;

  // 💾 Salva TUDO de uma vez (evita perder dados)
  salvarDB(db);

  return {
    ok: true,
    saldoDe: db.usuarios[deJid].coins,
    saldoPara: db.usuarios[paraJid].coins
  };
}

// =========================================
// BÔNUS DIÁRIO (125 coins)
// =========================================
export function verificarBonusDiario(sender) {
  const user = getUsuario(sender);
  const agora = Date.now();
  const umDia = 24 * 60 * 60 * 1000;

  if (agora - (user.ultimoDaily || 0) >= umDia) {
    user.coins += 125;
    user.ultimoDaily = agora;
    salvarUsuario(sender, user);
    return { recebeu: true, coins: user.coins };
  }

  return { recebeu: false };
}

// =========================================
// CONTADORES DE DADOS
// =========================================
export function incrementarMensagem(sender) {
  const db = lerDB();
  if (!db.usuarios[sender]) getUsuario(sender);
  const db2 = lerDB();
  if (!db2.usuarios[sender].dados) {
    db2.usuarios[sender].dados = { mensagens: 0, comandos: 0, figurinhas: 0 };
  }
  db2.usuarios[sender].dados.mensagens += 1;
  salvarDB(db2);
}

export function incrementarComando(sender) {
  const db = lerDB();
  if (!db.usuarios[sender]) getUsuario(sender);
  const db2 = lerDB();
  if (!db2.usuarios[sender].dados) {
    db2.usuarios[sender].dados = { mensagens: 0, comandos: 0, figurinhas: 0 };
  }
  db2.usuarios[sender].dados.comandos += 1;
  salvarDB(db2);
}

export function incrementarFigurinha(sender) {
  const db = lerDB();
  if (!db.usuarios[sender]) getUsuario(sender);
  const db2 = lerDB();
  if (!db2.usuarios[sender].dados) {
    db2.usuarios[sender].dados = { mensagens: 0, comandos: 0, figurinhas: 0 };
  }
  db2.usuarios[sender].dados.figurinhas += 1;
  salvarDB(db2);
}

export function garantirDados(sender) {
  const db = lerDB();
  if (!db.usuarios[sender]) getUsuario(sender);
  const db2 = lerDB();
  if (!db2.usuarios[sender].dados) {
    db2.usuarios[sender].dados = { mensagens: 0, comandos: 0, figurinhas: 0 };
    salvarDB(db2);
  }
  return db2.usuarios[sender].dados;
}
