import { PREFIX, API_KEY } from '../config.js';

// =========================================
// FUNÇÃO AUXILIAR
// =========================================
async function buscarAPI(endpoint) {
  const url = `https://api.bronxyshost.com.br/api-bronxys/${endpoint}`;
  const resposta = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'pt-BR'
    }
  });
  return resposta.json();
}

// =========================================
// COMANDO: !ytmp3 <link>
// Baixa áudio do YouTube por link
// =========================================
export async function executeYtmp3(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `🎵 *YTMP3*\n\n` +
      `Use: ${PREFIX}ytmp3 <link do YouTube>\n` +
      `Exemplo: ${PREFIX}ytmp3 https://youtu.be/xxxxx`
    );
  }

  if (!q.includes('youtu')) {
    return reply('❌ Envie um link válido do YouTube.');
  }

  await reply('🎵 Processando áudio...');

  try {
    const data = await buscarAPI(`pesquisa_ytb?nome=${encodeURIComponent(q)}&apikey=${API_KEY}`);

    if (!data || !data[0]) {
      return reply('❌ Não consegui obter informações do vídeo.');
    }

    const video = data[0];

    const legenda = `🎵 *YTMP3*\n\n` +
      `📌 *Título:* ${video.titulo || 'Não informado'}\n` +
      `⏱️ *Duração:* ${video.tempo || 'Não informado'}\n\n` +
      `📥 Enviando áudio...`;

    await client.sendMessage(msg.key.remoteJid, {
      image: { url: video.thumb },
      caption: legenda
    }, { quoted: msg });

    await client.sendMessage(msg.key.remoteJid, {
      audio: { url: `https://api.bronxyshost.com.br/api-bronxys/play?nome_url=${encodeURIComponent(q)}&apikey=${API_KEY}` },
      mimetype: 'audio/mpeg',
      fileName: `${video.titulo || 'audio'}.mp3`
    }, { quoted: msg });

    console.log(`[YTMP3] Enviado: ${video.titulo}`);

  } catch (error) {
    console.error('[YTMP3] Erro:', error.message);
    return reply('❌ Erro ao baixar o áudio. Tente novamente.');
  }
}

// =========================================
// COMANDO: !ytmp4 <link>
// Baixa vídeo do YouTube por link
// =========================================
export async function executeYtmp4(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `🎥 *YTMP4*\n\n` +
      `Use: ${PREFIX}ytmp4 <link do YouTube>\n` +
      `Exemplo: ${PREFIX}ytmp4 https://youtu.be/xxxxx`
    );
  }

  if (!q.includes('youtu')) {
    return reply('❌ Envie um link válido do YouTube.');
  }

  await reply('🎥 Processando vídeo...');

  try {
    const data = await buscarAPI(`pesquisa_ytb?nome=${encodeURIComponent(q)}&apikey=${API_KEY}`);

    if (!data || !data[0]) {
      return reply('❌ Não consegui obter informações do vídeo.');
    }

    const video = data[0];

    if (video.tempo && video.tempo.length >= 7) {
      return reply('⏰ Vídeo muito longo (mais de 1h). Escolha um mais curto.');
    }

    const legenda = `🎥 *YTMP4*\n\n` +
      `📌 *Título:* ${video.titulo || 'Não informado'}\n` +
      `⏱️ *Duração:* ${video.tempo || 'Não informado'}\n\n` +
      `📥 Enviando vídeo...`;

    await client.sendMessage(msg.key.remoteJid, {
      image: { url: video.thumb },
      caption: legenda
    }, { quoted: msg });

    await client.sendMessage(msg.key.remoteJid, {
      video: { url: `https://api.bronxyshost.com.br/api-bronxys/play_video?nome_url=${encodeURIComponent(q)}&apikey=${API_KEY}` },
      mimetype: 'video/mp4',
      fileName: `${video.titulo || 'video'}.mp4`
    }, { quoted: msg });

    console.log(`[YTMP4] Enviado: ${video.titulo}`);

  } catch (error) {
    console.error('[YTMP4] Erro:', error.message);
    return reply('❌ Erro ao baixar o vídeo. Tente novamente.');
  }
}

// =========================================
// COMANDO: !snapchat <link>
// Baixa vídeos do Snapchat
// =========================================
export async function executeSnapchat(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `👻 *SNAPCHAT*\n\n` +
      `Use: ${PREFIX}snapchat <link>\n` +
      `Exemplo: ${PREFIX}snapchat https://www.snapchat.com/...`
    );
  }

  if (!q.includes('snapchat')) {
    return reply('❌ Envie um link válido do Snapchat.');
  }

  await reply('👻 Processando...');

  try {
    const data = await buscarAPI(`snapchat?url=${encodeURIComponent(q)}&apikey=${API_KEY}`);

    const videoUrl = data?.video || data?.url || data?.link || data?.resultado;

    if (!videoUrl) {
      return reply('❌ Não consegui baixar este Snap.');
    }

    await client.sendMessage(msg.key.remoteJid, {
      video: { url: videoUrl },
      mimetype: 'video/mp4'
    }, { quoted: msg });

    console.log(`[SNAPCHAT] Enviado`);

  } catch (error) {
    console.error('[SNAPCHAT] Erro:', error.message);
    return reply('❌ Erro ao processar o Snap. Tente novamente.');
  }
}

// =========================================
// COMANDO: !gdrive <link>
// Baixa arquivos do Google Drive
// =========================================
export async function executeGdrive(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `📂 *GDRIVE*\n\n` +
      `Use: ${PREFIX}gdrive <link>\n` +
      `Exemplo: ${PREFIX}gdrive https://drive.google.com/file/d/xxx/view`
    );
  }

  if (!q.includes('drive.google.com') && !q.includes('docs.google.com')) {
    return reply('❌ Envie um link válido do Google Drive.');
  }

  await reply('📂 Processando arquivo...');

  try {
    const data = await buscarAPI(`gdrive?url=${encodeURIComponent(q)}&apikey=${API_KEY}`);

    const fileUrl = data?.download || data?.url || data?.link || data?.resultado;
    const fileName = data?.nome || data?.name || data?.titulo || 'arquivo';
    const fileSize = data?.tamanho || data?.size || 'desconhecido';

    if (!fileUrl) {
      return reply('❌ Não consegui baixar este arquivo.');
    }

    await client.sendMessage(msg.key.remoteJid, {
      document: { url: fileUrl },
      mimetype: 'application/octet-stream',
      fileName: fileName
    }, { quoted: msg });

    console.log(`[GDRIVE] Enviado: ${fileName} (${fileSize})`);

  } catch (error) {
    console.error('[GDRIVE] Erro:', error.message);
    return reply('❌ Erro ao baixar do Google Drive. Tente novamente.');
  }
}

// =========================================
// COMANDO: !reddit <link>
// Baixa vídeos/imagens do Reddit
// =========================================
export async function executeReddit(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `🟠 *REDDIT*\n\n` +
      `Use: ${PREFIX}reddit <link>\n` +
      `Exemplo: ${PREFIX}reddit https://www.reddit.com/r/xxx/...`
    );
  }

  if (!q.includes('reddit.com')) {
    return reply('❌ Envie um link válido do Reddit.');
  }

  await reply('🟠 Processando...');

  try {
    const data = await buscarAPI(`reddit?url=${encodeURIComponent(q)}&apikey=${API_KEY}`);

    const mediaUrl = data?.video || data?.url || data?.link || data?.resultado;
    const tipo = data?.tipo || data?.type || 'video';

    if (!mediaUrl) {
      return reply('❌ Não consegui baixar este conteúdo.');
    }

    // Se for vídeo
    if (tipo === 'video' || mediaUrl.includes('.mp4')) {
      await client.sendMessage(msg.key.remoteJid, {
        video: { url: mediaUrl },
        mimetype: 'video/mp4'
      }, { quoted: msg });
    } else {
      // Se for imagem
      await client.sendMessage(msg.key.remoteJid, {
        image: { url: mediaUrl }
      }, { quoted: msg });
    }

    console.log(`[REDDIT] Enviado`);

  } catch (error) {
    console.error('[REDDIT] Erro:', error.message);
    return reply('❌ Erro ao baixar do Reddit. Tente novamente.');
  }
}
