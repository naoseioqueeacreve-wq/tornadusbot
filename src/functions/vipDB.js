import fs from 'node:fs';
import path from 'node:path';

const ARQUIVO = './src/database/vip.json';

const PADRAO = {
  users: {},
  commands: []
};

function garantir() {
  const dir = path.dirname(ARQUIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, JSON.stringify(PADRAO, null, 2));
  }
}

// 🔥 A MÁGICA ACONTECE AQUI: Remove tudo que não for número
function limparParaNumero(jid) {
  if (!jid) return '';
  return jid.replace(/\D/g, ''); 
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
// SISTEMA DE USUÁRIOS VIP
// =========================================
export function addVIP(jid, dias) {
  const db = lerDB();
  const numero = limparParaNumero(jid); // Salva apenas os números
  
  const agora = Date.now();
  let tempoAtual = agora;
  
  if (db.users[numero] && db.users[numero] > agora) {
    tempoAtual = db.users[numero];
  }

  db.users[numero] = tempoAtual + (dias * 24 * 60 * 60 * 1000);
  salvarDB(db);
  
  console.log(`[VIP] Adicionado número: ${numero} por ${dias} dias.`);
  return db.users[numero];
}

export function isVIP(jid) {
  const db = lerDB();
  const numero = limparParaNumero(jid); // Lê apenas os números
  const expiracao = db.users[numero];
  
  if (!expiracao) return false;
  
  if (Date.now() > expiracao) {
    delete db.users[numero];
    salvarDB(db);
    return false;
  }
  
  return true;
}

export function getVipExpiracao(jid) {
  const db = lerDB();
  const numero = limparParaNumero(jid);
  return db.users[numero] || 0;
}

// =========================================
// SISTEMA DE COMANDOS VIP
// =========================================
export function addVIPCommand(comando) {
  const db = lerDB();
  const cmd = comando.toLowerCase().replace(/[\/\!]/g, '').trim();
  
  if (!db.commands.includes(cmd)) {
    db.commands.push(cmd);
    salvarDB(db);
    return true;
  }
  return false;
}

export function removeVIPCommand(comando) {
  const db = lerDB();
  const cmd = comando.toLowerCase().replace(/[\/\!]/g, '').trim();
  const index = db.commands.indexOf(cmd);
  
  if (index !== -1) {
    db.commands.splice(index, 1);
    salvarDB(db);
    return true;
  }
  return false;
}

export function isVIPCommand(comando) {
  const db = lerDB();
  const cmd = comando.toLowerCase().replace(/[\/\!]/g, '').trim();
  return db.commands.includes(cmd);
}

export function getVIPCommands() {
  return lerDB().commands;
}
