import fs from 'node:fs';

const ARQUIVO = './database/horarioOff.json';
const FUSO = 'America/Sao_Paulo';

// =========================================
// LÊ O BANCO DE DADOS (COM MIGRAÇÃO AUTOMÁTICA)
// =========================================
function lerDB() {
  try {
    if (!fs.existsSync(ARQUIVO)) {
      return { ativo: false, horaInicio: null, horaFim: null, definidoPor: null };
    }

    const dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));

    // 🔄 MIGRAÇÃO: se for formato antigo (tinha fimEm/iniciadoEm), reseta
    if (dados.ativo && !dados.horaInicio && !dados.horaFim) {
      console.log('[HORARIO-OFF] Formato antigo detectado. Resetando banco de dados...');
      const novo = { ativo: false, horaInicio: null, horaFim: null, definidoPor: null };
      fs.writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2));
      return novo;
    }

    // Garante que todos os campos existem
    return {
      ativo: !!dados.ativo,
      horaInicio: dados.horaInicio || null,
      horaFim: dados.horaFim || null,
      definidoPor: dados.definidoPor || null
    };
  } catch (e) {
    console.error('[HORARIO-OFF] Erro ao ler. Resetando banco:', e.message);
    try {
      const novo = { ativo: false, horaInicio: null, horaFim: null, definidoPor: null };
      fs.writeFileSync(ARQUIVO, JSON.stringify(novo, null, 2));
      return novo;
    } catch (err) {
      return { ativo: false, horaInicio: null, horaFim: null, definidoPor: null };
    }
  }
}

// =========================================
// SALVA O BANCO DE DADOS
// =========================================
function salvarDB(dados) {
  try {
    const dir = './database';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2));
  } catch (e) {
    console.error('[HORARIO-OFF] Erro ao salvar:', e.message);
  }
}

// =========================================
// ATIVA O HORÁRIO OFF FIXO
// =========================================
export function configurarHorarioOff(horaInicio, horaFim, definidoPor) {
  salvarDB({
    ativo: true,
    horaInicio,
    horaFim,
    definidoPor
  });

  return { horaInicio, horaFim };
}

// =========================================
// CANCELA O HORÁRIO OFF
// =========================================
export function cancelarHorarioOff() {
  salvarDB({
    ativo: false,
    horaInicio: null,
    horaFim: null,
    definidoPor: null
  });
}

// =========================================
// CONVERTE "HH:MM" EM MINUTOS DO DIA
// =========================================
function horarioParaMinutos(horario) {
  try {
    if (!horario || typeof horario !== 'string') return null;
    const [h, m] = horario.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  } catch (e) {
    return null;
  }
}

// =========================================
// PEGA A HORA ATUAL (EM MINUTOS) NO FUSO BRASIL
// =========================================
function getMinutosAtuais() {
  const agora = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const partes = formatter.format(agora).split(':');
  return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

// =========================================
// VERIFICA SE ESTÁ EM HORÁRIO OFF AGORA (À PROVA DE ERROS)
// =========================================
export function estaEmHorarioOff() {
  try {
    const db = lerDB();
    if (!db.ativo || !db.horaInicio || !db.horaFim) return false;

    const inicio = horarioParaMinutos(db.horaInicio);
    const fim = horarioParaMinutos(db.horaFim);
    if (inicio === null || fim === null) return false;

    const agora = getMinutosAtuais();

    if (inicio < fim) {
      return agora >= inicio && agora < fim;
    }

    if (inicio > fim) {
      return agora >= inicio || agora < fim;
    }

    return false;
  } catch (e) {
    console.error('[HORARIO-OFF] Erro em estaEmHorarioOff:', e.message);
    return false;
  }
}

// =========================================
// PEGA INFORMAÇÕES DA CONFIGURAÇÃO
// =========================================
export function getInfoHorarioOff() {
  try {
    const db = lerDB();
    if (!db.ativo || !db.horaInicio || !db.horaFim) return null;

    const agora = getMinutosAtuais();
    const inicio = horarioParaMinutos(db.horaInicio);
    const fim = horarioParaMinutos(db.horaFim);
    if (inicio === null || fim === null) return null;

    let emOff = false;
    if (inicio < fim) {
      emOff = agora >= inicio && agora < fim;
    } else if (inicio > fim) {
      emOff = agora >= inicio || agora < fim;
    }

    let minutosParaProximo = 0;
    if (!emOff) {
      if (agora < inicio) {
        minutosParaProximo = inicio - agora;
      } else {
        minutosParaProximo = (1440 - agora) + inicio;
      }
    }

    let minutosParaTerminar = 0;
    if (emOff) {
      if (inicio < fim) {
        minutosParaTerminar = fim - agora;
      } else {
        if (agora >= inicio) {
          minutosParaTerminar = (1440 - agora) + fim;
        } else {
          minutosParaTerminar = fim - agora;
        }
      }
    }

    return {
      ativo: true,
      horaInicio: db.horaInicio,
      horaFim: db.horaFim,
      definidoPor: db.definidoPor,
      emOffAgora: emOff,
      minutosParaProximo,
      minutosParaTerminar
    };
  } catch (e) {
    console.error('[HORARIO-OFF] Erro em getInfoHorarioOff:', e.message);
    return null;
  }
}

// =========================================
// FORMATA MINUTOS PARA "Xh Ym"
// =========================================
export function formatarTempo(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m} min`;
}
