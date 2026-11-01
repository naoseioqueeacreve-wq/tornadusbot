import fs from 'node:fs';
import path from 'node:path';

const ARQUIVO = './src/database/akinator.json';

function garantir() {
  const dir = path.dirname(ARQUIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ARQUIVO)) {
    fs.writeFileSync(ARQUIVO, JSON.stringify({}, null, 2));
  }
}

function lerDB() {
  garantir();
  try {
    return JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
  } catch {
    return {};
  }
}

function salvarDB(dados) {
  garantir();
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
}

export function registrarVitoriaBot(jid, nome) {
  const db = lerDB();
  const num = jid.split('@')[0].split(':')[0];
  if (!db[num]) db[num] = { nome, vitoriasBot: 0, vitoriasJogador: 0 };
  db[num].nome = nome;
  db[num].vitoriasBot += 1;
  salvarDB(db);
}

export function registrarVitoriaJogador(jid, nome) {
  const db = lerDB();
  const num = jid.split('@')[0].split(':')[0];
  if (!db[num]) db[num] = { nome, vitoriasBot: 0, vitoriasJogador: 0 };
  db[num].nome = nome;
  db[num].vitoriasJogador += 1;
  salvarDB(db);
}

export function getRankingAkinator() {
  const db = lerDB();
  const lista = Object.keys(db).map(num => ({
    numero: num,
    nome: db[num].nome,
    vitoriasBot: db[num].vitoriasBot,
    vitoriasJogador: db[num].vitoriasJogador
  }));

  // Ordena por quem venceu o bot mais vezes
  lista.sort((a, b) => b.vitoriasJogador - a.vitoriasJogador);
  return lista;
}
