import fs from 'node:fs';
import path from 'node:path';

// =========================================
// CAMINHOS
// =========================================
const ALUGUEL_PATH = './src/database/alugueis.json';
const CONFIG_GLOBAL_PATH = './src/database/config_global.json';

// =========================================
// GARANTE QUE OS ARQUIVOS EXISTEM
// =========================================
function garantirArquivo() {
  const dir = path.dirname(ALUGUEL_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ALUGUEL_PATH)) {
    fs.writeFileSync(ALUGUEL_PATH, JSON.stringify({}, null, 2));
  }
}

function garantirConfigGlobal() {
  const dir = path.dirname(CONFIG_GLOBAL_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_GLOBAL_PATH)) {
    fs.writeFileSync(CONFIG_GLOBAL_PATH, JSON.stringify({ aluguelGlobal: false }, null, 2));
  }
}

// =========================================
// ALUGUÉIS
// =========================================
export function lerAlugueis() {
  garantirArquivo();
  try {
    const dados = fs.readFileSync(ALUGUEL_PATH, 'utf-8');
    return JSON.parse(dados || '{}');
  } catch (error) {
    console.error('[ALUGUEL] Erro ao ler:', error.message);
    return {};
  }
}

export function salvarAlugueis(dados) {
  garantirArquivo();
  try {
    fs.writeFileSync(ALUGUEL_PATH, JSON.stringify(dados, null, 2));
  } catch (error) {
    console.error('[ALUGUEL] Erro ao salvar:', error.message);
  }
}

// =========================================
// CONVERTE O TEMPO EM MILISSEGUNDOS
// Aceita apenas: 10d, 1h, 1a (sem "=")
// =========================================
export function converterTempo(str) {
  if (!str) return null;

  const match = String(str).toLowerCase().trim().match(/^(\d+)(d|h|a)$/);
  if (!match) return null;

  const valor = parseInt(match[1]);
  const tipo = match[2];

  let ms = 0;
  if (tipo === 'h') ms = valor * 60 * 60 * 1000;
  else if (tipo === 'd') ms = valor * 24 * 60 * 60 * 1000;
  else if (tipo === 'a') ms = valor * 365 * 24 * 60 * 60 * 1000;

  return ms;
}

// =========================================
// TEM ALUGUEL ATIVO?
// =========================================
export function temAluguelAtivo(groupJid) {
  const alugueis = lerAlugueis();
  const aluguel = alugueis[groupJid];

  if (!aluguel) return false;
  if (!aluguel.ativo) return false;

  const agora = Date.now();
  if (agora > aluguel.expiraEm) {
    aluguel.ativo = false;
    salvarAlugueis(alugueis);
    return false;
  }

  return true;
}

// =========================================
// TEMPO RESTANTE FORMATADO
// =========================================
export function tempoRestante(groupJid) {
  const alugueis = lerAlugueis();
  const aluguel = alugueis[groupJid];
  if (!aluguel) return null;

  const agora = Date.now();
  const diff = aluguel.expiraEm - agora;

  if (diff <= 0) return 'Expirado';

  const dias = Math.floor(diff / (24 * 60 * 60 * 1000));
  const horas = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutos = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${minutos}min`;
}

// =========================================
// CONFIG GLOBAL (modo aluguel global)
// =========================================
export function getAluguelGlobal() {
  garantirConfigGlobal();
  try {
    const dados = fs.readFileSync(CONFIG_GLOBAL_PATH, 'utf-8');
    return JSON.parse(dados).aluguelGlobal === true;
  } catch {
    return false;
  }
}

export function setAluguelGlobal(valor) {
  garantirConfigGlobal();
  try {
    fs.writeFileSync(CONFIG_GLOBAL_PATH, JSON.stringify({ aluguelGlobal: valor === true }, null, 2));
    return true;
  } catch (error) {
    console.error('[ALUGUEL] Erro ao salvar global:', error.message);
    return false;
  }
}
