import fs from 'node:fs';
import path from 'node:path';

// =========================================
// CORES PARA O TERMINAL (ANSI)
// =========================================
const CORES = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m'
};

// =========================================
// PEGA HORA FORMATADA
// =========================================
function getHora() {
  const agora = new Date();
  const hh = String(agora.getHours()).padStart(2, '0');
  const mm = String(agora.getMinutes()).padStart(2, '0');
  const ss = String(agora.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// =========================================
// PEGA DATA FORMATADA
// =========================================
function getData() {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const ano = agora.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// =========================================
// LIMPA JID (remove @s.whatsapp.net etc)
// =========================================
function limparJid(jid) {
  if (!jid) return 'Desconhecido';
  return String(jid).split('@')[0].split(':')[0];
}

// =========================================
// SALVA LOG NO ARQUIVO
// =========================================
function salvarLogArquivo(dados) {
  const pastaLogs = './src/database/logs';
  if (!fs.existsSync(pastaLogs)) {
    fs.mkdirSync(pastaLogs, { recursive: true });
  }

  const arquivo = path.join(pastaLogs, `${getData().replace(/\//g, '-')}.log`);
  const linha = `[${getHora()}] [${dados.tipo.toUpperCase()}] Grupo: ${dados.grupoNome} | Autor: ${dados.autorNome} (${dados.autorNumero}) | Msg: ${dados.mensagem}\n`;

  try {
    fs.appendFileSync(arquivo, linha, 'utf-8');
  } catch (e) {
    console.error('[LOGGER] Erro ao salvar log:', e.message);
  }
}

// =========================================
// LOG DE COMANDO/MENSAGEM (CONSOLE DECORADO)
// =========================================
export function logMensagem({ tipo, autorNome, autorNumero, grupoNome, grupoJid, mensagem, isComando }) {
  const hora = getHora();
  const data = getData();

  // Salva no arquivo
  salvarLogArquivo({
    tipo: isComando ? 'COMANDO' : 'MENSAGEM',
    autorNome,
    autorNumero,
    grupoNome,
    mensagem
  });

  // Escolhe a cor com base no tipo
  const corTipo = isComando ? CORES.cyan : CORES.green;
  const iconeTipo = isComando ? '⚡ COMANDO' : '💬 MENSAGEM';
  const linhaTopo = '═'.repeat(60);
  const linhaFina = '─'.repeat(60);

  // Trunca mensagens longas
  const msgCurta = mensagem.length > 100 ? mensagem.substring(0, 100) + '...' : mensagem;

  console.log('\n' + CORES.bright + corTipo + linhaTopo + CORES.reset);
  console.log(
    CORES.bright + corTipo + '  ' +
    `🔔 ${iconeTipo}` +
    CORES.reset
  );
  console.log(CORES.bright + corTipo + linhaFina + CORES.reset);

  // 👤 Autor
  console.log(
    CORES.bright + CORES.white +
    `  👤 Autor:  ` +
    CORES.green + `${autorNome}` +
    CORES.reset +
    CORES.dim + ` (${autorNumero})` +
    CORES.reset
  );

  // 🏠 Grupo
  console.log(
    CORES.bright + CORES.white +
    `  🏠 Grupo:  ` +
    CORES.yellow + `${grupoNome}` +
    CORES.reset
  );

  // ⏰ Horário
  console.log(
    CORES.bright + CORES.white +
    `  ⏰ Hora:   ` +
    CORES.magenta + `${hora}` +
    CORES.reset +
    CORES.dim + ` (${data})` +
    CORES.reset
  );

  // 📱 JID (opcional, mais discreto)
  console.log(
    CORES.bright + CORES.white +
    `  📱 JID:    ` +
    CORES.dim + `${grupoJid}` +
    CORES.reset
  );

  console.log(CORES.bright + corTipo + linhaFina + CORES.reset);

  // 💬 Mensagem
  console.log(
    CORES.bright + CORES.white +
    `  💬 Conteúdo: ` +
    CORES.cyan + `"${msgCurta}"` +
    CORES.reset
  );

  console.log(CORES.bright + corTipo + linhaTopo + CORES.reset + '\n');
}

// =========================================
// LOG DE EVENTO (conexão, etc)
// =========================================
export function logEvento(titulo, mensagem, cor = 'blue') {
  const corEscolhida = CORES[cor] || CORES.blue;
  const hora = getHora();
  const linhaTopo = '═'.repeat(60);

  console.log('\n' + CORES.bright + corEscolhida + linhaTopo + CORES.reset);
  console.log(CORES.bright + corEscolhida + `  🔔 ${titulo}` + CORES.reset);
  console.log(CORES.bright + corEscolhida + '─'.repeat(60) + CORES.reset);
  console.log(CORES.white + `  ${mensagem}` + CORES.reset);
  console.log(CORES.bright + corEscolhida + '─'.repeat(60) + CORES.reset);
  console.log(CORES.dim + `  ⏰ ${hora}` + CORES.reset);
  console.log(CORES.bright + corEscolhida + linhaTopo + CORES.reset + '\n');
}

// =========================================
// LOG DE ERRO
// =========================================
export function logErro(origem, mensagem) {
  const hora = getHora();
  const linhaTopo = '═'.repeat(60);

  console.log('\n' + CORES.bright + CORES.red + linhaTopo + CORES.reset);
  console.log(CORES.bright + CORES.red + `  ❌ ERRO EM: ${origem}` + CORES.reset);
  console.log(CORES.bright + CORES.red + '─'.repeat(60) + CORES.reset);
  console.log(CORES.white + `  📝 ${mensagem}` + CORES.reset);
  console.log(CORES.bright + CORES.red + '─'.repeat(60) + CORES.reset);
  console.log(CORES.dim + `  ⏰ ${hora}` + CORES.reset);
  console.log(CORES.bright + CORES.red + linhaTopo + CORES.reset + '\n');
}
