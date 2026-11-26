import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as config from '../config.js';

const PREFIX = config.PREFIX || '/';
const PACK_PADRAO = config.BOT_NAME || 'Freddy Bots';

// Limites que o WhatsApp (principalmente o iPhone) aceita
const MAX_BYTES_ESTATICA = 100 * 1024;
const MAX_BYTES_ANIMADA = 500 * 1024;
const MAX_SEGUNDOS_VIDEO = 10;

// =========================================
// LEITURA DA MENSAGEM
// =========================================

// Remove as "capas" da mensagem (temporária, visualização única, editada...)
function desembrulhar(m = {}) {
  for (let i = 0; i < 6; i++) {
    const interno =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message ||
      m.editedMessage?.message;
    if (!interno) break;
    m = interno;
  }
  return m;
}

function pegarContexto(m = {}) {
  return (
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.stickerMessage?.contextInfo ||
    m.documentMessage?.contextInfo ||
    m.audioMessage?.contextInfo ||
    null
  );
}

// Procura uma mídia na própria mensagem (foto/vídeo com o comando na legenda)
// e, se não achar, na mensagem respondida.
function acharMidia(msg, { aceitaSticker = true } = {}) {
  const atual = desembrulhar(msg.message || {});
  const quoted = desembrulhar(pegarContexto(atual)?.quotedMessage || {});

  for (const m of [atual, quoted]) {
    if (m.imageMessage) return { tipo: 'image', midia: m.imageMessage };
    if (m.videoMessage) {
      return { tipo: 'video', midia: m.videoMessage, segundos: Number(m.videoMessage.seconds) || 0 };
    }
    if (aceitaSticker && m.stickerMessage) return { tipo: 'sticker', midia: m.stickerMessage };

    const doc = m.documentMessage;
    if (doc?.mimetype?.startsWith('image/')) return { tipo: 'document-image', midia: doc };
    if (doc?.mimetype?.startsWith('video/')) return { tipo: 'document-video', midia: doc };
  }
  return null;
}

async function baixarMidia(midia, tipo) {
  const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
  const stream = await downloadContentFromMessage(midia, tipo.startsWith('document') ? 'document' : tipo);
  const partes = [];
  for await (const parte of stream) partes.push(parte);
  return Buffer.concat(partes);
}

// =========================================
// FFMPEG
// =========================================

let ffmpegCache = null;
async function acharFfmpeg() {
  if (ffmpegCache) return ffmpegCache;
  try {
    const mod = await import('ffmpeg-static');
    if (mod.default) return (ffmpegCache = mod.default);
  } catch {}
  return (ffmpegCache = 'ffmpeg');
}

async function rodarFfmpeg(args) {
  const bin = await acharFfmpeg();
  await new Promise((resolve, reject) => {
    const p = spawn(bin, ['-y', '-hide_banner', '-loglevel', 'error', ...args]);
    let erro = '';
    p.stderr.on('data', d => (erro += d));
    p.on('error', e => reject(new Error(
      e.code === 'ENOENT'
        ? 'ffmpeg não está instalado no servidor (rode: npm install ffmpeg-static).'
        : e.message
    )));
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(erro.trim().slice(-200) || 'ffmpeg falhou'))));
  });
}

async function comTemporarios(buffer, extsSaida, fn) {
  const base = path.join(os.tmpdir(), `sticker_${randomBytes(6).toString('hex')}`);
  const entrada = `${base}.in`;
  const saidas = extsSaida.map(ext => `${base}.${ext}`);
  await fs.writeFile(entrada, buffer);
  try {
    return await fn(entrada, saidas);
  } finally {
    for (const f of [entrada, ...saidas]) fs.unlink(f).catch(() => {});
  }
}

// =========================================
// NOME DA FIGURINHA (EXIF do WebP)
// =========================================

function criarExif(pack, autor) {
  const json = Buffer.from(JSON.stringify({
    'sticker-pack-id': randomBytes(16).toString('hex'),
    'sticker-pack-name': pack,
    'sticker-pack-publisher': autor,
    emojis: ['🤖']
  }), 'utf-8');
  const cab = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  const exif = Buffer.concat([cab, json]);
  exif.writeUIntLE(json.length, 14, 4);
  return exif;
}

function chunk(id, dados) {
  const cab = Buffer.alloc(8);
  cab.write(id, 0, 'ascii');
  cab.writeUInt32LE(dados.length, 4);
  return Buffer.concat([cab, dados, dados.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

// Grava (ou troca) o EXIF dentro de um WebP sem recodificar a imagem
function injetarExif(webp, exif, largura = 512, altura = 512) {
  if (webp.length < 12 || webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('o arquivo não é um WebP válido');
  }

  let vp8x = null;
  let temAlfa = false;
  const outros = [];
  let pos = 12;
  while (pos + 8 <= webp.length) {
    const id = webp.toString('ascii', pos, pos + 4);
    const tam = webp.readUInt32LE(pos + 4);
    const dados = webp.subarray(pos + 8, pos + 8 + tam);
    pos += 8 + tam + (tam % 2);
    if (id === 'VP8X') vp8x = Buffer.from(dados);
    else if (id === 'EXIF') continue; // descarta o nome antigo
    else {
      if (id === 'VP8L' || id === 'ALPH') temAlfa = true;
      outros.push(chunk(id, dados));
    }
  }

  if (vp8x) {
    vp8x[0] |= 0x08;
  } else {
    vp8x = Buffer.alloc(10);
    vp8x[0] = 0x08 | (temAlfa ? 0x10 : 0);
    vp8x.writeUIntLE(largura - 1, 4, 3);
    vp8x.writeUIntLE(altura - 1, 7, 3);
  }

  const corpo = Buffer.concat([Buffer.from('WEBP'), chunk('VP8X', vp8x), ...outros, chunk('EXIF', exif)]);
  const cab = Buffer.alloc(8);
  cab.write('RIFF', 0, 'ascii');
  cab.writeUInt32LE(corpo.length, 4);
  return Buffer.concat([cab, corpo]);
}

// WebP animado? (flag ANIM do cabeçalho VP8X)
function ehAnimado(webp) {
  return webp.length > 21 && webp.toString('ascii', 12, 16) === 'VP8X' && (webp[20] & 0x02) !== 0;
}

// =========================================
// CONVERSÃO PARA FIGURINHA
// =========================================

// modo: 'cover' (preenche tudo, corta as bordas) | 'contain' (mostra inteira, com bordas transparentes)
async function imagemParaWebp(buffer, modo) {
  const sharp = (await import('sharp')).default;
  const base = sharp(buffer, { animated: false })
    .rotate() // respeita a rotação da foto
    .resize(512, 512, {
      fit: modo,
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });

  let saida;
  for (const q of [85, 70, 55, 40, 28, 18]) {
    saida = await base.clone().webp({ quality: q }).toBuffer();
    if (saida.length <= MAX_BYTES_ESTATICA - 1024) break;
  }
  return saida;
}

async function videoParaWebp(buffer, modo, segundos) {
  const filtro =
    modo === 'cover'
      ? 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512,format=rgba'
      : 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:-1:-1:color=black@0';

  return comTemporarios(buffer, ['webp'], async (entrada, [saida]) => {
    let webp = null;
    for (const [fps, qualidade] of [[15, 45], [12, 35], [10, 25], [8, 18], [8, 10]]) {
      await rodarFfmpeg([
        '-i', entrada, '-t', String(segundos), '-an',
        '-vf', `fps=${fps},${filtro}`,
        '-c:v', 'libwebp', '-loop', '0', '-q:v', String(qualidade), '-preset', 'default',
        '-f', 'webp', saida
      ]);
      webp = await fs.readFile(saida);
      if (webp.length <= MAX_BYTES_ANIMADA - 1024) break;
    }
    return webp;
  });
}

// Plano B: biblioteca wa-sticker-formatter (se estiver instalada)
async function viaBiblioteca(buffer, pack, autor, tipo, modo) {
  const { Sticker, StickerTypes } = await import('wa-sticker-formatter');
  const sticker = new Sticker(buffer, {
    pack,
    author: autor,
    type: modo === 'cover' ? StickerTypes.CROPPED : StickerTypes.FULL,
    quality: 60,
    id: randomBytes(8).toString('hex')
  });
  const saida = await sticker.toBuffer();
  if (tipo.endsWith('video') && saida.length > 1000000) {
    throw new Error('a conversão do vídeo falhou');
  }
  return saida;
}

// Cria a figurinha final (com nome). Devolve { buffer, animada }
async function criarFigurinha({ buffer, tipo, pack, autor, modo = 'cover', segundos = 0 }) {
  const exif = criarExif(pack, autor);
  const ehVideo = tipo === 'video' || tipo === 'document-video';

  try {
    if (ehVideo) {
      const limite = segundos > 0 ? Math.min(segundos, MAX_SEGUNDOS_VIDEO) : MAX_SEGUNDOS_VIDEO;
      const webp = await videoParaWebp(buffer, modo, limite);
      return { buffer: injetarExif(webp, exif), animada: true };
    }
    const webp = await imagemParaWebp(buffer, modo);
    return { buffer: injetarExif(webp, exif), animada: false };
  } catch (erro) {
    console.error('[STICKER] pipeline próprio falhou, tentando plano B:', erro.message);
    try {
      const saida = await viaBiblioteca(buffer, pack, autor, tipo, modo);
      return { buffer: saida, animada: ehVideo };
    } catch (erro2) {
      // devolve o erro mais útil (o do pipeline principal)
      throw new Error(erro.message || erro2.message);
    }
  }
}

// Só troca o nome de uma figurinha que já existe (não recodifica: mantém qualidade e animação)
async function renomearFigurinha(webp, pack, autor) {
  let largura = 512;
  let altura = 512;
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(webp).metadata();
    largura = meta.width || 512;
    altura = (meta.pageHeight || meta.height) || 512;
  } catch {}
  return { buffer: injetarExif(webp, criarExif(pack, autor), largura, altura), animada: ehAnimado(webp) };
}

async function enviarFigurinha(client, jid, msg, { buffer, animada }) {
  await client.sendMessage(jid, { sticker: buffer, isAnimated: animada }, { quoted: msg });
}

const reagir = (client, jid, msg, emoji) =>
  client.sendMessage(jid, { react: { text: emoji, key: msg.key } }).catch(() => {});

// Lê as opções do comando: "full" mostra a imagem inteira (sem cortar)
function lerOpcoes(q = '') {
  const palavras = q.trim().split(/\s+/).filter(Boolean);
  const inteira = palavras.some(p => /^(full|inteira|inteiro|contain)$/i.test(p));
  return { modo: inteira ? 'contain' : 'cover' };
}

// =========================================
// COMANDO: /s (criar figurinha)
// =========================================
export async function executeSticker(ctx) {
  const { client, msg, pushName, reply, q = '' } = ctx;
  const jid = msg.key.remoteJid;

  const achada = acharMidia(msg);

  if (!achada) {
    return reply(
      `🖼️ *COMO CRIAR FIGURINHA*\n\n` +
      `• Envie uma foto/vídeo com *${PREFIX}s* na legenda\n` +
      `• Ou *responda* uma foto, vídeo ou GIF com *${PREFIX}s*\n\n` +
      `✂️ Por padrão a imagem preenche tudo (corta as bordas).\n` +
      `Use *${PREFIX}s full* para mostrar a imagem inteira.\n` +
      `🎬 Vídeos: até ${MAX_SEGUNDOS_VIDEO}s (o que passar é cortado).`
    );
  }

  const nomeAutor = pushName || 'Usuário';
  const { modo } = lerOpcoes(q);

  await reagir(client, jid, msg, '⏳');

  try {
    const buffer = await baixarMidia(achada.midia, achada.tipo);
    if (!buffer || buffer.length < 100) {
      await reagir(client, jid, msg, '❌');
      return reply('❌ Não consegui baixar a mídia. Envie de novo e tente outra vez.');
    }

    const resultado =
      achada.tipo === 'sticker'
        ? await renomearFigurinha(buffer, PACK_PADRAO, nomeAutor)
        : await criarFigurinha({
            buffer,
            tipo: achada.tipo,
            pack: PACK_PADRAO,
            autor: nomeAutor,
            modo,
            segundos: achada.segundos || 0
          });

    await enviarFigurinha(client, jid, msg, resultado);
    await reagir(client, jid, msg, '✅');
    console.log(`[STICKER] Criada por ${nomeAutor} (${achada.tipo}, ${(resultado.buffer.length / 1024).toFixed(0)}KB)`);
  } catch (erro) {
    console.error('[STICKER] Erro:', erro);
    await reagir(client, jid, msg, '❌');
    return reply(
      `❌ *Não consegui criar a figurinha.*\n\n${erro.message || 'Erro desconhecido.'}\n\n` +
      `Se for vídeo, confira se o servidor tem *ffmpeg* (npm install ffmpeg-static).`
    );
  }
}

// =========================================
// COMANDO: /take  (renomear figurinha)
//   /take Nome            -> nome do pacote = Nome, autor = quem usou
//   /take Pacote | Autor  -> define os dois
//   /take                 -> pacote padrão, autor = quem usou
// =========================================
export async function executeTake(ctx) {
  const { client, msg, pushName, reply, q = '' } = ctx;
  const jid = msg.key.remoteJid;

  const achada = acharMidia(msg);

  if (!achada || achada.tipo !== 'sticker') {
    return reply(
      `🏷️ *RENOMEAR FIGURINHA*\n\n` +
      `Responda uma figurinha com:\n` +
      `• *${PREFIX}take Nome*\n` +
      `• *${PREFIX}take Pacote | Autor*`
    );
  }

  const nomeUsuario = pushName || 'Usuário';
  const texto = q.trim();
  let pack = PACK_PADRAO;
  let autor = nomeUsuario;

  if (texto.includes('|')) {
    const [p, ...resto] = texto.split('|');
    pack = p.trim() || PACK_PADRAO;
    autor = resto.join('|').trim() || nomeUsuario;
  } else if (texto) {
    pack = texto;
  }

  pack = pack.slice(0, 60);
  autor = autor.slice(0, 60);

  await reagir(client, jid, msg, '⏳');

  try {
    const buffer = await baixarMidia(achada.midia, 'sticker');
    if (!buffer || buffer.length < 50) {
      await reagir(client, jid, msg, '❌');
      return reply('❌ Não consegui baixar a figurinha. Envie de novo e tente outra vez.');
    }

    const resultado = await renomearFigurinha(buffer, pack, autor);
    await enviarFigurinha(client, jid, msg, resultado);
    await reagir(client, jid, msg, '✅');
    console.log(`[TAKE] Renomeada: pacote="${pack}" autor="${autor}"`);
  } catch (erro) {
    console.error('[TAKE] Erro:', erro);
    await reagir(client, jid, msg, '❌');
    return reply(`❌ Não consegui renomear a figurinha: ${erro.message || 'erro desconhecido'}`);
  }
}

// =========================================
// COMANDO: /brat <texto> — Figurinha estilo brat
// =========================================
export async function executeBrat(ctx) {
  const { client, msg, reply, q = '' } = ctx;
  const jid = msg.key.remoteJid;
  const { API_KEY } = await import('../config.js');

  if (!q.trim()) {
    return reply(
      `🎨 *COMANDO BRAT*\n\n` +
      `Use: ${PREFIX}brat <texto>\n\n` +
      `💡 Exemplo: ${PREFIX}brat É lindo ser Católico\n\n` +
      `📝 Máximo: 60 caracteres`
    );
  }

  const texto = q.trim().substring(0, 60);

  await reply('🎨 Criando figurinha...');

  try {
    const url = `https://api.bronxyshost.com.br/api-bronxys/ttp_white?texto=${encodeURIComponent(texto)}&fonte=Arial&apikey=${API_KEY}`;

    await client.sendMessage(
      jid,
      { sticker: { url } },
      { quoted: msg }
    );

    console.log(`[BRAT] Figurinha criada: "${texto}"`);

  } catch (error) {
    console.error('[BRAT] Erro:', error.message);
    return reply('❌ Erro ao criar figurinha. Tente novamente.');
  }
}

// =========================================
// COMANDO: /bratverde <texto> — Brat clássico (verde)
// =========================================
export async function executeBratVerde(ctx) {
  const { client, msg, reply, q = '' } = ctx;
  const jid = msg.key.remoteJid;
  const { API_KEY } = await import('../config.js');

  if (!q.trim()) {
    return reply(
      `🎨 *BRAT VERDE*\n\n` +
      `Use: ${PREFIX}bratverde <texto>\n\n` +
      `💡 Exemplo: ${PREFIX}bratverde hello world\n\n` +
      `📝 Máximo: 60 caracteres`
    );
  }

  const texto = q.trim().substring(0, 60);

  await reply('🎨 Criando figurinha...');

  try {
    const url = `https://api.bronxyshost.com.br/api-bronxys/ttp_brat?texto=${encodeURIComponent(texto)}&fonte=Arial&apikey=${API_KEY}`;

    await client.sendMessage(
      jid,
      { sticker: { url } },
      { quoted: msg }
    );

    console.log(`[BRAT VERDE] Figurinha criada: "${texto}"`);

  } catch (error) {
    console.error('[BRAT VERDE] Erro:', error.message);
    return reply('❌ Erro ao criar figurinha. Tente novamente.');
  }
}

// =========================================
// COMANDO: /bratvideo <texto> — Brat animado
// =========================================
export async function executeBratVideo(ctx) {
  const { client, msg, reply, q = '' } = ctx;
  const jid = msg.key.remoteJid;
  const { API_KEY } = await import('../config.js');

  if (!q.trim()) {
    return reply(`🎬 Use: ${PREFIX}bratvideo <texto>`);
  }

  const texto = q.trim().substring(0, 60);

  await reply('🎬 Criando figurinha animada...');

  try {
    const url = `https://api.bronxyshost.com.br/api-bronxys/attp_white_video?texto=${encodeURIComponent(texto)}&fonte=Arial&type=video&apikey=${API_KEY}`;

    await client.sendMessage(
      jid,
      { video: { url }, mimetype: 'video/mp4', gifPlayback: true },
      { quoted: msg }
    );

    console.log(`[BRAT VIDEO] Figurinha criada: "${texto}"`);

  } catch (error) {
    console.error('[BRAT VIDEO] Erro:', error.message);
    return reply('❌ Erro ao criar vídeo. Tente novamente.');
  }
}

// usado apenas em testes
export const _interno = { acharMidia, criarFigurinha, renomearFigurinha, injetarExif, ehAnimado, lerOpcoes };
