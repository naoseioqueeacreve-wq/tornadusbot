import { PREFIX } from '../config.js';

// ⚠️ COLOQUE SUA CHAVE DA API DA BRONXYS AQUI ⚠️
const API_KEY_BRONXYS = "Tornadusbot20198";

// =========================================
// FUNÇÃO AUXILIAR: REAÇÕES
// =========================================
async function react(ctx, emoji) {
  try {
    await ctx.client.sendMessage(ctx.msg.key.remoteJid, { 
      react: { text: emoji, key: ctx.msg.key } 
    });
  } catch (e) {} // Ignora erro se não conseguir reagir
}

// =========================================
// COMANDO: !letra <música>
// =========================================
export async function executeLetra(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}letra <nome da música>*`);

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/letra_musica?letra=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || !data.titulo) {
      await react(ctx, '❌');
      return reply('❌ Letra não encontrada. Tente ser mais específico ou a API pode estar instável.');
    }

    await react(ctx, '✅');
    const texto = `🎵 *${data.titulo}*\n👤 *Compositor:* ${data.compositor}\n\n${data.letra}`;
    return reply(texto);
  } catch (error) {
    console.error('[LETRA]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar a letra da música.');
  }
}

// =========================================
// COMANDO: !gimage <busca>
// =========================================
export async function executeGimage(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}gimage <termo de busca>*`);

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/google-img?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      await react(ctx, '❌');
      return reply('❌ Nenhuma imagem encontrada. A API pode estar instável.');
    }

    const imgUrl = data[Math.floor(Math.random() * data.length)].url;
    
    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: imgUrl }, 
      caption: `🔎 *Pesquisa:* ${q.trim()}` 
    }, { quoted: msg });
    
    await react(ctx, '✅');
  } catch (error) {
    console.error('[GIMAGE]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar imagem.');
  }
}

// =========================================
// COMANDO: !signo <signo>
// =========================================
export async function executeSigno(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}signo <seu signo>*\nEx: ${PREFIX}signo virgem`);

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/horoscopo?signo=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || !data.title) {
      await react(ctx, '❌');
      return reply('❌ Signo inválido ou não encontrado.');
    }

    const texto = `🔮 *HORÓSCOPO: ${q.toUpperCase()}*\n\n✨ *${data.title}*\n\n${data.body}`;
    
    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: data.img }, 
      caption: texto 
    }, { quoted: msg });
    
    await react(ctx, '✅');
  } catch (error) {
    console.error('[SIGNO]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar o horóscopo.');
  }
}

// =========================================
// COMANDO: !ytsearch <busca>
// =========================================
export async function executeYtSearch(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}ytsearch <termo de busca>*`);

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/pesquisa_ytb?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      await react(ctx, '❌');
      return reply('❌ Nenhum vídeo encontrado.');
    }

    let texto = `🔍 *RESULTADOS DO YOUTUBE*\n🔎 Busca: _${q.trim()}_\n\n`;
    
    data.slice(0, 5).forEach((v, i) => {
      texto += `*${i + 1}. ${v.titulo}*\n`;
      texto += `⏱️ Duração: ${v.tempo} | 📅 ${v.postado}\n`;
      texto += `🔗 Link: ${v.url}\n\n`;
    });

    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[YTSEARCH]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao pesquisar no YouTube.');
  }
}

// =========================================
// COMANDO: !moedas
// =========================================
export async function executeMoedas(ctx) {
  const { reply } = ctx;
  
  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/Moedas_Agora?apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || !data.dolar) {
      await react(ctx, '❌');
      return reply('❌ API de moedas instável no momento.');
    }

    const texto = `💰 *COTAÇÕES ATUALIZADAS*\n\n` +
      `🇺🇸 ${data.dolar}\n\n` +
      `🇪🇺 ${data.euro}\n\n` +
      `🇬🇧 ${data.libra}\n\n` +
      `🪙 ${data.bitcoin}\n\n` +
      `💎 ${data.ethereum}\n\n` +
      `📈 ${data.bovespa}\n\n` +
      `🏅 ${data.ouro}`;
      
    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[MOEDAS]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar cotações. Tente novamente mais tarde.');
  }
}

// =========================================
// COMANDO: !tabelacamp (Brasileirão)
// =========================================
export async function executeTabelaCamp(ctx) {
  const { reply } = ctx;

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/tabela_camp?apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!Array.isArray(data)) {
      console.log('[TABELA API ERRO]', data);
      await react(ctx, '❌');
      return reply('❌ A API do campeonato está fora do ar ou sua chave atingiu o limite diário.');
    }

    let texto = "🏆 *CAMPEONATO BRASILEIRO*\n\n";
    
    data.slice(0, 10).forEach((time, i) => {
      texto += `${i + 1}º ${time.time} | ${time.pontos} pts (${time.jogos}J)\n`;
    });
    
    texto += `\n📊 _Mostrando o Top 10 da tabela_`;
    
    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[TABELA]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar a tabela do campeonato.');
  }
}

// =========================================
// COMANDO: !playstore <app>
// =========================================
export async function executePlayStore(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}playstore <nome do app>*`);

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/playstore?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data.resultados || !Array.isArray(data.resultados) || data.resultados.length === 0) {
      await react(ctx, '❌');
      return reply('❌ Nenhum app encontrado.');
    }

    let texto = `📱 *RESULTADOS DA PLAY STORE*\n🔎 Busca: ${q.trim()}\n\n`;
    
    data.resultados.slice(0, 3).forEach((app, i) => {
      texto += `*${i + 1}. ${app.title}*\n`;
      texto += `🔗 Link: ${app.url}\n\n`;
    });

    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[PLAYSTORE]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao pesquisar na Play Store.');
  }
}

// =========================================
// COMANDO: !celular <modelo>
// =========================================
export async function executeCelular(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}celular <marca e modelo>*\nEx: ${PREFIX}celular galaxy s23`);

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/info_celular?celular=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || !data.celular) {
      await react(ctx, '❌');
      return reply('❌ Celular não encontrado. Tente ser mais específico.');
    }

    const texto = `📱 *${data.celular}*\n\n${data.resumo || data.infoc || 'Informações não encontradas.'}`;
    
    await react(ctx, '✅');
    return reply(texto);
  } catch (error) {
    console.error('[CELULAR]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao buscar informações do celular.');
  }
}

// =========================================
// COMANDO: !pinterest <busca>
// =========================================
export async function executePinterest(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}pinterest <termo de busca>*`);

  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/pinterest?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      await react(ctx, '❌');
      return reply('❌ Nenhuma imagem encontrada.');
    }

    const imgUrl = data[Math.floor(Math.random() * data.length)];
    
    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: imgUrl }, 
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
// COMANDO: !soundcloud <link>
// =========================================
export async function executeSoundCloud(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim().includes("soundcloud")) {
    return reply(`❌ Use: *${PREFIX}soundcloud <link>*\nEx: ${PREFIX}soundcloud https://soundcloud.com/artista/musica`);
  }

  await react(ctx, '⏳');
  try {
    const urlAudio = `https://api.bronxyshost.com.br/api-bronxys/soundcloud?url=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`;
    
    await client.sendMessage(msg.key.remoteJid, { 
      audio: { url: urlAudio }, 
      mimetype: "audio/mpeg" 
    }, { quoted: msg });

    await react(ctx, '✅');
  } catch (error) {
    console.error('[SOUNDCLOUD]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao baixar do SoundCloud. Verifique o link e tente novamente.');
  }
}

// =========================================
// COMANDO: !threads <link>
// =========================================
export async function executeThreads(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim().includes("threads.net")) {
    return reply(`❌ Use: *${PREFIX}threads <link>*\nEx: ${PREFIX}threads https://www.threads.net/...`);
  }

  await react(ctx, '⏳');
  try {
    const urlVideo = `https://api.bronxyshost.com.br/api-bronxys/threads?url=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`;
    
    await client.sendMessage(msg.key.remoteJid, { 
      video: { url: urlVideo }, 
      mimetype: "video/mp4" 
    }, { quoted: msg });

    await react(ctx, '✅');
  } catch (error) {
    console.error('[THREADS]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao baixar vídeo do Threads. Verifique o link.');
  }
}

// =========================================
// COMANDO: !metadinha
// =========================================
export async function executeMetadinha(ctx) {
  const { reply, client, msg } = ctx;
  
  await react(ctx, '⏳');
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/metadinha?apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || !data.link1 || !data.link2) {
      console.log('[METADINHA API ERRO]', data);
      await react(ctx, '❌');
      return reply('❌ Não foi possível gerar as fotos. A API pode estar fora do ar.');
    }

    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: data.link1 }, 
      caption: '📸 *Metadinha 1/2*' 
    }, { quoted: msg });

    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: data.link2 }, 
      caption: '📸 *Metadinha 2/2*' 
    }, { quoted: msg });
    
    await react(ctx, '✅');

  } catch (error) {
    console.error('[METADINHA]', error);
    await react(ctx, '❌');
    return reply('❌ Erro ao gerar metadinha. Tente novamente.');
  }
  }
