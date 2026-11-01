import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './src/database/cidades.json';

const PADRAO = { cidades: {} };

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
    return { cidades: {} };
  }
}

export function salvarDB(dados) {
  garantir();
  fs.writeFileSync(DB_PATH, JSON.stringify(dados, null, 2));
}

export function getCidade(userJid) {
  const db = lerDB();
  return db.cidades[userJid] || null;
}

export function criarCidade(userJid, nome, dono) {
  const db = lerDB();
  db.cidades[userJid] = {
    nome,
    dono,
    criadaEm: Date.now(),
    estruturas: {},
    populacao: 0,
    felicidade: 50,
    ultimaColeta: Date.now(),
    impostosAcumulados: 0,
    totalArrecadado: 0,
    propostas: [],
    ultimaProposta: 0,
    totalPropostasAceitas: 0
  };
  salvarDB(db);
  return db.cidades[userJid];
}

export function salvarCidade(userJid, dados) {
  const db = lerDB();
  db.cidades[userJid] = dados;
  salvarDB(db);
}

export function deletarCidade(userJid) {
  const db = lerDB();
  delete db.cidades[userJid];
  salvarDB(db);
}

export function listarCidades() {
  const db = lerDB();
  return Object.entries(db.cidades).map(([jid, c]) => ({ jid, ...c }));
}

// =========================================
// ESTRUTURAS
// =========================================
export const ESTRUTURAS = {
  casas: {
    nome: 'Casas', emoji: '🏘️', precoBase: 50000,
    populacaoPorUnidade: 100, rendaPorUnidade: 0, felicidadePorUnidade: 1,
    descricao: 'Aumenta a população da cidade'
  },
  comercio: {
    nome: 'Comércio', emoji: '🏪', precoBase: 80000,
    populacaoPorUnidade: 20, rendaPorUnidade: 500, felicidadePorUnidade: 2,
    descricao: 'Gera renda e empregos'
  },
  fabrica: {
    nome: 'Fábrica', emoji: '🏭', precoBase: 150000,
    populacaoPorUnidade: 50, rendaPorUnidade: 1200, felicidadePorUnidade: -3,
    descricao: 'Muita renda, mas polui'
  },
  escola: {
    nome: 'Escola', emoji: '🏫', precoBase: 120000,
    populacaoPorUnidade: 30, rendaPorUnidade: 300, felicidadePorUnidade: 5,
    descricao: 'Educação aumenta felicidade'
  },
  hospital: {
    nome: 'Hospital', emoji: '🏥', precoBase: 200000,
    populacaoPorUnidade: 40, rendaPorUnidade: 600, felicidadePorUnidade: 8,
    descricao: 'Saúde da população'
  },
  parque: {
    nome: 'Parque', emoji: '🌳', precoBase: 60000,
    populacaoPorUnidade: 10, rendaPorUnidade: 100, felicidadePorUnidade: 12,
    descricao: 'Aumenta muito a felicidade'
  },
  estadio: {
    nome: 'Estádio', emoji: '🏟️', precoBase: 500000,
    populacaoPorUnidade: 80, rendaPorUnidade: 5000, felicidadePorUnidade: 15,
    descricao: 'Entretenimento de alto lucro'
  },
  arranhaceu: {
    nome: 'Arranha-céu', emoji: '🏢', precoBase: 1000000,
    populacaoPorUnidade: 500, rendaPorUnidade: 3000, felicidadePorUnidade: -2,
    descricao: 'Muita população, cara de manter'
  }
};

// =========================================
// CÁLCULOS
// =========================================
export function calcularPopulacao(cidade) {
  let pop = 0;
  for (const [chave, dados] of Object.entries(cidade.estruturas)) {
    const info = ESTRUTURAS[chave];
    if (info) pop += info.populacaoPorUnidade * dados.quantidade * dados.nivel;
  }
  // Bônus de propostas aceitas
  pop += cidade.bonusPopulacao || 0;
  return pop;
}

export function calcularRenda(cidade) {
  let renda = 0;
  for (const [chave, dados] of Object.entries(cidade.estruturas)) {
    const info = ESTRUTURAS[chave];
    if (info) renda += info.rendaPorUnidade * dados.quantidade * dados.nivel;
  }
  // Bônus de propostas aceitas
  renda += cidade.bonusRenda || 0;
  const multFelicidade = 0.5 + (cidade.felicidade / 100);
  return Math.floor(renda * multFelicidade);
}

export function calcularFelicidade(cidade) {
  let fel = 50;
  for (const [chave, dados] of Object.entries(cidade.estruturas)) {
    const info = ESTRUTURAS[chave];
    if (info) fel += info.felicidadePorUnidade * dados.quantidade;
  }
  // Bônus/penalidade de propostas aceitas
  fel += cidade.bonusFelicidade || 0;
  if (fel > 100) fel = 100;
  if (fel < 0) fel = 0;
  return fel;
}

export function calcularNivelCidade(cidade) {
  const pop = cidade.populacao || calcularPopulacao(cidade);
  if (pop >= 500000) return { nivel: 10, nome: 'Metrópole', emoji: '🌆' };
  if (pop >= 200000) return { nivel: 9,  nome: 'Megalópole', emoji: '🌃' };
  if (pop >= 100000) return { nivel: 8,  nome: 'Grande Cidade', emoji: '🏙️' };
  if (pop >= 50000)  return { nivel: 7,  nome: 'Cidade Grande', emoji: '🏙️' };
  if (pop >= 25000)  return { nivel: 6,  nome: 'Cidade Média', emoji: '🏢' };
  if (pop >= 10000)  return { nivel: 5,  nome: 'Cidade', emoji: '🏘️' };
  if (pop >= 5000)   return { nivel: 4,  nome: 'Vila Grande', emoji: '🏡' };
  if (pop >= 2000)   return { nivel: 3,  nome: 'Vila', emoji: '🏡' };
  if (pop >= 500)    return { nivel: 2,  nome: 'Povoado', emoji: '🏕️' };
  return { nivel: 1, nome: 'Assentamento', emoji: '🏕️' };
}

export function calcularImpostos(cidade) {
  const agora = Date.now();
  const tempoPassado = agora - cidade.ultimaColeta;
  const horasPassadas = tempoPassado / (60 * 60 * 1000);
  const rendaPorHora = calcularRenda(cidade);
  return Math.floor(rendaPorHora * horasPassadas);
}

// =========================================
// SISTEMA DE PROPOSTAS DE EMPRESÁRIOS
// =========================================
export const TIPOS_EMPRESARIOS = [
  {
    id: 'shopping',
    nome: 'Shopping Center',
    empresario: 'Grupo Iguatemi',
    emoji: '🛍️',
    oferta: 500000,
    bonusPopulacao: 2000,
    bonusFelicidade: 5,
    bonusRenda: 0,
    descricao: 'Um grande shopping traz movimento e empregos.',
    raridade: 'comum'
  },
  {
    id: 'industria',
    nome: 'Polo Industrial',
    empresario: 'Indústrias Silva',
    emoji: '🏭',
    oferta: 800000,
    bonusPopulacao: 3000,
    bonusFelicidade: -10,
    bonusRenda: 500,
    descricao: 'Muita renda, mas polui a cidade.',
    raridade: 'comum'
  },
  {
    id: 'universidade',
    nome: 'Universidade Federal',
    empresario: 'Fundação Educar',
    emoji: '🎓',
    oferta: 300000,
    bonusPopulacao: 500,
    bonusFelicidade: 15,
    bonusRenda: 0,
    descricao: 'Educação de qualidade para sua população.',
    raridade: 'comum'
  },
  {
    id: 'cassino',
    nome: 'Cassino Real',
    empresario: 'Mr. Lucky',
    emoji: '🎰',
    oferta: 1500000,
    bonusPopulacao: 1000,
    bonusFelicidade: -25,
    bonusRenda: 2000,
    descricao: 'Muito dinheiro, mas a população não gosta.',
    raridade: 'raro'
  },
  {
    id: 'resort',
    nome: 'Resort à Beira-Mar',
    empresario: 'Rede Tropical',
    emoji: '🏖️',
    oferta: 2000000,
    bonusPopulacao: 5000,
    bonusFelicidade: -5,
    bonusRenda: 1500,
    descricao: 'Turismo traz muita gente e dinheiro.',
    raridade: 'raro'
  },
  {
    id: 'datacenter',
    nome: 'Data Center',
    empresario: 'Tech Cloud Corp',
    emoji: '💻',
    oferta: 1000000,
    bonusPopulacao: 800,
    bonusFelicidade: -8,
    bonusRenda: 800,
    descricao: 'Tecnologia traz modernidade, mas consome energia.',
    raridade: 'raro'
  },
  {
    id: 'parqueeco',
    nome: 'Parque Ecológico',
    empresario: 'Instituto Verde',
    emoji: '🌳',
    oferta: 400000,
    bonusPopulacao: 300,
    bonusFelicidade: 20,
    bonusRenda: 200,
    descricao: 'Preservação ambiental e lazer para todos.',
    raridade: 'comum'
  },
  {
    id: 'olimpico',
    nome: 'Estádio Olímpico',
    empresario: 'Comitê Olímpico',
    emoji: '🏟️',
    oferta: 3000000,
    bonusPopulacao: 10000,
    bonusFelicidade: 10,
    bonusRenda: 3000,
    descricao: 'Sede olímpica trará fama e turistas.',
    raridade: 'lendario'
  }
];

// Peso da raridade
const PESO_RARIDADE = { comum: 70, raro: 25, lendario: 5 };

export function sortearEmpresario() {
  const roll = Math.random() * 100;
  let acumulado = 0;
  let raridadeEscolhida = 'comum';

  for (const [rar, peso] of Object.entries(PESO_RARIDADE)) {
    acumulado += peso;
    if (roll <= acumulado) {
      raridadeEscolhida = rar;
      break;
    }
  }

  const candidatos = TIPOS_EMPRESARIOS.filter(e => e.raridade === raridadeEscolhida);
  return candidatos[Math.floor(Math.random() * candidatos.length)];
}

// Gera uma nova proposta se já passou tempo suficiente
export function gerarPropostaSeNecessario(cidade) {
  const INTERVALO = 4 * 60 * 60 * 1000; // 4 horas
  const agora = Date.now();

  // Só gera se não tem proposta ativa e já passou o tempo
  if (cidade.propostas.length > 0) return false;
  if (agora - cidade.ultimaProposta < INTERVALO) return false;

  const empresario = sortearEmpresario();
  const expiraEm = agora + (24 * 60 * 60 * 1000); // expira em 24h

  cidade.propostas.push({
    id: Date.now(),
    ...empresario,
    propostaEm: agora,
    expiraEm
  });
  cidade.ultimaProposta = agora;

  return true;
}
