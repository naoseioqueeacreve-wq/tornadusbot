import { GEMINI_API_KEY } from '../config.js';

// Função para chamar a IA do Gemini
async function chamarGemini(prompt) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const body = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[GEMINI - PADRE] Erro na API:', data);
      return null;
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('[GEMINI - PADRE] Erro de conexão:', e.message);
    return null;
  }
}

// Função para buscar apenas a foto (Usando a API de Imagens do DuckDuckGo)
async function buscarFoto(nome) {
  try {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
    
    // 1. Pega o token necessário (vqd) para a busca de imagens
    const vqdRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent('padre ' + nome)}`, {
      headers: { 'User-Agent': userAgent }
    });
    const vqdHtml = await vqdRes.text();
    const vqdMatch = vqdHtml.match(/vqd=["']([^"']+)["']/);
    
    if (!vqdMatch) return null;
    const vqd = vqdMatch[1];

    // 2. Faz a busca na aba de imagens
    const imgRes = await fetch(`https://duckduckgo.com/i.js?l=pt-br&o=json&q=${encodeURIComponent('padre ' + nome)}&vqd=${vqd}&f=,,,,,&p=1`, {
      headers: { 'User-Agent': userAgent, 'Referer': 'https://duckduckgo.com/' }
    });
    
    const imgData = await imgRes.json();
    
    // 3. Retorna a URL da primeira imagem encontrada
    if (imgData.results && imgData.results.length > 0) {
      return imgData.results[0].image;
    }
    return null;
  } catch (e) {
    console.error('[PADRE] Erro na busca de imagem:', e.message);
    return null;
  }
}

export async function executePadre(ctx) {
  const { client, msg, jid, q, reply } = ctx;

  // Reage à mensagem
  try {
    await client.sendMessage(jid, { react: { text: '⛪', key: msg.key } });
  } catch (e) {}

  if (!q) {
    return reply(
      `✝️ *BUSCA DE PADRES* ✝️\n\n` +
      `❌ Você precisa informar o nome do padre.\n\n` +
      `*Exemplo:* /padre Padre Marcelo Rossi`
    );
  }

  try {
    const nomeLimpo = q.replace(/^(padre)\s+/i, '').trim();

    // Avisa que está processando
    await client.sendMessage(jid, { text: '🤔 Consultando os arquivos da Igreja...' }, { quoted: msg });

    // Prompt inteligente: Tenta a verdade, mas se não souber, cria uma história fofa
    const prompt = `O usuário está buscando informações sobre o "Padre ${nomeLimpo}". 
    
    REGRAS:
    1. Se você SOUBER quem é esse padre real, faça uma biografia curta, respeitosa e real (nascimento, ordenação, obras).
    2. Se você NÃO SOUBER quem ele é (provavelmente é um padre local ou inventado), NÃO diga apenas "não encontrado". Em vez disso, crie uma "Biografia Fictícia Divertida" para ele.
    - Diga que não achou dados oficiais no Vaticano, mas que a fé não precisa de registros.
    - Invente uma paróquia para ele (ex: Paróquia de São Judas, no interior de Minas).
    - Invente 2 hobbies (ex: gosta de pescar e torcer para o Cruzeiro).
    - Invente uma "especialidade" (ex: famoso por fazer o melhor bolo de fubá da diocese).
    - Conte uma historinha fofa (ex: uma vez acalmou uma tempestade apenas rezando).
    
    REGRA DE OURO: Se for inventado, comece o texto com: "⚠️ *Não encontrei dados oficiais, mas...*" e deixe claro que é uma história carinhosa para homenagear os padres anônimos.
    Formate com emojis (📖, ⛪, 🙏, 😂). Seja breve para não cortar no WhatsApp.`;

    // Chama a IA
    const respostaIA = await chamarGemini(prompt);

    if (!respostaIA) {
      await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply('❌ A IA não conseguiu processar a resposta agora. Tente novamente mais tarde.');
    }

    // Tenta buscar a foto na web
    const imagemUrl = await buscarFoto(nomeLimpo);

    // Monta a mensagem final
    let respostaFinal = `╭━━━━━━━〔 ⛪ 𝐀𝐑𝐐𝐔𝐈𝐕𝐎𝐒 𝐃𝐎 𝐏𝐀𝐃𝐑𝐄 ⛪ 〕━━━━━━━╮\n` +
      `│\n` +
      `│  👤 *Alvo:* ${nomeLimpo}\n` +
      `│\n` +
      `╰━━━━━━━〔 🕊️ 𝐑𝐄𝐋𝐀𝐓𝐎𝐑𝐈𝐎 🕊️ 〕━━━━━━━╯\n\n` +
      `${respostaIA.trim()}\n\n` +
      `✨ _Relatório gerado por IA._`;

    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    // Envia com foto se achou, senão manda só o texto
    if (imagemUrl) {
      return await client.sendMessage(jid, {
        image: { url: imagemUrl },
        caption: respostaFinal
      }, { quoted: msg });
    }

    return reply(respostaFinal);

  } catch (error) {
    console.error('[PADRE] Erro:', error.message);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    return reply('❌ Ocorreu um erro interno na IA ao buscar o padre. Tente novamente mais tarde.');
  }
}
