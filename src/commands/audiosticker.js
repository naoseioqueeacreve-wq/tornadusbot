import { proto, prepareWAMessageMedia, downloadContentFromMessage } from '@whiskeysockets/baileys';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// =========================================
// FIGURINHA COM ÁUDIO
// Uso: responda a um áudio com o comando.
// Áudios com mais de 60s são recortados automaticamente (precisa de ffmpeg).
// Dica: se enviar uma imagem/figurinha com o comando na legenda
// (respondendo a um áudio), ela vira a capa da figurinha.
// =========================================

const MAX_SEGUNDOS = 60;
const CHAVE_PATCH = Symbol.for('yutabot.audioSticker.encoder');

// Figurinha antiga (usada só como último recurso, o link pode expirar)
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

// Remove capas (ephemeral, viewOnce...) para chegar na mensagem real
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


// Descobre o executável do ffmpeg (sistema ou pacote ffmpeg-static)
async function acharFfmpeg() {
  try {
    const mod = await import('ffmpeg-static');
    if (mod.default) return mod.default;
  } catch {}
  return 'ffmpeg';
}

// Recorta o áudio para no máximo `limite` segundos e devolve um ogg/opus
async function recortarAudio(buffer, limite) {
  const base = path.join(os.tmpdir(), `audsticker_${randomBytes(6).toString('hex')}`);
  const entrada = `${base}.in`;
  const saida = `${base}.ogg`;
  await fs.writeFile(entrada, buffer);

  try {
    const ffmpeg = await acharFfmpeg();
    await new Promise((resolve, reject) => {
      const p = spawn(ffmpeg, [
        '-y', '-i', entrada,
        '-t', String(limite),
        '-vn', '-ac', '1',
        '-c:a', 'libopus', '-b:a', '64k',
        '-f', 'ogg', saida
      ]);
      let erro = '';
      p.stderr.on('data', d => (erro += d));
      p.on('error', e => reject(new Error(
        e.code === 'ENOENT'
          ? 'ffmpeg não está instalado no servidor (rode: npm install ffmpeg-static).'
          : e.message
      )));
      p.on('close', code => (code === 0 ? resolve() : reject(new Error('Falha ao recortar o áudio: ' + erro.slice(-200)))));
    });
    return await fs.readFile(saida);
  } finally {
    fs.unlink(entrada).catch(() => {});
    fs.unlink(saida).catch(() => {});
  }
}

// Baixa o áudio, recorta, sobe de novo e devolve o audioMessage novo
async function prepararAudioRecortado(client, audio, limite) {
  const original = await baixar(audio, 'audio');
  const recortado = await recortarAudio(original, limite);
  const prep = await prepareWAMessageMedia(
    { audio: recortado, mimetype: 'audio/ogg; codecs=opus', ptt: !!audio.ptt },
    { upload: client.waUploadToServer }
  );
  return { ...prep.audioMessage, seconds: limite, ptt: !!audio.ptt };
}

// Gera uma capa 512x512 (ícone de áudio) com sharp, se estiver instalado
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
    return await sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
  } catch {
    return null;
  }
}

// Converte qualquer imagem em webp 512x512
async function paraWebp512(buffer) {
  const sharp = (await import('sharp')).default;
  return sharp(buffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
}

// Descobre a capa: imagem/figurinha enviada junto > capa padrão > figurinha reserva
async function obterCapa(client, msgAtual) {
  try {
    const m = desembrulhar(msgAtual.message || {});
    if (m.stickerMessage) return await baixar(m.stickerMessage, 'sticker');
    if (m.imageMessage) return await paraWebp512(await baixar(m.imageMessage, 'image'));
  } catch (e) {
    console.error('[audiosticker] capa personalizada falhou:', e?.message || e);
  }
  return await gerarCapaPadrao();
}

// Sobe a capa para o WhatsApp e devolve o stickerMessage pronto
async function montarFigurinha(client, webp) {
  if (!webp) return { ...FIGURINHA_RESERVA, stickerSentTs: Date.now() };

  const prep = await prepareWAMessageMedia(
    { sticker: webp },
    { upload: client.waUploadToServer }
  );
  return {
    ...prep.stickerMessage,
    mimetype: 'image/webp',
    width: 512,
    height: 512,
    isAnimated: false,
    stickerSentTs: Date.now()
  };
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

export async function executeAudioSticker(ctx) {
  const { client, msg, jid, reply } = ctx;

  try {
    const atual = desembrulhar(msg.message || {});
    const quoted = desembrulhar(pegarContexto(atual)?.quotedMessage || {});

    // No WhatsApp, áudio e nota de voz são sempre audioMessage (ptt = true)
    const audio = quoted.audioMessage || atual.audioMessage;

    if (!audio) {
      return reply('❌ Responda a um *áudio* ou *nota de voz* com o comando para criar a figurinha com som.');
    }

    const segundos = Number(audio.seconds) || 0;

    await client.sendMessage(jid, { react: { text: '⏳', key: msg.key } }).catch(() => {});

    aplicarPatch();

    const capa = await obterCapa(client, msg);
    const figurinha = await montarFigurinha(client, capa);

    const midia = proto.Message.fromObject({ stickerMessage: figurinha });

    // Se passar do limite, recorta; senão usa o áudio original (sem contextInfo)
    let audioFinal = { ...audio, contextInfo: undefined };
    if (segundos > MAX_SEGUNDOS) {
      audioFinal = await prepararAudioRecortado(client, audio, MAX_SEGUNDOS);
    }
    midia.stickerMessage.audioMessage = audioFinal;

    await client.relayMessage(
      jid,
      {
        audioStickerMessage: { message: midia },
        messageContextInfo: { messageSecret: randomBytes(32) }
      },
      {}
    );

    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } }).catch(() => {});
  } catch (erro) {
    console.error('[audiosticker] erro:', erro);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } }).catch(() => {});
    await reply(`❌ Não foi possível criar a figurinha com áudio: ${erro?.message || erro}`);
  }
}
