import { proto, prepareWAMessageMedia, downloadContentFromMessage } from '@whiskeysockets/baileys';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as config from '../config.js';

// =========================================
// FIGURINHA COM ÁUDIO
//  /audiosticker      -> responda a um áudio OU a um vídeo
//  /audiosticker 1    -> usa o ÁUDIO QUE VOCÊ MARCOU (responda a um áudio e envie/anexe um vídeo, ou só o áudio)
//  /audiosticker 2    -> usa o ÁUDIO DO VÍDEO
//  O vídeo (até 10s, recorta se passar) vira a figurinha animada; sem vídeo, usa uma capa
//  (imagem/figurinha enviada junto, ou a capa padrão). Áudio marcado: até 60s (recorta se passar).
// Precisa de ffmpeg (npm install ffmpeg-static) e, para a capa padrão, sharp.
// =========================================

const MAX_SEGUNDOS_AUDIO = 60;
const MAX_SEGUNDOS_VIDEO = 10;
// Limites que o iPhone aceita (acima disso a figurinha não aparece no iOS)
const MAX_BYTES_ANIMADA = 500 * 1024;
const MAX_BYTES_ESTATICA = 100 * 1024;
const CHAVE_PATCH = Symbol.for('yutabot.audioSticker.encoder');

// ---- Dados que aparecem no nome da figurinha ----
// Nome do bot e número do dono são lidos do config.js (ajuste os nomes abaixo se forem outros).
const NOME_BOT = config.BOT_NAME || 'Bot';
const NUMERO_DONO =
  config.OWNER_NUMBER || config.NUMERO_DONO || config.DONO_NUMERO ||
  config.OWNER_NUMERO || config.DONO || config.OWNER || 'Não informado';

// Figurinha antiga (último recurso, o link pode expirar)
const FIGURINHA_RESERVA = {
  url: 'https://mmg.whatsapp.net/v/t62.15575-24/914418802_998776306001430_6861763622615627779_n.enc?ccb=11-4&oh=01_Q5Aa6AGUK9fRcG3CtBG_FTfVDGk-sp57A8_C35_nPqvyg3tGTg&oe=6B268895&_nc_sid=5e03e0&mms3=true',
  fileSha256: Buffer.from('l8qenAIPd+CWzPtGGdCaqyrTmzRRUM7xjxxSM96/EYE=', 'base64'),
  fileEncSha256: Buffer.from('nSjnSv8U+3uEmDgJJBMqDgA8k+O6DptnIrvRIHkOdoM=', 'base64'),
  mediaKey: Buffer.from('nWG+qHli3scYN31FAJAgejf6w2oNHy1jWhlVZIv17B0=', 'base64'),
  mimetype: 'image/webp',
  height: 512,
  width: 512,
  directPath: '/v/t62.15575-24/914418802_998776306001430_6861763622615627779_n.enc?ccb=11-4&oh=01_Q5Aa6AGUK9fRcG3CtBG_FTfVDGk-sp57A8_C35_nPqvyg3tGTg&oe=6B268895&_nc_sid=5e03e0',
  fileLength: 48734,
  mediaKeyTimestamp: 1794962736,
  isAnimated: false
};

// =========================================
// UTILITÁRIOS DE MENSAGEM
// =========================================

function desembrulhar(m = {}) {
  for (let i = 0; i < 5; i++) {
    const interno =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.documentWithCaptionMessage?.message;
    if (!interno) break;
    m = interno;
  }
  return m;
}

function pegarContexto(m) {
  return (
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.audioMessage?.contextInfo ||
    m.stickerMessage?.contextInfo ||
    null
  );
}

async function baixar(midia, tipo) {
  const stream = await downloadContentFromMessage(midia, tipo);
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

// Cria arquivos temporários e apaga tudo no final
async function comTemporarios(buffer, extsSaida, fn) {
  const base = path.join(os.tmpdir(), `audsticker_${randomBytes(6).toString('hex')}`);
  const entrada = `${base}.in`;
  const saidas = extsSaida.map(ext => `${base}.${ext}`);
  await fs.writeFile(entrada, buffer);
  try {
    return await fn(entrada, saidas);
  } finally {
    for (const f of [entrada, ...saidas]) fs.unlink(f).catch(() => {});
  }
}

const ARGS_AUDIO = ['-vn', '-ac', '1', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg'];

// Recorta um áudio para no máximo `limite` segundos (ogg/opus)
async function recortarAudio(buffer, limite) {
  return comTemporarios(buffer, ['ogg'], async (entrada, [saida]) => {
    await rodarFfmpeg(['-i', entrada, '-t', String(limite), ...ARGS_AUDIO, saida]);
    return fs.readFile(saida);
  });
}

// Vídeo -> { webp animado 512x512, áudio ogg (ou null se o vídeo não tem som) }
async function processarVideo(buffer, limite, extrairAudio = true) {
  return comTemporarios(buffer, ['webp', 'ogg'], async (entrada, [webpPath, oggPath]) => {
    let webp = null;
    for (const [fps, qualidade] of [[15, 45], [12, 35], [10, 25], [8, 18], [8, 10]]) {
      await rodarFfmpeg([
        '-i', entrada, '-t', String(limite), '-an',
        '-vf', `fps=${fps},scale=512:512:force_original_aspect_ratio=increase,crop=512:512,format=rgba`,
        '-c:v', 'libwebp', '-loop', '0', '-q:v', String(qualidade), '-preset', 'default',
        '-f', 'webp', webpPath
      ]);
      webp = await fs.readFile(webpPath);
      if (webp.length <= MAX_BYTES_ANIMADA - 1024) break; // iPhone só mostra animada até 500KB
    }

    let ogg = null;
    if (!extrairAudio) return { webp, ogg };
    try {
      await rodarFfmpeg(['-i', entrada, '-t', String(limite), ...ARGS_AUDIO, oggPath]);
      ogg = await fs.readFile(oggPath);
      if (!ogg.length) ogg = null;
    } catch {
      ogg = null; // vídeo sem trilha de áudio
    }
    return { webp, ogg };
  });
}

// =========================================
// NOME DA FIGURINHA (EXIF do WebP)
// =========================================

function montarTextoFigurinha(nomeUsuario) {
  return [
    '✨ 𝗙𝗜𝗚𝗨𝗥𝗜𝗡𝗛𝗔 𝗖𝗢𝗠 𝗔́𝗨𝗗𝗜𝗢 ✨',
    '',
    `🤖 Criado por: ${NOME_BOT}`,
    `👑 Número do dono: ${NUMERO_DONO}`,
    `👤 Quem criou: ${nomeUsuario}`
  ].join('\n');
}

function criarExif(nomePack, autor) {
  const json = Buffer.from(JSON.stringify({
    'sticker-pack-id': randomBytes(16).toString('hex'),
    'sticker-pack-name': nomePack,
    'sticker-pack-publisher': autor,
    emojis: ['🎧']
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

// Grava (ou troca) o EXIF dentro de um WebP, sem depender de bibliotecas
function injetarExif(webp, exif) {
  if (webp.length < 12 || webp.toString('ascii', 0, 4) !== 'RIFF' || webp.toString('ascii', 8, 12) !== 'WEBP') {
    return webp;
  }

  let vp8x = null;
  let temAlfaImplicito = false;
  const outros = [];
  let pos = 12;
  while (pos + 8 <= webp.length) {
    const id = webp.toString('ascii', pos, pos + 4);
    const tam = webp.readUInt32LE(pos + 4);
    const dados = webp.subarray(pos + 8, pos + 8 + tam);
    pos += 8 + tam + (tam % 2);
    if (id === 'VP8X') vp8x = Buffer.from(dados);
    else if (id === 'EXIF') continue;
    else {
      if (id === 'VP8L' || id === 'ALPH') temAlfaImplicito = true;
      outros.push(chunk(id, dados));
    }
  }

  if (vp8x) {
    vp8x[0] |= 0x08;
  } else {
    vp8x = Buffer.alloc(10);
    vp8x[0] = 0x08 | (temAlfaImplicito ? 0x10 : 0);
    vp8x.writeUIntLE(512 - 1, 4, 3); // largura
    vp8x.writeUIntLE(512 - 1, 7, 3); // altura
  }

  const corpo = Buffer.concat([Buffer.from('WEBP'), chunk('VP8X', vp8x), ...outros, chunk('EXIF', exif)]);
  const cab = Buffer.alloc(8);
  cab.write('RIFF', 0, 'ascii');
  cab.writeUInt32LE(corpo.length, 4);
  return Buffer.concat([cab, corpo]);
}

// =========================================
// CAPA (imagem estática)
// =========================================

async function gerarCapaPadrao() {
  try {
    const sharp = (await import('sharp')).default;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#7c3aed"/>
            <stop offset="1" stop-color="#ec4899"/>
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="96" fill="url(#g)"/>
        <path d="M150 210h70l90-70v232l-90-70h-70z" fill="#fff"/>
        <path d="M350 200q40 56 0 112" stroke="#fff" stroke-width="22" fill="none" stroke-linecap="round"/>
        <path d="M385 160q76 96 0 192" stroke="#fff" stroke-width="22" fill="none" stroke-linecap="round" opacity=".7"/>
      </svg>`;
    return await webpLeve(sharp(Buffer.from(svg)));
  } catch {
    return null;
  }
}

async function paraWebp512(buffer) {
  const sharp = (await import('sharp')).default;
  return webpLeve(sharp(buffer).resize(512, 512, { fit: 'cover', position: 'centre' }));
}

// Gera o WebP baixando a qualidade até ficar abaixo de 100KB (limite do iPhone)
async function webpLeve(pipeline) {
  let saida;
  for (const q of [90, 75, 60, 45, 30, 20]) {
    saida = await pipeline.clone().webp({ quality: q }).toBuffer();
    if (saida.length <= MAX_BYTES_ESTATICA - 1024) break;
  }
  return saida;
}

async function obterCapa(msgAtual) {
  try {
    const m = desembrulhar(msgAtual.message || {});
    if (m.stickerMessage) return await baixar(m.stickerMessage, 'sticker');
    if (m.imageMessage) return await paraWebp512(await baixar(m.imageMessage, 'image'));
  } catch (e) {
    console.error('[audiosticker] capa personalizada falhou:', e?.message || e);
  }
  return await gerarCapaPadrao();
}

// =========================================
// MONTAGEM DA MENSAGEM
// =========================================

async function montarFigurinha(client, webp, animada, exif) {
  if (!webp) return { ...FIGURINHA_RESERVA, stickerSentTs: Date.now() };

  const comNome = injetarExif(webp, exif);
  const prep = await prepareWAMessageMedia(
    { sticker: comNome },
    { upload: client.waUploadToServer }
  );
  const figurinha = {
    ...prep.stickerMessage,
    mimetype: 'image/webp',
    width: 512,
    height: 512,
    isAnimated: !!animada,
    contextInfo: {},
    stickerSentTs: Date.now(),
    isAvatar: false,
    isAiSticker: false,
    isLottie: false
  };
  // guarda o arquivo final (não vai dentro da mensagem) para a cópia do iPhone
  Object.defineProperty(figurinha, '_webp', { value: comNome, enumerable: false });
  return figurinha;
}

function gerarWaveform() {
  return new Uint8Array(Array.from({ length: 64 }, () => 15 + Math.floor(Math.random() * 70)));
}

// Sobe um áudio ogg/opus como nota de voz e devolve o audioMessage
async function subirAudio(client, ogg, segundos) {
  const prep = await prepareWAMessageMedia(
    { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: true },
    { upload: client.waUploadToServer }
  );
  return { ...prep.audioMessage, seconds: Math.max(1, Math.round(segundos)) };
}

// Ensina o encoder do Baileys a gravar o áudio dentro da figurinha
function aplicarPatch() {
  const Msg = proto.Message;

  if (
    typeof Msg.encode !== 'function' ||
    typeof Msg.FutureProofMessage?.encode !== 'function' ||
    typeof Msg.StickerMessage?.encode !== 'function' ||
    typeof Msg.AudioMessage?.encode !== 'function'
  ) {
    throw new Error('Esta versão do Baileys não suporta figurinha com áudio.');
  }

  if (Msg[CHAVE_PATCH]) return;

  const tipos = [
    [Msg, 'audioStickerMessage', 1074, Msg.FutureProofMessage],
    [Msg.StickerMessage, 'audioMessage', 210, Msg.AudioMessage]
  ];

  for (const [tipo, campo, tag, schema] of tipos) {
    const original = tipo.encode;
    tipo.encode = function (mensagem, writer) {
      const resultado = original.call(this, mensagem, writer);
      if (mensagem?.[campo]) {
        return schema.encode(mensagem[campo], resultado.uint32(tag).fork()).ldelim();
      }
      return resultado;
    };
  }

  Object.defineProperty(Msg, CHAVE_PATCH, { value: true });
}

// =========================================
// COMANDO
// =========================================

export async function executeAudioSticker(ctx) {
  const { client, msg, jid, reply, pushName, args = [] } = ctx;

  try {
    const atual = desembrulhar(msg.message || {});
    const quoted = desembrulhar(pegarContexto(atual)?.quotedMessage || {});

    // Vídeo = visual da figurinha (anexado agora ou respondido)
    const video = atual.videoMessage || quoted.videoMessage || null;
    // Áudio que a pessoa marcou (respondeu)
    const audioMarcado = quoted.audioMessage || atual.audioMessage || null;

    // Escolha: 1 = áudio marcado | 2 = áudio do vídeo
    const ehIos = a => /^(ios|iphone)$/i.test(String(a));
    const enviarCopiaIos = args.some(ehIos);
    const escolhaTxt = String(args.filter(a => !ehIos(a))[0] ?? '').trim();
    let escolha = escolhaTxt === '1' ? 1 : escolhaTxt === '2' ? 2 : 0;

    if (!video && !audioMarcado) {
      return reply(
        '❌ *Como usar:*\n' +
        '• Responda a um *áudio* com o comando\n' +
        '• Responda a um *vídeo* (até 10s) com o comando\n' +
        '• Responda a um áudio e anexe um *vídeo* com:\n' +
        '   *1* → usa o áudio que você marcou\n' +
        '   *2* → usa o áudio do vídeo\n' +
        '• Adicione *ios* (ex: /audiosticker 2 ios) para enviar também uma cópia comum que aparece no iPhone'
      );
    }

    if (escolhaTxt && !escolha) {
      return reply('❌ Opção inválida. Use *1* (áudio que você marcou) ou *2* (áudio do vídeo).');
    }
    if (!escolha) escolha = audioMarcado ? 1 : 2; // padrão

    if (escolha === 1 && !audioMarcado) {
      return reply('❌ Para usar a opção *1*, responda (marque) um *áudio*.');
    }
    if (escolha === 2 && !video) {
      return reply('❌ Para usar a opção *2*, envie ou responda a um *vídeo* com som.');
    }

    await client.sendMessage(jid, { react: { text: '⏳', key: msg.key } }).catch(() => {});
    aplicarPatch();

    const nomeUsuario = pushName || 'Usuário';
    const exif = criarExif(montarTextoFigurinha(nomeUsuario), NOME_BOT);

    // ---------- VISUAL DA FIGURINHA ----------
    let figurinha;
    let oggDoVideo = null;
    let segundosVideo = MAX_SEGUNDOS_VIDEO;

    if (video) {
      const segVideo = Number(video.seconds) || 0;
      segundosVideo = segVideo > 0 ? Math.min(segVideo, MAX_SEGUNDOS_VIDEO) : MAX_SEGUNDOS_VIDEO;

      const { webp, ogg } = await processarVideo(
        await baixar(video, 'video'),
        MAX_SEGUNDOS_VIDEO,
        escolha === 2
      );
      oggDoVideo = ogg;

      if (escolha === 2 && !ogg) {
        await client.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
        return reply('❌ Esse vídeo não tem áudio. Marque um áudio e use a opção *1*, ou use um vídeo com som.');
      }
      figurinha = await montarFigurinha(client, webp, true, exif);
    } else {
      const capa = await obterCapa(msg);
      figurinha = await montarFigurinha(client, capa, false, exif);
    }

    // ---------- ÁUDIO DA FIGURINHA ----------
    let audioFinal;

    if (escolha === 2) {
      audioFinal = await subirAudio(client, oggDoVideo, segundosVideo);
    } else {
      const segundos = Number(audioMarcado.seconds) || 0;
      if (segundos > MAX_SEGUNDOS_AUDIO) {
        const recortado = await recortarAudio(await baixar(audioMarcado, 'audio'), MAX_SEGUNDOS_AUDIO);
        audioFinal = await subirAudio(client, recortado, MAX_SEGUNDOS_AUDIO);
      } else {
        audioFinal = { ...audioMarcado, contextInfo: undefined, seconds: segundos || 1 };
        if (!audioFinal.mimetype) audioFinal.mimetype = 'audio/ogg; codecs=opus';
      }
    }

    // Figurinha com som toca como nota de voz (ptt)
    audioFinal.ptt = true;
    if (!audioFinal.waveform?.length) audioFinal.waveform = gerarWaveform();

    const midia = proto.Message.fromObject({ stickerMessage: figurinha });
    midia.stickerMessage.audioMessage = audioFinal;

    console.log('[audiosticker] envio:', {
      visual: video ? 'video' : 'capa',
      audio: escolha === 1 ? 'marcado' : 'do-video',
      seconds: audioFinal.seconds, ptt: audioFinal.ptt, mimetype: audioFinal.mimetype,
      temUrl: !!(audioFinal.url || audioFinal.directPath), temChave: !!audioFinal.mediaKey
    });

    await client.relayMessage(
      jid,
      {
        audioStickerMessage: { message: midia },
        messageContextInfo: { messageSecret: randomBytes(32) }
      },
      {}
    );

    // Cópia comum (sem som) para quem usa iPhone: o formato com áudio só aparece no Android
    if (enviarCopiaIos && figurinha._webp) {
      await client.sendMessage(jid, { sticker: figurinha._webp }).catch(e =>
        console.error('[audiosticker] cópia iPhone falhou:', e?.message || e)
      );
    }

    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } }).catch(() => {});
  } catch (erro) {
    console.error('[audiosticker] erro:', erro);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
    await reply(`❌ Não foi possível criar a figurinha com áudio: ${erro?.message || erro}`);
  }
}
