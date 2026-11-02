import { chamarAPI } from '../functions/api.js';
import { PREFIX } from '../config.js';

export async function executePlay(ctx) {
  const { q, reply, client, msg } = ctx;

  if (!q.trim()) {
    return reply(`🎵 Use: ${PREFIX}play nome da música ou link do YouTube`);
  }

  await reply('🔍 Buscando informações da música...');

  try {
    // 🔍 Busca informações da música na API
    const busca = await chamarAPI('pesquisa_ytb', { nome: q });

    if (!busca.ok || !busca.data || busca.data.length === 0) {
      return reply('❌ Música não encontrada. Tente ser mais específico.');
    }

    const musica = busca.data[0];

    // ⏱️ Verifica se a música não é muito longa (mais de 1 hora)
    if (musica.tempo && musica.tempo.length >= 7) {
      return reply('⏰ Essa música é muito longa (mais de 1 hora). Escolha uma mais curta.');
    }

    // 🖼️ Monta a mensagem com as informações da música
    const infoMusica = `🎵 *INFORMAÇÕES DA MÚSICA*\n\n` +
      `📌 *Título:* ${musica.titulo || 'Não informado'}\n` +
      `👤 *Autor:* ${musica.autor || 'Não informado'}\n` +
      `⏱️ *Duração:* ${musica.tempo || 'Não informado'}\n` +
      `📅 *Postado:* ${musica.postado || 'Não informado'}\n` +
      `👁️ *Visualizações:* ${musica.views || 'Não informado'}\n\n` +
      `⏳ Baixando áudio...`;

    // 🖼️ Envia a capa + informações
    await client.sendMessage(
      msg.key.remoteJid,
      {
        image: { url: musica.thumb || musica.thumbnail || '' },
        caption: infoMusica
      },
      { quoted: msg }
    );

    // 🎵 Baixa e envia o áudio
    const audioUrl = `https://api.bronxyshost.com.br/api-bronxys/play?nome_url=${encodeURIComponent(q)}&apikey=${(await import('../config.js')).API_KEY}`;

    await client.sendMessage(
      msg.key.remoteJid,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${musica.titulo || 'musica'}.mp3`
      },
      { quoted: msg }
    );

    console.log(`[PLAY] Música enviada: ${musica.titulo}`);

  } catch (error) {
    console.error('[PLAY] Erro:', error.message);
    return reply('❌ Erro ao buscar ou baixar a música. Tente novamente.');
  }
}
