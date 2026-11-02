import { PREFIX } from '../config.js';

// =========================================
// FUNÇÃO: Baixar mídia da mensagem
// =========================================
async function baixarMidia(mensagem, tipo) {
  const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
  const stream = await downloadContentFromMessage(mensagem, tipo);

  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

// =========================================
// FUNÇÃO: Criar figurinha via wa-sticker-formatter
// =========================================
async function criarFigurinha(buffer, pack, author, tipo = 'image') {
  try {
    const { Sticker, StickerTypes } = await import('wa-sticker-formatter');

    const sticker = new Sticker(buffer, {
      pack,
      author,
      type: StickerTypes.FULL,
      quality: 70, // Reduzido um pouco para evitar arquivos grandes
      id: Date.now().toString()
    });

    const resultBuffer = await sticker.toBuffer();
    
    // 🔍 VALIDAÇÃO: Se o buffer retornado for o vídeo original (erro na conversão)
    if (tipo === 'video' && resultBuffer.length > 1000000) {
       console.error('[STICKER] Erro: A conversão falhou e retornou o vídeo original.');
       return null;
    }

    return resultBuffer;
  } catch (error) {
    console.error('[STICKER] Erro:', error.message);
    return null;
  }
}

// =========================================
// COMANDO: /s (criar figurinha)
// =========================================
export async function executeSticker(ctx) {
  const { client, msg, pushName, reply } = ctx;
  const jid = msg.key.remoteJid;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted) {
    return reply(
      `🖼️ *COMO USAR O COMANDO S*\n\n` +
      `1. Envie uma foto ou vídeo (até 6s)\n` +
      `2. *RESPONDA* (marque) a mídia\n` +
      `3. Digite: ${PREFIX}s`
    );
  }

  let tipoMidia = null;
  let midiaMsg = null;

  if (quoted.imageMessage) { tipoMidia = 'image'; midiaMsg = quoted.imageMessage; }
  else if (quoted.videoMessage) { tipoMidia = 'video'; midiaMsg = quoted.videoMessage; }
  else if (quoted.stickerMessage) { tipoMidia = 'sticker'; midiaMsg = quoted.stickerMessage; }
  else if (quoted.viewOnceMessage?.message?.imageMessage) {
    tipoMidia = 'image';
    midiaMsg = quoted.viewOnceMessage.message.imageMessage;
  }
  else if (quoted.viewOnceMessage?.message?.videoMessage) {
    tipoMidia = 'video';
    midiaMsg = quoted.viewOnceMessage.message.videoMessage;
  }

  if (!tipoMidia) return reply('❌ Marque uma *foto*, *vídeo* ou *figurinha*.');

  // Avisa o usuário que está processando
  await reply('🎨 Criando figurinha...');

  try {
    const buffer = await baixarMidia(midiaMsg, tipoMidia);
    if (!buffer || buffer.length < 100) return reply('❌ Não consegui baixar a mídia.');

    const nomeAutor = pushName || 'Usuário';
    const stickerBuffer = await criarFigurinha(buffer, 'Freddy Bots', nomeAutor, tipoMidia);

    // Se retornou null, significa que deu erro na conversão
    if (!stickerBuffer) {
      return reply(
        '❌ *Erro ao criar figurinha.*\n\n' +
        '⚠️ Se for um vídeo, verifique se:\n' +
        '1. Tem no máximo 6 segundos.\n' +
        '2. O FFmpeg está instalado no servidor.\n' +
        '3. O arquivo não é muito pesado.'
      );
    }

    // Envia a figurinha convertida
    await client.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
    console.log(`[STICKER] Criada por ${nomeAutor}`);

  } catch (error) {
    console.error('[STICKER] Erro geral:', error.message);
    return reply('❌ Erro interno ao processar a figurinha.');
  }
}

// =========================================
// COMANDO: /take <nome>
// =========================================
export async function executeTake(ctx) {
  const { client, msg, pushName, reply, q } = ctx;
  const jid = msg.key.remoteJid;

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

  if (!quoted?.stickerMessage) {
    return reply(`🏷️ Marque uma figurinha e use: ${PREFIX}take <nome>`);
  }

  const nomeNovo = q.trim() || pushName || 'Usuário';

  await reply('🎨 Renomeando figurinha...');

  try {
    const buffer = await baixarMidia(quoted.stickerMessage, 'sticker');
    if (!buffer || buffer.length < 50) return reply('❌ Não consegui baixar a figurinha.');

    const stickerBuffer = await criarFigurinha(buffer, 'Freddy Bots', nomeNovo, 'sticker');
    if (!stickerBuffer) return reply('❌ Erro ao renomear.');

    await client.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
    console.log(`[TAKE] Renomeada por ${nomeNovo}`);

  } catch (error) {
    console.error('[TAKE] Erro:', error.message);
    return reply('❌ Erro ao renomear.');
  }
}

// =========================================
// COMANDO: /brat <texto> — Figurinha estilo brat
// =========================================
export async function executeBrat(ctx) {
  const { client, msg, reply, q } = ctx;
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
  const { client, msg, reply, q } = ctx;
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
  const { client, msg, reply, q } = ctx;
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
