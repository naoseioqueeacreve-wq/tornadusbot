export async function executeBispo(ctx) {
  const { client, msg, jid, q, reply } = ctx;

  // Reage à mensagem
  try {
    await client.sendMessage(jid, { react: { text: '🔍', key: msg.key } });
  } catch (e) {}

  if (!q) {
    return reply(
      `⛪ *BUSCA DE BISPOS* ⛪\n\n` +
      `❌ Você precisa informar o nome do bispo.\n\n` +
      `*Exemplo:* /bispo Dom Paulo Roberto Beloto`
    );
  }

  try {
    const headers = { 'User-Agent': 'FreddyBot/1.0 (WhatsApp; contato@exemplo.com)' };
    
    // Limpa a query para buscar EXATAMENTE o que o usuário digitou
    const nomeLimpo = q.replace(/^(bispo|bispo-brasil)\s+/i, '').trim();
    const queryBusca = encodeURIComponent(nomeLimpo);

    // 1. Pesquisa na Wikipédia
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${queryBusca}&utf8=&format=json`;
    const searchRes = await fetch(searchUrl, { headers });

    if (!searchRes.ok) {
      await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply('❌ Erro ao conectar com o serviço de busca da Wikipédia.');
    }

    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];

    if (!results.length) {
      await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply(`❌ Nenhum resultado encontrado para "*${nomeLimpo}*".\nVerifique o nome digitado.`);
    }

    // Se o primeiro resultado for muito diferente do que foi digitado, avisa o usuário
    const primeiroResultado = results[0].title;
    
    // Transforma tudo em minúsculo para comparar
    const buscaMin = nomeLimpo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const achadoMin = primeiroResultado.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Se o nome buscado NÃO estiver contido no título encontrado, 
    // significa que a Wikipédia achou algo meio aleatório. Vamos listar as opções.
    if (!achadoMin.includes(buscaMin) && !buscaMin.includes(achadoMin)) {
      let listaOpcoes = `⚠️ *NÃO ENCONTREI EXATAMENTE "${nomeLimpo}"*\n\n` +
                        `A Wikipédia retornou estes resultados parecidos:\n\n`;
      
      const topResultados = results.slice(0, 5); // Pega os 5 primeiros
      
      topResultados.forEach((res, index) => {
        listaOpcoes += `*${index + 1}.* ${res.title}\n`;
      });

      listaOpcoes += `\n💡 *Dica:* Tente ser mais específico. Exemplo:\n/bispo ${topResultados[0].title}`;

      await client.sendMessage(jid, { react: { text: '🤔', key: msg.key } });
      return reply(listaOpcoes);
    }

    // Se chegou aqui, o nome bateu. Pega a página exata.
    const pageTitle = primeiroResultado;

    // 2. Busca os detalhes da página do bispo
    const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const summaryRes = await fetch(summaryUrl, { headers });

    if (!summaryRes.ok) {
      await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply(`❌ Não foi possível carregar as informações de *${pageTitle}*.`);
    }

    const data = await summaryRes.json();

    // 3. Montagem da resposta
    let resposta = `╭━〔 ⛪ 𝐁𝐈𝐒𝐏𝐎 𝐃𝐎 𝐁𝐑𝐀𝐒𝐈𝐋 ⛪ 〕━╮\n` +
      `│\n` +
      `│  👤 *Nome:* ${data.title}\n`;

    if (data.description) {
      resposta += `│  📍 *Atuação:* ${data.description}\n`;
    }

    resposta += `│\n` +
      `╰━〔 🕊️ 𝐁𝐈𝐎𝐆𝐑𝐀𝐅𝐈𝐀 🕊️ 〕━╯\n\n` +
      `📜 *Resumo:*\n${data.extract || 'Informações biográficas não encontradas na base de dados.'}\n\n`;

    if (data.content_urls?.desktop?.page) {
      resposta += `🔗 *Fonte / Ver mais:*\n${data.content_urls.desktop.page}`;
    }

    // 4. Captura a imagem
    const imagemUrl = data.originalimage?.source || data.thumbnail?.source;

    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    // Envia com foto caso disponível
    if (imagemUrl) {
      return await client.sendMessage(jid, {
        image: { url: imagemUrl },
        caption: resposta
      }, { quoted: msg });
    }

    return reply(resposta);

  } catch (error) {
    console.error('[BISPO] Erro:', error.message);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    return reply('❌ Ocorreu um erro interno ao buscar o bispo. Tente novamente mais tarde.');
  }
}
