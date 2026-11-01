import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/extras.json';

const PADRAO = { usuarios: {} };

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
    return { usuarios: {} };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

export function getUsuario(userJid) {
  const db = lerDB();
  if (!db.usuarios[userJid]) {
    db.usuarios[userJid] = {
      xp: 0,
      nivel: 1,
      totalComandos: 0,
      buffs: {
        sorte: 0,       // timestamp até quando dura
        riqueza: 0,
        protecao: 0,
        energia: 0
      },
      emprestimo: {
        valor: 0,
        juros: 0,
        expiraEm: 0,
        ativo: false
      }
    };
    salvarDB(db);
  }
  return db.usuarios[userJid];
}

export function salvarUsuario(userJid, dados) {
  const db = lerDB();
  db.usuarios[userJid] = dados;
  salvarDB(db);
}

// =========================================
// XP E NÍVEL
// =========================================
export function xpNecessario(nivel) {
  return Math.floor(100 * Math.pow(1.15, nivel - 1));
}

export function adicionarXP(userJid, quantidade) {
  const user = getUsuario(userJid);
  user.xp += quantidade;
  user.totalComandos += 1;

  let subiuNivel = false;
  while (user.xp >= xpNecessario(user.nivel)) {
    user.xp -= xpNecessario(user.nivel);
    user.nivel += 1;
    subiuNivel = true;
  }

  salvarUsuario(userJid, user);
  return { subiuNivel, nivelAtual: user.nivel, xpAtual: user.xp };
}

// Multiplicador de coins baseado no nível
export function multiplicadorNivel(nivel) {
  return 1 + ((nivel - 1) * 0.05); // +5% por nível
}

// =========================================
// POÇÕES
// =========================================
export const POCOES = {
  sorte: {
    nome: 'Poção da Sorte',
    emoji: '🍀',
    preco: 5000,
    duracao: 30 * 60 * 1000, // 30 min
    descricao: '+20% de chance em jogos de azar',
    efeito: 'Sorte em roleta, dados e crimes'
  },
  riqueza: {
    nome: 'Poção da Riqueza',
    emoji: '💰',
    preco: 10000,
    duracao: 15 * 60 * 1000,
    descricao: 'Dobra os ganhos no próximo trabalho',
    efeito: 'x2 coins no próximo !trabalhar'
  },
  protecao: {
    nome: 'Poção de Proteção',
    emoji: '🛡️',
    preco: 8000,
    duracao: 60 * 60 * 1000, // 1 hora
    descricao: 'Bloqueia o próximo roubo',
    efeito: 'Imune a roubos por 1h'
  },
  energia: {
    nome: 'Poção de Energia',
    emoji: '⚡',
    preco: 3000,
    duracao: 5 * 60 * 1000,
    descricao: 'Remove cooldowns instantaneamente',
    efeito: 'Reseta cooldowns de trabalhar/pescar'
  }
};

export function comprarPocao(userJid, tipo) {
  const user = getUsuario(userJid);
  const pocao = POCOES[tipo];
  if (!pocao) return { ok: false, motivo: 'Poção inválida' };

  user.buffs[tipo] = Date.now() + pocao.duracao;
  salvarUsuario(userJid, user);
  return { ok: true, pocao };
}

export function temBuffAtivo(userJid, tipo) {
  const user = getUsuario(userJid);
  return user.buffs[tipo] && user.buffs[tipo] > Date.now();
}

// =========================================
// EMPRÉSTIMO
// =========================================
export function emprestar(userJid, valor) {
  const user = getUsuario(userJid);

  if (user.emprestimo.ativo) return { ok: false, motivo: 'Você já tem um empréstimo ativo' };

  const JUROS = 0.15; // 15%
  const PRAZO = 24 * 60 * 60 * 1000; // 24h

  user.emprestimo = {
    valor,
    juros: Math.floor(valor * JUROS),
    expiraEm: Date.now() + PRAZO,
    ativo: true
  };

  salvarUsuario(userJid, user);
  return {
    ok: true,
    valor,
    juros: user.emprestimo.juros,
    total: valor + user.emprestimo.juros,
    expiraEm: user.emprestimo.expiraEm
  };
}

export function pagarEmprestimo(userJid) {
  const user = getUsuario(userJid);
  if (!user.emprestimo.ativo) return { ok: false, motivo: 'Sem empréstimo ativo' };

  const total = user.emprestimo.valor + user.emprestimo.juros;
  return { ok: true, total, emprestimo: user.emprestimo };
}

export function quitarEmprestimo(userJid) {
  const user = getUsuario(userJid);
  user.emprestimo = { valor: 0, juros: 0, expiraEm: 0, ativo: false };
  salvarUsuario(userJid, user);
}

export function emprestimoVencido(userJid) {
  const user = getUsuario(userJid);
  return user.emprestimo.ativo && user.emprestimo.expiraEm < Date.now();
}
