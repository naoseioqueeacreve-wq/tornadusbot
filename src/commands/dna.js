import { PREFIX } from '../config.js';

const TRACOS = [
  'lindo(a)',
  'preguiçoso(a)',
  'engraçado(a)',
  'fofo(a)',
  'estressado(a)',
  'inteligente',
  'gamer',
  'festeiro(a)',
  'caótico(a)',
  'romântico(a)',
  'puro drama',
  'santo(a)',
  'debochado(a)',
  'fofoqueiro(a)',
  'comilão/comilona'
];

function gerarComposicaoDna() {
  const traçosEmbaralhados = [...TRACOS].sort(() => 0.5 - Math.random());
  const selecao = traçosEmbaralhados.slice(0, 4);

  const cortes = [];
  while (cortes.length < 3) {
    const r = Math.floor(Math.random() * 99) + 1;
    if (!cortes.includes(r)) cortes.push(r);
  }
  cortes.sort((a, b) => a - b);

  const porcentagens = [
    cortes[0],
    cortes[1] - cortes[0],
    cortes[2] - cortes[1],
    100 - cortes[2]
  ];

  return selecao.map((traco, i) => `• *${porcentagens[i]}%* ${traco}`);
}

export async function executeDNA(ctx) {
  const { client, msg, jid, sender, isGroup, groupMetadata, reply } = ctx;

  try {
    // Reage à mensagem
    await client.sendMessage(jid, { react: { text: '🧬', key: msg.key } });

    // 1. Captura a menção (se houver)
    let mencaoDetectada = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
    
    // O alvo é quem foi mencionado, ou quem enviou o comando
    const alvo = mencaoDetectada || sender;
    const numAlvo = alvo.split('@')[0];
    const listaMencoes = [alvo];

    let textoPais = '';

    // 2. Sorteia os pais apenas se for grupo
    if (isGroup && groupMetadata) {
      const participantes = groupMetadata.participants || [];
      
      // Pega os IDs dos participantes, limpa e remove o próprio alvo
      const idsParticipantes = participantes
        .map(p => typeof p === 'string' ? p : (p.id || p.jid))
        .filter(id => id && id.split('@')[0].split(':')[0] !== alvo.split('@')[0].split(':')[0]);

      if (idsParticipantes.length >= 2) {
        const embaralhados = idsParticipantes.sort(() => 0.5 - Math.random());
        
        // Pega os dois primeiros
        const pai1 = embaralhados[0];
        const pai2 = embaralhados[1];

        listaMencoes.push(pai1, pai2);

        // Formata os nomes de forma bonita
        const nomePai1 = pai1.split('@')[0].split(':')[0];
        const nomePai2 = pai2.split('@')[0].split(':')[0];

        textoPais = `👨‍👩‍👦 *Pais Genéticos Sorteados:*\n` +
                    `• *Pai/Mãe 1:* @${nomePai1}\n` +
                    `• *Pai/Mãe 2:* @${nomePai2}\n\n`;
      } else {
        textoPais = `⚠️ _Poucos membros no grupo para sortear os pais._\n\n`;
      }
    }

    const resultadoDna = gerarComposicaoDna();

    // 3. Montagem da mensagem
    let mensagem = `╭━〔 🧬𝐓𝐄𝐒𝐓𝐄 𝐃𝐄 𝐃𝐍𝐀🧬 〕━╮\n` +
      `│\n` +
      `│  👤 *Analisando:* @${numAlvo}\n` +
      `│\n` +
      `╰━〔 🧪 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎 🧪 〕━╯\n\n`;
      
    mensagem += textoPais;
    
    mensagem += `📊 *Composição Genética:*\n`;
    mensagem += `${resultadoDna.join('\n')}\n\n`;
    
    mensagem += `💡 _Dica: Marque alguém para ver o DNA dele(a)!_\n`;
    mensagem += `👉 Exemplo: *${PREFIX}dna @membro*`;

    // 4. Envia a mensagem
    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });
    
    return await client.sendMessage(jid, {
      text: mensagem,
      mentions: listaMencoes
    }, { quoted: msg });

  } catch (error) {
    console.error('[DNA] Erro:', error.message);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    return reply('❌ Ocorreu um erro ao processar o teste de DNA.');
  }
}
