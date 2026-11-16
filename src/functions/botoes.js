// =========================================
// SISTEMA DE BOTÕES (mensagens interativas do WhatsApp)
// =========================================
// Monta e envia mensagens com botões e transforma o toque da pessoa
// de volta em texto de comando (ex.: "/menuadmin").
//
// Tipos de botão:
//   • botaoLista(...)     → abre uma folha com categorias para selecionar
//   • botaoResposta(...)  → resposta rápida (manda um comando ao tocar)
//   • botaoLink(...)      → abre um link
//   • botaoCopiar(...)    → copia um texto
//
// Exemplo:
//   await enviarBotoes(client, jid, {
//     titulo: '🧸 FREDDY BOT',
//     corpo: 'Escolha uma opção!',
//     rodape: '© Freddy Bots',
//     botoes: [
//       botaoLista('MENU', [{ titulo: '🛡️ ADMIN', linhas: [{ titulo: 'MENU ADMIN', descricao: 'Comandos de admin', tag: 'Admins', id: '/menuadmin' }] }]),
//       botaoResposta('⚡ PING', '/ping')
//     ]
//   });
//
// O "id" de cada opção/botão é o comando que o bot vai executar quando a
// pessoa tocar (precisa começar com o prefixo, ex.: "/ping").

export const MAX_LINHAS_LISTA = 10; // limite do WhatsApp para opções de uma lista
export const MAX_BOTOES = 5;

// =========================================
// CRIADORES DE BOTÃO
// =========================================
export function botaoLista(titulo, secoes) {
  return {
    name: 'single_select',
    buttonParamsJson: JSON.stringify({
      title: String(titulo),
      sections: secoes.map(s => ({
        title: String(s.titulo),
        rows: s.linhas.map(l => {
          const linha = {
            title: String(l.titulo),
            description: l.descricao ? String(l.descricao) : '',
            id: String(l.id)
          };
          // "header" aparece como uma etiquetinha verde ao lado da opção
          if (l.tag) linha.header = String(l.tag);
          return linha;
        })
      }))
    })
  };
}

export function botaoResposta(texto, id) {
  return {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: String(texto), id: String(id) })
  };
}

export function botaoLink(texto, url) {
  return {
    name: 'cta_url',
    buttonParamsJson: JSON.stringify({ display_text: String(texto), url: String(url), merchant_url: String(url) })
  };
}

export function botaoCopiar(texto, codigo) {
  return {
    name: 'cta_copy',
    buttonParamsJson: JSON.stringify({ display_text: String(texto), copy_code: String(codigo) })
  };
}

// =========================================
// VALIDAÇÃO (evita mandar uma mensagem que o WhatsApp descarta em silêncio)
// =========================================
export function validarBotoes({ corpo, botoes }) {
  if (!corpo || !String(corpo).trim()) throw new Error('O corpo da mensagem não pode ser vazio.');
  if (!Array.isArray(botoes) || botoes.length === 0) throw new Error('Informe pelo menos um botão.');
  if (botoes.length > MAX_BOTOES) throw new Error(`No máximo ${MAX_BOTOES} botões por mensagem.`);

  const ids = new Set();
  let totalLinhas = 0;

  for (const b of botoes) {
    if (!b?.name || !b?.buttonParamsJson) throw new Error('Botão inválido (use botaoLista/botaoResposta/botaoLink/botaoCopiar).');
    const p = JSON.parse(b.buttonParamsJson);

    if (b.name === 'single_select') {
      if (!p.title) throw new Error('A lista precisa de um título.');
      if (!Array.isArray(p.sections) || p.sections.length === 0) throw new Error('A lista precisa de ao menos uma seção.');
      for (const s of p.sections) {
        if (!s.rows || s.rows.length === 0) throw new Error(`A seção "${s.title}" está sem opções.`);
        for (const r of s.rows) {
          totalLinhas++;
          if (!r.title) throw new Error('Toda opção da lista precisa de um título.');
          if (!r.id) throw new Error(`A opção "${r.title}" está sem id.`);
          if (ids.has(r.id)) throw new Error(`Id repetido na lista: ${r.id}`);
          ids.add(r.id);
        }
      }
    } else if (b.name === 'quick_reply') {
      if (!p.display_text || !p.id) throw new Error('A resposta rápida precisa de texto e id.');
    } else if (b.name === 'cta_url') {
      if (!/^https?:\/\//i.test(p.url || '')) throw new Error(`Link inválido: ${p.url}`);
    } else if (b.name === 'cta_copy') {
      if (!p.copy_code) throw new Error('O botão de copiar precisa de um texto.');
    }
  }

  if (totalLinhas > MAX_LINHAS_LISTA) {
    throw new Error(`A lista tem ${totalLinhas} opções, mas o WhatsApp aceita no máximo ${MAX_LINHAS_LISTA}.`);
  }
}

// =========================================
// MONTAGEM DA MENSAGEM
// =========================================
export function montarConteudoBotoes({ titulo, corpo, rodape, botoes, mencoes = [] }, header = null) {
  validarBotoes({ corpo, botoes });

  const interactiveMessage = {
    header: header || { title: titulo || '', hasMediaAttachment: false },
    body: { text: String(corpo) },
    nativeFlowMessage: { buttons: botoes, messageParamsJson: '' }
  };
  if (rodape) interactiveMessage.footer = { text: String(rodape) };
  if (mencoes.length > 0) interactiveMessage.contextInfo = { mentionedJid: mencoes };

  return {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage
      }
    }
  };
}

// Nós extras que o WhatsApp exige para mostrar botões de contas que não são business
export function montarNosExtras({ ehGrupo }) {
  const nos = [
    {
      tag: 'biz',
      attrs: {},
      content: [
        {
          tag: 'interactive',
          attrs: { type: 'native_flow', v: '1' },
          content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
        }
      ]
    }
  ];
  // No privado, o WhatsApp também espera a marca de "bot"
  if (!ehGrupo) nos.push({ tag: 'bot', attrs: { biz_bot: '1' } });
  return nos;
}

// =========================================
// ENVIO
// =========================================
// opcoes: { titulo, corpo, rodape, botoes, mencoes, imagem (Buffer opcional) }
// `baileys` só serve para testes (injeção); no bot é importado sozinho.
export async function enviarBotoes(client, jid, opcoes, baileys = null) {
  const modulo = baileys || await import('@whiskeysockets/baileys');
  const lib = modulo.generateWAMessageFromContent ? modulo : modulo.default;
  const { generateWAMessageFromContent, prepareWAMessageMedia } = lib;

  let header = null;
  if (opcoes.imagem) {
    const media = await prepareWAMessageMedia({ image: opcoes.imagem }, { upload: client.waUploadToServer });
    header = { title: opcoes.titulo || '', hasMediaAttachment: true, ...media };
  }

  const conteudo = montarConteudoBotoes(opcoes, header);
  const mensagem = generateWAMessageFromContent(jid, conteudo, { userJid: client.user.id });

  await client.relayMessage(jid, mensagem.message, {
    messageId: mensagem.key.id,
    additionalNodes: montarNosExtras({ ehGrupo: String(jid).endsWith('@g.us') })
  });

  return mensagem;
}

// =========================================
// LEITURA DO TOQUE (vira texto de comando)
// =========================================
// Quando a pessoa toca numa opção/botão, o WhatsApp manda uma "resposta".
// Esta função devolve o id do que foi tocado (ex.: "/menuadmin") ou '' se a
// mensagem não for uma resposta de botão.
export function getRespostaBotao(msg) {
  let m = msg?.message ?? {};
  m = m.ephemeralMessage?.message ?? m;
  m = m.viewOnceMessage?.message ?? m;

  // Mensagens interativas novas: lista (single_select) e resposta rápida (quick_reply)
  const fluxo = m.interactiveResponseMessage?.nativeFlowResponseMessage;
  if (fluxo?.paramsJson) {
    try {
      const p = JSON.parse(fluxo.paramsJson);
      const id = p.id ?? p.selectedRowId ?? p.selected_row_id ?? p.row_id ?? p.selectedId ?? p.button_id;
      if (id) return String(id).trim();
    } catch (e) {}
  }

  // Formatos antigos de botão/lista
  const antigo =
    m.buttonsResponseMessage?.selectedButtonId ??
    m.templateButtonReplyMessage?.selectedId ??
    m.listResponseMessage?.singleSelectReply?.selectedRowId;

  return antigo ? String(antigo).trim() : '';
}
