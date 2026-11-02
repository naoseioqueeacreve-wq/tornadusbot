export async function executeSantuario(ctx) {
  const { client, msg, jid, q, reply } = ctx;

  // Reage à mensagem
  try {
    await client.sendMessage(jid, { react: { text: '🔍', key: msg.key } });
  } catch (e) {}

  if (!q) {
    return reply(
      `⛪ *BUSCA DE SANTUÁRIOS* ⛪\n\n` +
      `❌ Você precisa informar o nome do santuário.\n\n` +
      `*Exemplo:* /santuario Santuário Nacional de Aparecida`
    );
  }

  try {
    // Cabeçalho obrigatório para a API da Wikipédia não bloquear
    const headers = { 'User-Agent': 'FreddyBot/1.0 (WhatsApp; contato@exemplo.com)' };
    const nomeLimpo = q.replace(/^(santuario|santuário)\s+/i, '').trim();

    // 1. Pesquisa o santuário na Wikipédia
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent('Santuário católico ' + nomeLimpo)}&utf8=&format=json`;
    const searchRes = await fetch(searchUrl, { headers });

    if (!searchRes.ok) {
      await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply('❌ Erro ao conectar com o serviço de busca da Wikipédia.');
    }

    const searchData = await searchRes.json();
    const results = searchData.query?.search || [];

    if (!results.length) {
      await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply(`❌ Nenhum santuário encontrado para "*${nomeLimpo}*".\nVerifique o nome digitado e tente novamente.`);
    }

    const pageTitle = results[0].title;

    // 2. Busca os detalhes da página do santuário
    const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const summaryRes = await fetch(summaryUrl, { headers });

    if (!summaryRes.ok) {
      await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      return reply(`❌ Não foi possível carregar as informações do santuário *${pageTitle}*.`);
    }

    const data = await summaryRes.json();

    // 3. Montagem da resposta com todos os detalhes e design melhorado
    let resposta = `╭━〔 ⛪ 𝐒𝐀𝐍𝐓𝐔𝐀́𝐑𝐈𝐎 ⛪ 〕━╮\n` +
      `│\n` +
      `│  📌 *Nome:* ${data.title}\n`;

    if (data.description) {
      resposta += `│  📍 *Local:* ${data.description}\n`;
    }

    resposta += `│\n` +
      `╰━〔 🕊️ 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝗖̧𝗢̃𝗘𝗦 🕊️ 〕━╯\n\n` +
      `📜 *História e Estrutura:*\n${data.extract || 'Informações detalhadas não encontradas na base de dados.'}\n\n`;

    if (data.content_urls?.desktop?.page) {
      resposta += `🔗 *Fonte / Ver mais:*\n${data.content_urls.desktop.page}`;
    }

    // 4. Captura a URL da imagem oficial (tenta a original, depois a miniatura)
    const imagemUrl = data.originalimage?.source || data.thumbnail?.source;

    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    // Envia com foto caso disponível, senão envia apenas texto
    if (imagemUrl) {
      return await client.sendMessage(jid, {
        image: { url: imagemUrl },
        caption: resposta
      }, { quoted: msg });
    }

    return reply(resposta);

  } catch (error) {
    console.error('[SANTUARIO] Erro:', error.message);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    return reply('❌ Ocorreu um erro interno ao buscar o santuário. Tente novamente mais tarde.');
  }
}
