import { PREFIX } from '../config.js';

// 🔑 Token da Yuta API
const YUTA_TOKEN = "yuta_9bfa99cced64a546e7b775d86a2670899d287015e4320276";

// Função auxiliar para requisições
async function fetchYuta(endpoint, params = {}) {
  const query = new URLSearchParams({ ...params, apitoken: YUTA_TOKEN });
  const url = `https://yuta-apis.xyz/api/${endpoint}?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
  return res.json();
}

// Função auxiliar para baixar mídia (retorna Buffer)
async function fetchYutaBuffer(endpoint, params = {}) {
  const query = new URLSearchParams({ ...params, apitoken: YUTA_TOKEN });
  const url = `https://yuta-apis.xyz/api/${endpoint}?${query.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Reações
async function react(ctx, emoji) {
  try {
    await ctx.client.sendMessage(ctx.msg.key.remoteJid, { 
      react: { text: emoji, key: ctx.msg.key } 
    });
  } catch (e) {}
}

// =========================================
// COMANDO: !letra (lyrics_search)
// =========================================
export async function executeLetra(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}letra <nome da música>*`);

  await react(ctx, '⏳');
  try {
    const data = await fetchYuta('pesquisas/lyrics_search', { query: q.trim() });
    if (!data || !data.lyrics) {
      await react(ctx, '❌');
      return reply('❌ Letra não encontrada.');
    }

    const texto = `🎵 *${data.title || q.trim()}*\n👤 *Artista:* ${data.artist || 'Desconhecido'}\n\n${data.lyrics}`;
    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[LETRA]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar a letra.');
  }
}

// =========================================
// COMANDO: !ytsearch
// =========================================
export async function executeYtSearch(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}ytsearch <termo>*`);

  await react(ctx, '⏳');
  try {
    const data = await fetchYuta('pesquisas/ytsearch', { query: q.trim() });
    if (!Array.isArray(data) || data.length === 0) {
      await react(ctx, '❌');
      return reply('❌ Nenhum vídeo encontrado.');
    }

    let texto = `🔍 *RESULTADOS DO YOUTUBE*\n\n`;
    data.slice(0, 5).forEach((v, i) => {
      texto += `*${i + 1}. ${v.title}*\n⏱️ ${v.duration} | 👁️ ${v.views}\n🔗 ${v.url}\n\n`;
    });

    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[YTSEARCH]', error);
    await react(ctx, '❌');
    return reply('❌ Erro na pesquisa do YouTube.');
  }
}

// =========================================
// COMANDO: !playstore
// =========================================
export async function executePlayStore(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}playstore <app>*`);

  await react(ctx, '⏳');
  try {
    const data = await fetchYuta('pesquisas/playstore', { query: q.trim() });
    if (!Array.isArray(data) || data.length === 0) {
      await react(ctx, '❌');
      return reply('❌ Nenhum app encontrado.');
    }

    let texto = `📱 *PLAY STORE*\n\n`;
    data.slice(0, 3).forEach((app, i) => {
      texto += `*${i + 1}. ${app.name}*\n🔗 ${app.url}\n\n`;
    });

    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[PLAYSTORE]', error);
    await react(ctx, '❌');
    return reply('❌ Erro na busca da Play Store.');
  }
}

// =========================================
// COMANDO: !pinterest (Baixa imagem)
// =========================================
export async function executePinterest(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}pinterest <busca>*`);

  await react(ctx, '⏳');
  try {
    const buffer = await fetchYutaBuffer('downloads/pinterest', { query: q.trim() });
    await client.sendMessage(msg.key.remoteJid, { 
      image: buffer, 
      caption: `📌 *Pinterest:* ${q.trim()}` 
    }, { quoted: msg });
    await react(ctx, '✅');
  } catch (error) {
    console.error('[PINTEREST]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar imagem no Pinterest.');
  }
}

// =========================================
// COMANDO: !metadinha
// =========================================
export async function executeMetadinha(ctx) {
  const { reply, client, msg } = ctx;
  
  await react(ctx, '⏳');
  try {
    const data = await fetchYuta('animes/metadinha');
    if (!data || !data.link1 || !data.link2) {
      await react(ctx, '❌');
      return reply('❌ Não foi possível gerar as fotos.');
    }

    await client.sendMessage(msg.key.remoteJid, { image: { url: data.link1 }, caption: '📸 *Metadinha 1/2*' }, { quoted: msg });
    await client.sendMessage(msg.key.remoteJid, { image: { url: data.link2 }, caption: '📸 *Metadinha 2/2*' }, { quoted: msg });
    
    await react(ctx, '✅');
  } catch (error) {
    console.error('[METADINHA]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao gerar metadinha.');
  }
}

// =========================================
// COMANDO: !akinator (Yuta API)
// =========================================
export async function executeAkinator(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}akinator <personagem>*`);

  await react(ctx, '⏳');
  try {
    const data = await fetchYuta('jogos/akinator', { query: q.trim() });
    
    if (!data || !data.answer) {
      await react(ctx, '❌');
      return reply('❌ Akinator não conseguiu adivinhar.');
    }

    const texto = `🧞 *AKINATOR*\n\n🤔 Você pensou em: *${data.answer}*?\n📊 Certeza: ${data.confidence || 'N/A'}%`;
    
    if (data.image) {
      await client.sendMessage(msg.key.remoteJid, { image: { url: data.image }, caption: texto }, { quoted: msg });
    } else {
      await reply(texto);
    }
    await react(ctx, '✅');
  } catch (error) {
    console.error('[AKINATOR]', error);
    await react(ctx, '❌');
    return reply('❌ Erro no Akinator. Tente novamente.');
  }
                }
