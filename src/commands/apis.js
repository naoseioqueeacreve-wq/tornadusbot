import { PREFIX } from '../config.js';

// ⚠️ COLOQUE SUA CHAVE DA API DA BRONXYS AQUI ⚠️
const API_KEY_BRONXYS = "SUA_KEY_AQUI";

// =========================================
// COMANDO: !letra <música>
// =========================================
export async function executeLetra(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}letra <nome da música>*`);

  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/letra_musica?letra=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data.titulo) return reply('❌ Letra não encontrada. Tente ser mais específico.');

    const texto = `🎵 *${data.titulo}*\n👤 *Compositor:* ${data.compositor}\n\n${data.letra}`;
    return reply(texto);
  } catch (error) {
    console.error('[LETRA]', error);
    return reply('❌ Erro ao buscar a letra da música.');
  }
}

// =========================================
// COMANDO: !gimage <busca>
// =========================================
export async function executeGimage(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}gimage <termo de busca>*`);

  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/google-img?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || data.length === 0) return reply('❌ Nenhuma imagem encontrada.');

    // Sorteia uma imagem aleatória dos resultados
    const imgUrl = data[Math.floor(Math.random() * data.length)].url;
    
    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: imgUrl }, 
      caption: `🔎 *Pesquisa:* ${q.trim()}` 
    }, { quoted: msg });

  } catch (error) {
    console.error('[GIMAGE]', error);
    return reply('❌ Erro ao buscar imagem.');
  }
}

// =========================================
// COMANDO: !signo <signo>
// =========================================
export async function executeSigno(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}signo <seu signo>*\nEx: ${PREFIX}signo virgem`);

  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/horoscopo?signo=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data.title) return reply('❌ Signo inválido ou não encontrado.');

    const texto = `🔮 *HORÓSCOPO: ${q.toUpperCase()}*\n\n✨ *${data.title}*\n\n${data.body}`;
    
    // Envia com a imagem do signo
    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: data.img }, 
      caption: texto 
    }, { quoted: msg });

  } catch (error) {
    console.error('[SIGNO]', error);
    return reply('❌ Erro ao buscar o horóscopo.');
  }
}

// =========================================
// COMANDO: !ytsearch <busca>
// =========================================
export async function executeYtSearch(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}ytsearch <termo de busca>*`);

  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/pesquisa_ytb?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || data.length === 0) return reply('❌ Nenhum vídeo encontrado.');

    let texto = `🔍 *RESULTADOS DO YOUTUBE*\n🔎 Busca: _${q.trim()}_\n\n`;
    
    // Pega os 5 primeiros resultados
    data.slice(0, 5).forEach((v, i) => {
      texto += `*${i + 1}. ${v.titulo}*\n`;
      texto += `⏱️ Duração: ${v.tempo} | 📅 ${v.postado}\n`;
      texto += `🔗 Link: ${v.url}\n\n`;
    });

    return reply(texto);
  } catch (error) {
    console.error('[YTSEARCH]', error);
    return reply('❌ Erro ao pesquisar no YouTube.');
  }
}
// =========================================
// COMANDO: !moedas
// =========================================
export async function executeMoedas(ctx) {
  const { reply } = ctx;
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/Moedas_Agora?apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    const texto = `💰 *COTAÇÕES ATUALIZADAS*\n\n` +
      `🇺🇸 ${data.dolar}\n\n` +
      `🇪🇺 ${data.euro}\n\n` +
      `🇬🇧 ${data.libra}\n\n` +
      `🪙 ${data.bitcoin}\n\n` +
      `💎 ${data.ethereum}\n\n` +
      `📈 ${data.bovespa}\n\n` +
      `🏅 ${data.ouro}`;
      
    return reply(texto);
  } catch (error) {
    console.error('[MOEDAS]', error);
    return reply('❌ Erro ao buscar cotações. Tente novamente mais tarde.');
  }
}

// =========================================
// COMANDO: !tabelacamp (Brasileirão)
// =========================================
export async function executeTabelaCamp(ctx) {
  const { reply } = ctx;
  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/tabela_camp?apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    let texto = "🏆 *CAMPEONATO BRASILEIRO*\n\n";
    
    // Mostra apenas os 10 primeiros para não floodar o WhatsApp
    data.slice(0, 10).forEach((time, i) => {
      texto += `${i + 1}º ${time.time} | ${time.pontos} pts (${time.jogos}J)\n`;
    });
    
    texto += `\n📊 _Mostrando o Top 10 da tabela_`;
    return reply(texto);
  } catch (error) {
    console.error('[TABELA]', error);
    return reply('❌ Erro ao buscar a tabela do campeonato.');
  }
}

// =========================================
// COMANDO: !playstore <app>
// =========================================
export async function executePlayStore(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}playstore <nome do app>*`);

  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/playstore?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data.resultados || data.resultados.length === 0) return reply('❌ Nenhum app encontrado.');

    let texto = `📱 *RESULTADOS DA PLAY STORE*\n🔎 Busca: ${q.trim()}\n\n`;
    
    // Mostra os 3 primeiros resultados
    data.resultados.slice(0, 3).forEach((app, i) => {
      texto += `*${i + 1}. ${app.title}*\n`;
      texto += `🔗 Link: ${app.url}\n\n`;
    });

    return reply(texto);
  } catch (error) {
    console.error('[PLAYSTORE]', error);
    return reply('❌ Erro ao pesquisar na Play Store.');
  }
}

// =========================================
// COMANDO: !celular <modelo>
// =========================================
export async function executeCelular(ctx) {
  const { reply, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}celular <marca e modelo>*\nEx: ${PREFIX}celular galaxy s23`);

  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/info_celular?celular=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data.celular) return reply('❌ Celular não encontrado. Tente ser mais específico.');

    const texto = `📱 *${data.celular}*\n\n${data.resumo || data.infoc || 'Informações não encontradas.'}`;
    return reply(texto);
  } catch (error) {
    console.error('[CELULAR]', error);
    return reply('❌ Erro ao buscar informações do celular.');
  }
}

// =========================================
// COMANDO: !pinterest <busca>
// =========================================
export async function executePinterest(ctx) {
  const { reply, client, msg, q } = ctx;
  if (!q.trim()) return reply(`❌ Use: *${PREFIX}pinterest <termo de busca>*`);

  try {
    const res = await fetch(`https://api.bronxyshost.com.br/api-bronxys/pinterest?nome=${encodeURIComponent(q.trim())}&apikey=${API_KEY_BRONXYS}`);
    const data = await res.json();
    
    if (!data || data.length === 0) return reply('❌ Nenhuma imagem encontrada.');

    // Sorteia uma imagem aleatória
    const imgUrl = data[Math.floor(Math.random() * data.length)];
    
    await client.sendMessage(msg.key.remoteJid, { 
      image: { url: imgUrl }, 
      caption: `📌 *Pinterest:* ${q.trim()}` 
    }, { quoted: msg });

  } catch (error) {
    console.error('[PINTEREST]', error);
    return reply('❌ Erro ao buscar imagem no Pinterest.');
  }
}
