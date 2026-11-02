import { PREFIX, API_KEY } from '../config.js';

// =========================================
// FUNÇÃO AUXILIAR: Requisição para API Bronxys
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
// COMANDO: !play-video <nome>
// Baixa vídeo do YouTube
// =========================================
export async function executePlayVideo(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `🎥 *PLAY VIDEO*\n\n` +
      `Use: ${PREFIX}play-video <nome do vídeo>\n` +
      `Exemplo: ${PREFIX}play-video gatinho fofo`
    );
  }

  await reply('🎥 Buscando vídeo...');

  try {
    const data = await buscarAPI(`pesquisa_ytb?nome=${encodeURIComponent(q)}&apikey=${API_KEY}`);

    if (!data || !data[0]) {
      return reply('❌ Vídeo não encontrado. Tente ser mais específico.');
    }

    const video = data[0];

    if (video.tempo && video.tempo.length >= 7) {
      return reply('⏰ Vídeo muito longo (mais de 1 hora). Escolha um mais curto.');
    }

    const legenda = `🎥 *INFORMAÇÕES DO VÍDEO*\n\n` +
      `📌 *Título:* ${video.titulo || 'Não informado'}\n` +
      `⏱️ *Duração:* ${video.tempo || 'Não informado'}\n` +
      `📅 *Postado:* ${video.postado || 'Não informado'}\n\n` +
      `📥 *Baixando vídeo...*`;

    await client.sendMessage(msg.key.remoteJid, {
      image: { url: video.thumb },
      caption: legenda
    }, { quoted: msg });

    await client.sendMessage(msg.key.remoteJid, {
      video: { url: `https://api.bronxyshost.com.br/api-bronxys/play_video?nome_url=${encodeURIComponent(q)}&apikey=${API_KEY}` },
      mimetype: 'video/mp4',
      fileName: `${video.titulo || 'video'}.mp4`,
      caption: `🎵 *${video.titulo}*`
    }, { quoted: msg });

    console.log(`[PLAY-VIDEO] Enviado: ${video.titulo}`);

  } catch (error) {
    console.error('[PLAY-VIDEO] Erro:', error.message);
    return reply('❌ Erro ao baixar o vídeo. Tente novamente.');
  }
}

// =========================================
// COMANDO: !pinterest <nome>
// Busca imagem no Pinterest (com debug)
// =========================================
export async function executePinterest(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `📷 *PINTEREST*\n\n` +
      `Use: ${PREFIX}pinterest <nome>\n` +
      `Exemplo: ${PREFIX}pinterest naruto`
    );
  }

  await reply('🔍 Procurando imagem...');

  try {
    const data = await buscarAPI(`pinterest?nome=${encodeURIComponent(q)}&apikey=${API_KEY}`);

    // DEBUG no console
    console.log('========== DEBUG PINTEREST ==========');
    console.log('Resposta da API:', JSON.stringify(data, null, 2));
    console.log('Tipo:', typeof data);
    console.log('É array?', Array.isArray(data));
    console.log('=====================================\n');

    let imagemUrl = null;

    // Formato 1: Array de strings
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
      imagemUrl = data[Math.floor(Math.random() * data.length)];
    }
    // Formato 2: Array de objetos
    else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const item = data[Math.floor(Math.random() * data.length)];
      imagemUrl = item.url || item.link || item.imagem || item.image || item.src;
    }
    // Formato 3: Objeto único
    else if (data && typeof data === 'object') {
      imagemUrl = data.url || data.link || data.imagem || data.image || data.src || data.resultado;
    }
    // Formato 4: String direta
    else if (typeof data === 'string') {
      imagemUrl = data;
    }

    if (!imagemUrl) {
      return reply(
        `❌ Nenhuma imagem encontrada para *${q}*.\n\n` +
        `💡 Verifique o console do bot para ver o que a API retornou.`
      );
    }

    await client.sendMessage(msg.key.remoteJid, {
      image: { url: imagemUrl },
      caption: `📷 *Pinterest*\n\n🔍 Pesquisa: ${q}`
    }, { quoted: msg });

    console.log(`[PINTEREST] Imagem enviada: ${q}`);

  } catch (error) {
    console.error('[PINTEREST] Erro:', error.message);
    return reply('❌ Erro ao buscar imagem. Tente novamente.');
  }
}

// =========================================
// COMANDO: !animal <nome>
// Busca informações sobre um animal (Wikipedia)
// =========================================
export async function executeAnimal(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `🦁 *ANIMAL*\n\n` +
      `Use: ${PREFIX}animal <nome do animal>\n` +
      `Exemplo: ${PREFIX}animal leão\n` +
      `Exemplo: ${PREFIX}animal tigre`
    );
  }

  await reply('🔍 Buscando informações do animal...');

  try {
    const nomeAnimal = q.trim().toLowerCase();

    const resposta = await fetch(
      `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nomeAnimal)}`,
      { headers: { 'User-Agent': 'MeuBot/1.0' } }
    );

    if (!resposta.ok) {
      return reply(`❌ Não encontrei informações sobre *${q}*. Tente outro nome.`);
    }

    const dados = await resposta.json();

    if (!dados || dados.type === 'disambiguation' || !dados.extract) {
      return reply(`❌ Informação insuficiente sobre *${q}*. Tente o nome científico.`);
    }

    const titulo = dados.title || q;
    const resumo = dados.extract || 'Sem informações disponíveis.';
    const imagem = dados.originalimage?.source || dados.thumbnail?.source || null;

    const resumoLimitado = resumo.length > 900 ? resumo.slice(0, 900) + '...' : resumo;

    const texto = `🦁 *${titulo.toUpperCase()}*\n\n` +
      `📖 *Informações:*\n\n${resumoLimitado}\n\n` +
      `🔗 *Saiba mais:* https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo)}`;

    if (imagem) {
      await client.sendMessage(msg.key.remoteJid, {
        image: { url: imagem },
        caption: texto
      }, { quoted: msg });
    } else {
      await reply(texto);
    }

    console.log(`[ANIMAL] Enviado: ${titulo}`);

  } catch (error) {
    console.error('[ANIMAL] Erro:', error.message);
    return reply('❌ Erro ao buscar informações. Tente novamente.');
  }
}

// =========================================
// COMANDO: !playlist-spotify <nome/gênero>
// Busca uma playlist no Spotify
// =========================================
export async function executePlaylistSpotify(ctx) {
  const { client, msg, q, reply } = ctx;

  if (!q.trim()) {
    return reply(
      `🎵 *PLAYLIST SPOTIFY*\n\n` +
      `Use: ${PREFIX}playlist-spotify <nome ou gênero>\n` +
      `Exemplo: ${PREFIX}playlist-spotify funk\n` +
      `Exemplo: ${PREFIX}playlist-spotify sertanejo`
    );
  }

  await reply('🔍 Procurando playlist...');

  try {
    const endpoint = `pesquisa_spotify?nome=${encodeURIComponent(q)}&apikey=${API_KEY}`;
    const data = await buscarAPI(endpoint);

    console.log('========== DEBUG SPOTIFY ==========');
    console.log('Resposta:', JSON.stringify(data, null, 2));
    console.log('===================================\n');

    if (!data || (!data.playlists && !data.length && !data[0])) {
      const linkBusca = `https://open.spotify.com/search/${encodeURIComponent(q)}`;

      return reply(
        `🎵 *PLAYLIST SPOTIFY*\n\n` +
        `🔍 Busca: *${q}*\n\n` +
        `📎 Não encontrei uma playlist específica, mas aqui está o link para você buscar:\n\n` +
        `🔗 ${linkBusca}`
      );
    }

    const playlists = data.playlists || data;

    if (!Array.isArray(playlists) || playlists.length === 0) {
      return reply(`❌ Nenhuma playlist encontrada para *${q}*.`);
    }

    let texto = `🎵 *PLAYLISTS ENCONTRADAS*\n\n🔍 Busca: *${q}*\n\n`;

    const limite = Math.min(5, playlists.length);

    for (let i = 0; i < limite; i++) {
      const p = playlists[i];
      const nome = p.name || p.nome || p.titulo || 'Playlist';
      const link = p.external_urls?.spotify || p.link || p.url || `https://open.spotify.com/search/${encodeURIComponent(nome)}`;
      const dono = p.owner?.display_name || p.dono || '';

      texto += `*${i + 1}.* ${nome}\n`;
      if (dono) texto += `   👤 ${dono}\n`;
      texto += `   🔗 ${link}\n\n`;
    }

    const primeiraPlaylist = playlists[0];
    const imagem = primeiraPlaylist.images?.[0]?.url || primeiraPlaylist.imagem || null;

    if (imagem) {
      await client.sendMessage(msg.key.remoteJid, {
        image: { url: imagem },
        caption: texto
      }, { quoted: msg });
    } else {
      await reply(texto);
    }

    console.log(`[PLAYLIST-SPOTIFY] Enviado: ${q}`);

  } catch (error) {
    console.error('[PLAYLIST-SPOTIFY] Erro:', error.message);

    const linkBusca = `https://open.spotify.com/search/${encodeURIComponent(q)}`;
    return reply(
      `🎵 *PLAYLIST SPOTIFY*\n\n` +
      `Não consegui buscar automaticamente, mas você pode pesquisar direto:\n\n` +
      `🔗 ${linkBusca}`
    );
  }
}
