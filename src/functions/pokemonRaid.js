import fs from 'node:fs';
import path from 'node:path';
import { PREFIX } from '../config.js';
import { POKEMONS, adicionarXpTreinador } from './pokemon.js';
import { getUsuario, salvarUsuario } from './pokemonDB.js';

// =========================================
// 🔥 RAIDS POKÉMON (estilo Pokémon GO)
//
// Como funciona:
//  1. Um OVO de raid aparece no grupo (mostra só as estrelas) e eclode depois de alguns minutos.
//  2. O chefe aparece. Cada treinador gasta 1 PASSE DE RAID e entra no LOBBY com um time de
//     até 3 Pokémon. O 1º que entra inicia a contagem do lobby.
//  3. Acabou a contagem: todos lutam JUNTOS contra o chefe, com tempo limite.
//  4. Se o chefe cair: recompensas (PokéCoins, XP, itens) e a CAPTURA com Premier Balls.
//     Se o tempo acabar: derrota (dá para tentar de novo com outro passe, enquanto a raid durar).
// =========================================

// -----------------------------------------
// CONFIGURAÇÕES (ajuste aqui)
// -----------------------------------------
export const CONFIG_RAID = {
  ovoMin: 5,               // minutos até o ovo eclodir
  abertaMin: 20,           // minutos que a raid fica aberta depois de eclodir
  lobbySeg: 120,           // contagem do lobby depois que o 1º jogador entra
  capturaMin: 10,          // minutos para capturar depois da vitória
  maxJogadores: 20,        // máximo de treinadores por batalha
  timeMax: 3,              // Pokémon por treinador
  intervaloMin: [90, 180], // minutos entre uma raid e a próxima (sorteado)
  primeiraMin: 5,          // minutos até a 1ª raid depois do !ativarraid
  horario: [8, 23],        // raids só aparecem entre 08:00 e 22:59 (horário de Brasília)
  passesMax: 5,            // máximo de passes guardados
  precoPasse: 300,         // PokéCoins por passe extra
  nivelBonusCaptura: 1,    // bônus de nível por estrela no Pokémon capturado na raid
  fuso: 'America/Sao_Paulo'
};

// Equilíbrio da batalha
export const BALANCO = {
  segundosPorRodada: 5,
  danoJogador: 0.6,        // fração do ATK que vira dano por rodada
  defesaChefe: 0.8,        // o quanto a DEF do chefe reduz o dano
  hpMult: 2.5,             // multiplicador de HP dos Pokémon na raid
  danoChefe: 0.3,          // fração do ATK do chefe que vira dano por rodada
  chanceChefeAtacar: 0.7,  // chance de o chefe atacar cada treinador por rodada
  especialACada: 6,        // a cada N rodadas o chefe solta um ataque especial em todos
  especialMult: 1.8,
  critChance: 0.1,
  critMult: 1.5
};

// Níveis de raid (1 a 5 estrelas)
export const TIERS = {
  1: { estrelas: '★☆☆☆☆', hp: 900,   atkChefe: 0.8, rodadas: 36, bolas: 3, coins: 150,  xp: 300,  itens: { berry: 2 },                peso: 35 },
  2: { estrelas: '★★☆☆☆', hp: 2100,  atkChefe: 1.0, rodadas: 36, bolas: 4, coins: 300,  xp: 600,  itens: { berry: 2, pokeblock: 1 },  peso: 30 },
  3: { estrelas: '★★★☆☆', hp: 4000,  atkChefe: 1.2, rodadas: 36, bolas: 5, coins: 600,  xp: 1200, itens: { pokeblock: 2 },            peso: 22 },
  4: { estrelas: '★★★★☆', hp: 6500,  atkChefe: 1.4, rodadas: 36, bolas: 6, coins: 1000, xp: 2500, itens: { pokeblock: 2, poffin: 1 }, peso: 10 },
  5: { estrelas: '★★★★★', hp: 12000, atkChefe: 1.6, rodadas: 60, bolas: 8, coins: 2000, xp: 5000, itens: { poffin: 2 },             peso: 3 }
};

// Chefes de 5 estrelas: todos os míticos + estes lendários "de capa"
const CHEFES_5_ESTRELAS = ['Mewtwo', 'Lugia', 'Ho-Oh', 'Kyogre', 'Groudon', 'Rayquaza', 'Dialga', 'Palkia', 'Giratina'];

// Chance base de captura do chefe com a Premier Ball (por raridade)
const CAPTURA_BASE = { comum: 0.55, raro: 0.40, epico: 0.28, lendario: 0.16, mitico: 0.12 };

// Qualidade do lance da Premier Ball
const LANCES = [
  { nome: 'Normal',    emoji: '⚪', mult: 1.0,  peso: 55 },
  { nome: 'Nice',      emoji: '👍', mult: 1.15, peso: 25 },
  { nome: 'Great',     emoji: '🌟', mult: 1.3,  peso: 15 },
  { nome: 'Excellent', emoji: '🎯', mult: 1.6,  peso: 5 }
];

// -----------------------------------------
// BANCO DE DADOS DAS RAIDS (arquivo próprio)
// {
//   grupos: [jid, ...],              grupos com raid ligada
//   proxima: { jid: timestamp },     quando o próximo ovo pode aparecer
//   raids:   { jid: raid }           raid ativa de cada grupo
// }
// -----------------------------------------
const DB_PATH = './src/database/pokemonRaid.json';
let cache = null;

function garantirArquivo() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ grupos: [], proxima: {}, raids: {} }, null, 2));
}

function bd() {
  if (cache) return cache;
  garantirArquivo();
  try {
    cache = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    cache = {};
  }
  if (!Array.isArray(cache.grupos)) cache.grupos = [];
  if (!cache.proxima || typeof cache.proxima !== 'object') cache.proxima = {};
  if (!cache.raids || typeof cache.raids !== 'object') cache.raids = {};
  return cache;
}

function salvar() {
  garantirArquivo();
  fs.writeFileSync(DB_PATH, JSON.stringify(bd(), null, 2));
}

// -----------------------------------------
// AUXILIARES
// -----------------------------------------
function numeroDe(jid) {
  return String(jid).split('@')[0].split(':')[0];
}

export function fmtNum(n) {
  return Math.round(n).toLocaleString('pt-BR');
}

export function fmtTempo(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function partesBrasilia(ts) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: CONFIG_RAID.fuso,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(ts));
  const get = t => p.find(x => x.type === t).value;
  return { data: `${get('year')}-${get('month')}-${get('day')}`, hora: Number(get('hour')), minuto: Number(get('minute')) };
}

export function dataBrasilia(ts = Date.now()) {
  return partesBrasilia(ts).data;
}

function sorteioEntre(min, max, rng) {
  return min + rng() * (max - min);
}

// Empurra um horário para dentro da janela em que raids podem aparecer
export function ajustarHorario(ts, rng = Math.random) {
  const [ini, fim] = CONFIG_RAID.horario;
  const { hora, minuto } = partesBrasilia(ts);
  if (hora >= ini && hora < fim) return ts;
  const minutosAte = hora >= fim ? (24 - hora + ini) * 60 - minuto : (ini - hora) * 60 - minuto;
  return ts + (minutosAte + Math.floor(rng() * 30)) * 60 * 1000;
}

function proximaRaid(agora, rng) {
  const [min, max] = CONFIG_RAID.intervaloMin;
  return ajustarHorario(agora + sorteioEntre(min, max, rng) * 60 * 1000, rng);
}

function sortearPonderado(itens, rng) {
  const total = itens.reduce((s, i) => s + i.peso, 0);
  let r = rng() * total;
  for (const i of itens) {
    r -= i.peso;
    if (r < 0) return i;
  }
  return itens[itens.length - 1];
}

const poder = p => p.hp + p.atk + p.def + p.velocidade;

// -----------------------------------------
// CHEFES
// -----------------------------------------
export function chefesDoTier(tier) {
  switch (tier) {
    case 1: return POKEMONS.filter(p => p.raridade === 'comum');
    case 2: return POKEMONS.filter(p => p.raridade === 'raro');
    case 3: return POKEMONS.filter(p => p.raridade === 'epico');
    case 4: return POKEMONS.filter(p => p.raridade === 'lendario' && !CHEFES_5_ESTRELAS.includes(p.nome));
    case 5: return POKEMONS.filter(p => p.raridade === 'mitico' || CHEFES_5_ESTRELAS.includes(p.nome));
    default: return [];
  }
}

export function sortearTier(rng = Math.random) {
  return sortearPonderado(Object.entries(TIERS).map(([t, c]) => ({ tier: Number(t), peso: c.peso })), rng).tier;
}

export function sortearChefe(tier, rng = Math.random) {
  const lista = chefesDoTier(tier);
  const p = lista[Math.floor(rng() * lista.length)];
  return { id: p.id, nome: p.nome, emoji: p.emoji, raridade: p.raridade, hp: p.hp, atk: p.atk, def: p.def, velocidade: p.velocidade, img: p.img };
}

// -----------------------------------------
// BATALHA (simulação por rodadas de 5 segundos)
// jogadores: [{ id, nome, time: [{ nome, hp, atk, def, velocidade, felicidade }] }]
// -----------------------------------------
export function simularBatalha(boss, tierCfg, jogadores, rng = Math.random) {
  const B = BALANCO;
  const variacao = () => 0.85 + rng() * 0.3;

  const estados = jogadores.map(j => ({
    id: j.id,
    nome: j.nome,
    time: j.time.map(p => ({ ...p, hpAtual: p.hp * B.hpMult })),
    atual: 0,
    dano: 0,
    nocautes: 0
  }));

  let bossAtual = tierCfg.hp;
  let rodadasUsadas = 0;
  let criticos = 0;
  const defChefe = boss.def * B.defesaChefe;
  const atkChefe = boss.atk * tierCfg.atkChefe * B.danoChefe;

  for (let rodada = 1; rodada <= tierCfg.rodadas; rodada++) {
    const ativos = estados.filter(e => e.atual < e.time.length);
    if (ativos.length === 0) break;
    rodadasUsadas = rodada;

    // 1) Os treinadores atacam o chefe
    for (const e of ativos) {
      const p = e.time[e.atual];
      const fatorFelicidade = 0.9 + ((p.felicidade ?? 50) / 100) * 0.2;
      const fatorVelocidade = 0.85 + Math.min(p.velocidade, 150) / 500;
      let dano = p.atk * B.danoJogador * fatorFelicidade * fatorVelocidade * (100 / (100 + defChefe)) * variacao();
      if (rng() < B.critChance) { dano *= B.critMult; criticos++; }
      dano = Math.max(1, Math.round(dano));
      e.dano += dano;
      bossAtual -= dano;
      if (bossAtual <= 0) break;
    }
    if (bossAtual <= 0) break;

    // 2) O chefe contra-ataca (a cada N rodadas, um ataque especial em todos)
    const especial = rodada % B.especialACada === 0;
    for (const e of ativos) {
      if (!especial && rng() > B.chanceChefeAtacar) continue;
      const p = e.time[e.atual];
      let dano = atkChefe * (100 / (100 + p.def)) * variacao();
      if (especial) dano *= B.especialMult;
      p.hpAtual -= dano;
      if (p.hpAtual <= 0) { e.atual++; e.nocautes++; }
    }
  }

  const vitoria = bossAtual <= 0;
  const jogadoresRes = estados
    .map(e => ({ id: e.id, nome: e.nome, dano: e.dano, nocautes: e.nocautes, vivos: e.time.length - e.atual }))
    .sort((a, b) => b.dano - a.dano);

  return {
    vitoria,
    rodadas: rodadasUsadas,
    tempoSeg: rodadasUsadas * B.segundosPorRodada,
    hpRestante: Math.max(0, bossAtual),
    percentualRestante: Math.max(0, bossAtual) / tierCfg.hp,
    danoTotal: jogadoresRes.reduce((s, j) => s + j.dano, 0),
    nocautes: jogadoresRes.reduce((s, j) => s + j.nocautes, 0),
    criticos,
    jogadores: jogadoresRes
  };
}

// -----------------------------------------
// PASSES DE RAID
// -----------------------------------------
// Garante o campo e entrega o passe grátis do dia. Retorna true se ganhou passe agora.
export function garantirUsuarioRaid(user, hoje = dataBrasilia()) {
  if (!user.raid || typeof user.raid !== 'object') user.raid = { passes: 0, diario: null };
  if (!Number.isFinite(user.raid.passes)) user.raid.passes = 0;

  let ganhou = false;
  if (user.raid.diario !== hoje) {
    user.raid.diario = hoje;
    if (user.raid.passes < CONFIG_RAID.passesMax) {
      user.raid.passes += 1;
      ganhou = true;
    }
  }
  return ganhou;
}

export function infoPasses(sender) {
  const user = getUsuario(sender);
  const ganhouHoje = garantirUsuarioRaid(user);
  if (ganhouHoje) salvarUsuario(sender, user);
  return { passes: user.raid.passes, ganhouHoje, max: CONFIG_RAID.passesMax, preco: CONFIG_RAID.precoPasse, coins: user.pokecoins };
}

export function comprarPasses(sender, qtd = 1) {
  const user = getUsuario(sender);
  const ganhouHoje = garantirUsuarioRaid(user);
  const { passesMax, precoPasse } = CONFIG_RAID;

  if (!Number.isInteger(qtd) || qtd < 1) {
    if (ganhouHoje) salvarUsuario(sender, user);
    return { ok: false, erro: 'Informe uma quantidade válida.' };
  }
  if (user.raid.passes + qtd > passesMax) {
    if (ganhouHoje) salvarUsuario(sender, user);
    return { ok: false, erro: `Você só pode guardar *${passesMax} passes*. Hoje você tem ${user.raid.passes}.` };
  }
  const custo = precoPasse * qtd;
  if (user.pokecoins < custo) {
    if (ganhouHoje) salvarUsuario(sender, user);
    return { ok: false, erro: `Você precisa de *${fmtNum(custo)} PokéCoins*. Saldo: ${fmtNum(user.pokecoins)}.` };
  }

  user.pokecoins -= custo;
  user.raid.passes += qtd;
  salvarUsuario(sender, user);
  return { ok: true, qtd, custo, passes: user.raid.passes, coins: user.pokecoins };
}

// -----------------------------------------
// TIME DO TREINADOR
// -----------------------------------------
function snapshot(p, idx) {
  return {
    idx, nome: p.nome, emoji: p.emoji, raridade: p.raridade, level: p.level ?? 1,
    hp: p.hp, atk: p.atk, def: p.def, velocidade: p.velocidade, felicidade: p.felicidade ?? 50
  };
}

// indices: posições (1 = primeiro de !meuspokemons). Vazio = ativo + os mais fortes.
export function montarTime(user, indices = []) {
  const max = CONFIG_RAID.timeMax;
  const total = user.pokemons.length;
  if (total === 0) return { erro: 'Você ainda não tem nenhum Pokémon. Capture um antes de entrar numa raid!' };

  let escolhidos = [];
  if (indices.length > 0) {
    if (indices.length > max) return { erro: `O time pode ter no máximo *${max} Pokémon*.` };
    for (const n of indices) {
      if (!Number.isInteger(n) || n < 1 || n > total) return { erro: `Pokémon *${n}* não existe. Veja sua lista com ${PREFIX}meuspokemons` };
      if (escolhidos.includes(n - 1)) return { erro: 'Não repita o mesmo Pokémon no time.' };
      escolhidos.push(n - 1);
    }
  } else {
    if (user.pokemonAtivo !== null && user.pokemons[user.pokemonAtivo]) escolhidos.push(user.pokemonAtivo);
    const outros = user.pokemons
      .map((p, i) => ({ i, p }))
      .filter(x => !escolhidos.includes(x.i))
      .sort((a, b) => poder(b.p) - poder(a.p));
    for (const o of outros) {
      if (escolhidos.length >= max) break;
      escolhidos.push(o.i);
    }
  }

  return { time: escolhidos.map(i => snapshot(user.pokemons[i], i + 1)) };
}

// -----------------------------------------
// ESTADO DAS RAIDS
// -----------------------------------------
export function getRaid(jid) {
  return bd().raids[jid] || null;
}

export function raidAtivoNoGrupo(jid) {
  return bd().grupos.includes(jid);
}

// Quando o próximo ovo pode aparecer nesse grupo (timestamp) ou null
export function proximaRaidDoGrupo(jid) {
  return bd().proxima[jid] || null;
}

// "HH:MM" no horário de Brasília
export function fmtHoraBrasilia(ts) {
  const { hora, minuto } = partesBrasilia(ts);
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
}

// Liga as raids no grupo. Retorna false se já estava ligada.
export function ativarRaidGrupo(jid, agora = Date.now()) {
  const db = bd();
  if (db.grupos.includes(jid)) return false;
  db.grupos.push(jid);
  db.proxima[jid] = ajustarHorario(agora + CONFIG_RAID.primeiraMin * 60 * 1000);
  salvar();
  return true;
}

// Desliga as raids no grupo e cancela a raid em andamento (devolvendo os passes).
export function desativarRaidGrupo(jid) {
  const db = bd();
  if (!db.grupos.includes(jid)) return { mudou: false, reembolsados: 0 };

  let reembolsados = 0;
  const raid = db.raids[jid];
  if (raid?.lobby) {
    for (const id of Object.keys(raid.lobby.jogadores)) {
      const user = getUsuario(id);
      garantirUsuarioRaid(user);
      user.raid.passes = Math.min(CONFIG_RAID.passesMax, user.raid.passes + 1);
      salvarUsuario(id, user);
      reembolsados++;
    }
  }

  db.grupos = db.grupos.filter(g => g !== jid);
  delete db.proxima[jid];
  delete db.raids[jid];
  salvar();
  return { mudou: true, reembolsados, tinhaRaid: !!raid };
}

// Cria uma raid. imediata = o chefe já aparece (sem fase de ovo).
export function criarRaid(jid, { tier, imediata = false, forcada = false, agora = Date.now(), rng = Math.random } = {}) {
  const db = bd();
  if (db.raids[jid]) return null;

  const t = tier && TIERS[tier] ? tier : sortearTier(rng);
  const raid = {
    id: String(agora),
    fase: imediata ? 'aberta' : 'ovo',
    tier: t,
    boss: sortearChefe(t, rng),
    criadaEm: agora,
    eclodeEm: imediata ? agora : agora + CONFIG_RAID.ovoMin * 60 * 1000,
    fechaEm: imediata ? agora + CONFIG_RAID.abertaMin * 60 * 1000 : null,
    capturaAte: null,
    tentativas: 0,
    lobby: null,
    vencedores: null,
    forcada
  };
  db.raids[jid] = raid;
  salvar();
  return raid;
}

function finalizarRaid(jid, agora, rng) {
  const db = bd();
  delete db.raids[jid];
  if (db.grupos.includes(jid)) db.proxima[jid] = proximaRaid(agora, rng);
}

// -----------------------------------------
// ENTRAR / SAIR DO LOBBY
// -----------------------------------------
export function entrarNaRaid(jid, sender, nome, indices = [], agora = Date.now()) {
  const raid = getRaid(jid);
  if (!raid) return { ok: false, erro: 'Não há nenhuma raid neste grupo agora.' };
  if (raid.fase === 'ovo') return { ok: false, erro: `O ovo ainda não eclodiu! Falta *${fmtTempo(raid.eclodeEm - agora)}*.` };
  if (raid.fase === 'captura') return { ok: false, erro: `Esta raid já foi vencida! Use ${PREFIX}raid capturar se você participou.` };
  if (agora >= raid.fechaEm) return { ok: false, erro: 'A raid está terminando, não dá mais para entrar.' };
  if (raid.lobby && agora >= raid.lobby.iniciaEm) return { ok: false, erro: 'A batalha já vai começar! Espere a próxima tentativa.' };
  if (raid.lobby?.jogadores[sender]) return { ok: false, erro: 'Você já está no lobby desta raid.' };
  if (raid.lobby && Object.keys(raid.lobby.jogadores).length >= CONFIG_RAID.maxJogadores) {
    return { ok: false, erro: `O lobby está cheio (${CONFIG_RAID.maxJogadores} treinadores).` };
  }

  const user = getUsuario(sender);
  const ganhouHoje = garantirUsuarioRaid(user);
  if (ganhouHoje) salvarUsuario(sender, user);

  const { time, erro } = montarTime(user, indices);
  if (erro) return { ok: false, erro };

  if (user.raid.passes < 1) {
    return { ok: false, erro: `Você está sem *Passe de Raid*! Ganhe 1 por dia ou compre com ${PREFIX}comprarpasse (${fmtNum(CONFIG_RAID.precoPasse)} PokéCoins).` };
  }

  user.raid.passes -= 1;
  salvarUsuario(sender, user);

  const primeiro = !raid.lobby;
  if (primeiro) raid.lobby = { iniciaEm: Math.min(agora + CONFIG_RAID.lobbySeg * 1000, raid.fechaEm), jogadores: {} };
  raid.lobby.jogadores[sender] = { nome, time };
  salvar();

  return {
    ok: true,
    time,
    primeiro,
    passes: user.raid.passes,
    jogadores: Object.keys(raid.lobby.jogadores).length,
    iniciaEm: raid.lobby.iniciaEm,
    ganhouPasseHoje: ganhouHoje
  };
}

// Sai do lobby antes da batalha e recebe o passe de volta
export function sairDaRaid(jid, sender, agora = Date.now()) {
  const raid = getRaid(jid);
  if (!raid || raid.fase !== 'aberta' || !raid.lobby?.jogadores[sender]) {
    return { ok: false, erro: 'Você não está em nenhum lobby de raid.' };
  }
  if (agora >= raid.lobby.iniciaEm) return { ok: false, erro: 'A batalha já vai começar, não dá mais para sair.' };

  delete raid.lobby.jogadores[sender];
  const lobbyVazio = Object.keys(raid.lobby.jogadores).length === 0;
  if (lobbyVazio) raid.lobby = null;

  const user = getUsuario(sender);
  garantirUsuarioRaid(user);
  user.raid.passes = Math.min(CONFIG_RAID.passesMax, user.raid.passes + 1);
  salvarUsuario(sender, user);
  salvar();

  return { ok: true, passes: user.raid.passes, lobbyVazio };
}

// -----------------------------------------
// CAPTURA DO CHEFE (Premier Balls)
// -----------------------------------------
export function calcularChanceRaid(boss, lance, danoRelativo = 0) {
  const base = CAPTURA_BASE[boss.raridade] ?? 0.2;
  const bonusDano = 1 + 0.15 * Math.max(0, Math.min(1, danoRelativo)); // até +15% para quem mais bateu
  return Math.max(0.01, Math.min(0.95, base * lance.mult * bonusDano));
}

export function capturarRaid(jid, sender, rng = Math.random, agora = Date.now()) {
  const raid = getRaid(jid);
  if (!raid || raid.fase !== 'captura') return { ok: false, erro: 'Não há captura de raid aberta neste grupo.' };
  if (agora >= raid.capturaAte) return { ok: false, erro: 'O tempo de captura acabou.' };

  const v = raid.vencedores[sender];
  if (!v) return { ok: false, erro: 'Só quem lutou nesta raid pode capturar o chefe.' };
  if (v.capturou) return { ok: false, erro: 'Você já capturou este chefe! 🎉' };
  if (v.bolas <= 0) return { ok: false, erro: 'Você ficou sem *Premier Balls*. 😢' };

  const lance = sortearPonderado(LANCES, rng);
  const maxDano = Math.max(1, ...Object.values(raid.vencedores).map(x => x.dano));
  const chance = calcularChanceRaid(raid.boss, lance, v.dano / maxDano);

  v.bolas -= 1;
  v.tentativas += 1;
  const sucesso = rng() < chance;

  let pokemon = null;
  if (sucesso) {
    v.capturou = true;
    const extra = raid.tier * CONFIG_RAID.nivelBonusCaptura; // chefes de raid vêm mais fortes
    pokemon = {
      id: raid.boss.id, nome: raid.boss.nome, emoji: raid.boss.emoji, raridade: raid.boss.raridade,
      hp: raid.boss.hp + 5 * extra, atk: raid.boss.atk + 3 * extra, def: raid.boss.def + 3 * extra,
      velocidade: raid.boss.velocidade, img: raid.boss.img,
      level: 1 + extra, felicidade: 50, fome: 50
    };
    const user = getUsuario(sender);
    user.pokemons.push(pokemon);
    salvarUsuario(sender, user);
  }

  // Encerra a raid quando todo mundo já capturou ou ficou sem bolas
  const todosTerminaram = Object.values(raid.vencedores).every(x => x.capturou || x.bolas <= 0);
  if (todosTerminaram) finalizarRaid(jid, agora, rng);
  salvar();

  return {
    ok: true, sucesso, lance, chance, pokemon,
    bolasRestantes: v.bolas, tentativas: v.tentativas,
    raidEncerrada: todosTerminaram, boss: raid.boss, tier: raid.tier
  };
}

// -----------------------------------------
// MENSAGENS ENVIADAS PELO AGENDADOR
// -----------------------------------------
function tag(id) {
  return `@${numeroDe(id)}`;
}

function msgOvo(raid) {
  return {
    texto:
      `🥚 *RAID!* 🥚\n\n` +
      `Um ovo de raid ${TIERS[raid.tier].estrelas} apareceu!\n` +
      `⏰ Eclode em *${CONFIG_RAID.ovoMin} min*\n\n` +
      `💡 Junte seu time! Cada treinador precisa de *1 Passe de Raid* (${PREFIX}passe).\n` +
      `📋 Acompanhe com ${PREFIX}raid`
  };
}

export function textoChefe(raid) {
  const c = TIERS[raid.tier];
  const b = raid.boss;
  return (
    `${b.emoji} *${b.nome}* ${c.estrelas}\n` +
    `❤️ HP do chefe: *${fmtNum(c.hp)}* | ⚔️ ATK: ${b.atk} | 🛡️ DEF: ${b.def}\n` +
    `⏱️ Tempo de batalha: *${fmtTempo(c.rodadas * BALANCO.segundosPorRodada * 1000)}*`
  );
}

function msgAberta(raid, forcada = false) {
  return {
    img: raid.boss.img,
    texto:
      `🔥 *${forcada ? 'RAID (TESTE)' : 'A RAID COMEÇOU'}!* 🔥\n\n` +
      `${textoChefe(raid)}\n` +
      `⏳ Aberta por *${CONFIG_RAID.abertaMin} min*\n\n` +
      `⚔️ Entre com: *${PREFIX}raid entrar* [n1 n2 n3]\n` +
      `_(sem números: seu Pokémon ativo + os mais fortes)_\n` +
      `🎫 Passe de Raid: ${PREFIX}passe`
  };
}

function linhasRanking(jogadores, max = 3) {
  const medalhas = ['🥇', '🥈', '🥉'];
  const linhas = jogadores.slice(0, max).map((j, i) => `${medalhas[i] || '▫️'} ${tag(j.id)} — ${fmtNum(j.dano)} de dano`);
  if (jogadores.length > max) linhas.push(`… e mais ${jogadores.length - max} treinador(es)`);
  return linhas;
}

// -----------------------------------------
// BATALHA + RECOMPENSAS
// -----------------------------------------
function executarBatalha(jid, raid, agora, rng) {
  const tierCfg = TIERS[raid.tier];
  const jogadores = Object.entries(raid.lobby.jogadores).map(([id, j]) => ({ id, nome: j.nome, time: j.time }));
  const res = simularBatalha(raid.boss, tierCfg, jogadores, rng);
  const ids = res.jogadores.map(j => j.id);
  const nomeChefe = `${raid.boss.emoji} *${raid.boss.nome}*`;

  // ---------- DERROTA ----------
  if (!res.vitoria) {
    raid.tentativas += 1;
    raid.lobby = null;

    const restante = raid.fechaEm - agora;
    const podeTentar = restante >= 60 * 1000;
    const linhas = [
      `💀 *RAID PERDIDA!* 💀`,
      ``,
      `${nomeChefe} resistiu!`,
      `❤️ Sobrou *${Math.max(1, Math.round(res.percentualRestante * 100))}%* do HP do chefe (${fmtNum(res.hpRestante)}).`,
      `👥 ${jogadores.length} treinador(es) | 💥 ${fmtNum(res.danoTotal)} de dano no total`,
      ``,
      ...linhasRanking(res.jogadores),
      ``
    ];
    if (podeTentar) linhas.push(`⏳ Ainda dá para tentar de novo! Faltam *${fmtTempo(restante)}*. Use outro passe: ${PREFIX}raid entrar`);
    else linhas.push(`💨 O tempo da raid acabou e o chefe foi embora.`);

    if (!podeTentar) finalizarRaid(jid, agora, rng);
    return { texto: linhas.join('\n'), mentions: ids };
  }

  // ---------- VITÓRIA ----------
  const vencedores = {};
  const subiram = [];

  res.jogadores.forEach((j, rank) => {
    const bonusBolas = rank === 0 ? 2 : rank <= 2 ? 1 : 0;
    const bolas = Math.min(10, tierCfg.bolas + bonusBolas);
    vencedores[j.id] = { nome: j.nome, dano: j.dano, bolas, tentativas: 0, capturou: false };

    const user = getUsuario(j.id);
    const nivelAntes = user.nivel;
    user.pokecoins += tierCfg.coins;
    for (const [item, qtd] of Object.entries(tierCfg.itens)) user.itens[item] = (user.itens[item] || 0) + qtd;
    adicionarXpTreinador(user, tierCfg.xp);
    salvarUsuario(j.id, user);
    if (user.nivel > nivelAntes) subiram.push({ id: j.id, nivel: user.nivel });
  });

  raid.fase = 'captura';
  raid.lobby = null;
  raid.vencedores = vencedores;
  raid.capturaAte = agora + CONFIG_RAID.capturaMin * 60 * 1000;

  const itens = Object.entries(tierCfg.itens).map(([k, q]) => `${q}x ${k}`).join(', ');
  const linhas = [
    `🏆 *RAID VENCIDA!* 🏆`,
    ``,
    `${nomeChefe} foi derrotado em *${fmtTempo(res.tempoSeg * 1000)}*!`,
    `👥 ${jogadores.length} treinador(es) | 💀 ${res.nocautes} nocaute(s)`,
    ``,
    ...linhasRanking(res.jogadores),
    ``,
    `🎁 *Recompensas (todos):* 💰 +${fmtNum(tierCfg.coins)} | ✨ +${fmtNum(tierCfg.xp)} XP | 🍓 ${itens}`
  ];
  for (const s of subiram) linhas.push(`🎉 ${tag(s.id)} subiu para o Nível *${s.nivel}*!`);
  linhas.push(
    ``,
    `🎯 *HORA DE CAPTURAR!* Todos ganharam Premier Balls (mais para quem bateu mais).`,
    `Use *${PREFIX}raid capturar* — você tem *${CONFIG_RAID.capturaMin} min*.`
  );

  return { texto: linhas.join('\n'), mentions: ids };
}

// -----------------------------------------
// ENVIO
// -----------------------------------------
async function baixarImagem(url) {
  try {
    const resposta = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return Buffer.from(await resposta.arrayBuffer());
  } catch (e) {
    console.error('[RAID] Erro ao baixar imagem:', e.message);
    return null;
  }
}

async function enviar(client, jid, p) {
  const extras = p.mentions?.length ? { mentions: p.mentions } : {};
  if (p.img) {
    const buffer = await baixarImagem(p.img);
    if (buffer) {
      try {
        await client.sendMessage(jid, { image: buffer, caption: p.texto, ...extras });
        return;
      } catch (e) {}
    }
  }
  try {
    await client.sendMessage(jid, { text: p.texto, ...extras });
  } catch (e) {
    console.error('[RAID] Erro ao enviar mensagem:', e.message);
  }
}

// -----------------------------------------
// AGENDADOR (roda a cada poucos segundos)
// Toda a mudança de estado é feita e SALVA antes de enviar as mensagens.
// -----------------------------------------
export async function processarRaids(client, agora = Date.now(), rng = Math.random) {
  const db = bd();
  const envios = [];
  let mudou = false;

  // 1) Andamento das raids existentes
  for (const jid of Object.keys(db.raids)) {
    const raid = db.raids[jid];

    if (raid.fase === 'ovo') {
      if (agora >= raid.eclodeEm) {
        raid.fase = 'aberta';
        raid.fechaEm = agora + CONFIG_RAID.abertaMin * 60 * 1000;
        envios.push({ jid, p: msgAberta(raid) });
      }
    } else if (raid.fase === 'aberta') {
      if (raid.lobby && agora >= raid.lobby.iniciaEm) {
        envios.push({ jid, p: executarBatalha(jid, raid, agora, rng) });
      } else if (!raid.lobby && agora >= raid.fechaEm) {
        envios.push({ jid, p: { texto: `💨 O chefe da raid ${raid.boss.emoji} *${raid.boss.nome}* foi embora! Ninguém o enfrentou a tempo.` } });
        finalizarRaid(jid, agora, rng);
      }
    } else if (raid.fase === 'captura') {
      if (agora >= raid.capturaAte) {
        const pegaram = Object.values(raid.vencedores).filter(v => v.capturou).length;
        envios.push({ jid, p: { texto: `⏰ O tempo de captura acabou! ${raid.boss.emoji} *${raid.boss.nome}* foi embora.\n🎯 Capturaram: *${pegaram}* de ${Object.keys(raid.vencedores).length} treinador(es).` } });
        finalizarRaid(jid, agora, rng);
      }
    }
  }

  // 2) Novos ovos nos grupos com raid ligada
  for (const jid of [...db.grupos]) {
    if (db.raids[jid]) continue;
    if (agora < (db.proxima[jid] || 0)) continue;

    const permitido = ajustarHorario(agora, rng);
    if (permitido > agora) { db.proxima[jid] = permitido; mudou = true; continue; } // fora do horário: adia

    const raid = criarRaid(jid, { agora, rng });
    if (raid) envios.push({ jid, p: msgOvo(raid) });
  }

  if (mudou || envios.length > 0) salvar();

  for (const e of envios) await enviar(client, e.jid, e.p);
  return envios.length;
}

let clienteAtual = null;
let intervalo = null;
let rodando = false;

// Chamado a cada (re)conexão; mantém um único agendador
export function iniciarRaids(client) {
  clienteAtual = client;
  if (intervalo) return;

  console.log('[RAID] 🔥 Agendador de raids iniciado.');
  intervalo = setInterval(async () => {
    if (rodando || !clienteAtual) return;
    rodando = true;
    try {
      await processarRaids(clienteAtual);
    } catch (e) {
      console.error('[RAID] Erro no agendador:', e.message);
    } finally {
      rodando = false;
    }
  }, 5000);
  if (intervalo.unref) intervalo.unref();
}

// Comando de teste do dono: abre uma raid agora (sem ovo). Retorna false se já existe uma.
export async function forcarRaid(client, jid, tier, rng = Math.random) {
  const raid = criarRaid(jid, { tier, imediata: true, forcada: true, rng });
  if (!raid) return false;
  await enviar(client, jid, msgAberta(raid, true));
  return true;
}
