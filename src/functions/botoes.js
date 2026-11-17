// =========================================
// SISTEMA DE BOTÕES (CORRIGIDO PARA GIFTED-BTNS)
// =========================================
import pkg from 'gifted-btns';
const { sendInteractiveMessage } = pkg; // 👈 Usando a função correta

export const MAX_LINHAS_LISTA = 10;
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
// ENVIO (Usando sendInteractiveMessage)
// =========================================
export async function enviarBotoes(client, jid, opcoes, msgOriginal = null) {
  const { titulo, corpo, rodape, botoes, mencoes } = opcoes;

  const options = { mentions: mencoes || [] };
  if (msgOriginal) options.quoted = msgOriginal;

  try {
    // A função sendInteractiveMessage aceita single_select e quick_reply
    await sendInteractiveMessage(client, jid, {
      title: titulo || ' ',
      text: corpo,
      footer: rodape || ' ',
      interactiveButtons: botoes // 👈 O array de botões vai aqui
    }, options);
  } catch (e) {
    console.error('[BOTÕES] Erro ao enviar pela biblioteca:', e);
    // Fallback: Se o WhatsApp bloquear, envia como texto normal
    await client.sendMessage(jid, { text: `${corpo}\n\n${rodape || ''}` }, options);
  }
}

// =========================================
// LEITURA DO TOQUE (vira texto de comando)
// =========================================
export function getRespostaBotao(msg) {
  let m = msg?.message ?? {};
  m = m.ephemeralMessage?.message ?? m;
  m = m.viewOnceMessage?.message ?? m;

  const fluxo = m.interactiveResponseMessage?.nativeFlowResponseMessage;
  if (fluxo?.paramsJson) {
    try {
      const p = JSON.parse(fluxo.paramsJson);
      const id = p.id ?? p.selectedRowId ?? p.selected_row_id ?? p.row_id ?? p.selectedId ?? p.button_id;
      if (id) return String(id).trim();
    } catch (e) {}
  }

  const antigo =
    m.buttonsResponseMessage?.selectedButtonId ??
    m.templateButtonReplyMessage?.selectedId ??
    m.listResponseMessage?.singleSelectReply?.selectedRowId;

  return antigo ? String(antigo).trim() : '';
}
  
