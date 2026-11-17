// =========================================
// SISTEMA DE BOTÕES (FORMATO DE IMAGEM CORRIGIDO)
// =========================================
import pkg from 'gifted-btns';
const { sendInteractiveMessage } = pkg;

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

// =========================================
// ENVIO (Agora converte Buffer para o formato aceito)
// =========================================
export async function enviarBotoes(client, jid, opcoes, msgOriginal = null) {
  const { titulo, corpo, rodape, botoes, mencoes, imagem } = opcoes;

  const options = { mentions: mencoes || [] };
  if (msgOriginal) options.quoted = msgOriginal;

  try {
    const payload = {
      title: titulo || ' ',
      text: corpo,
      footer: rodape || ' ',
      interactiveButtons: botoes
    };

    // 🖼️ Converte o Buffer da imagem para o formato { url: 'data:image/...' } que a gifted-btns aceita
    if (imagem) {
      if (Buffer.isBuffer(imagem)) {
        payload.image = { url: `data:image/png;base64,${imagem.toString('base64')}` };
      } else if (typeof imagem === 'string') {
        payload.image = { url: imagem };
      } else {
        payload.image = imagem;
      }
    }

    await sendInteractiveMessage(client, jid, payload, options);
  } catch (e) {
    console.error('[BOTÕES] Erro ao enviar pela biblioteca:', e);
    
    // Fallback: envia imagem + texto separadamente caso a API bloqueie
    if (imagem) {
      await client.sendMessage(jid, { image: imagem, caption: `${corpo}\n\n${rodape || ''}` }, options);
    } else {
      await client.sendMessage(jid, { text: `${corpo}\n\n${rodape || ''}` }, options);
    }
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
