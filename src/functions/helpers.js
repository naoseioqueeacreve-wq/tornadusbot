import { getCanal } from './configGlobal.js';
import fs from 'node:fs';

// =========================================
// PEGA O TEXTO DA MENSAGEM
// =========================================
export function getText(msg) {
  const m = msg.message ?? {};
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    ''
  );
}

// =========================================
// CRIA O HELPER DE RESPOSTA
// =========================================
export function createReply(client, msg, fotoPath = null) {
  const jid = msg.key.remoteJid;

  return async (text, extras = {}) => {
    const canal = getCanal();

    // Monta o contextInfo do canal (se configurado)
    const contextInfo = {};
    if (canal && canal.id) {
      contextInfo.forwardingScore = 999;
      contextInfo.isForwarded = true;
      contextInfo.forwardedNewsletterMessageInfo = {
        newsletterJid: canal.id,
        newsletterName: canal.nome || 'Canal',
        serverMessageId: -1
      };
    }

    // ✅ Se o comando passou uma imagem, envia ela + texto
    if (extras.image) {
      const payload = {
        image: extras.image,
        caption: text,
        contextInfo
      };
      delete extras.image;
      Object.assign(payload, extras);

      return client.sendMessage(jid, payload, { quoted: msg });
    }

    // Se foi passado fotoPath no createReply, usa ela
    if (fotoPath && fs.existsSync(fotoPath)) {
      const payload = {
        image: fs.readFileSync(fotoPath),
        caption: text,
        contextInfo
      };
      Object.assign(payload, extras);

      return client.sendMessage(jid, payload, { quoted: msg });
    }

    // Sem foto: só texto
    const payload = { text, contextInfo, ...extras };
    return client.sendMessage(jid, payload, { quoted: msg });
  };
}
