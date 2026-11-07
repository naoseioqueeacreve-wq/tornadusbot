import sharp from 'sharp';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

// =========================================
// COMANDO: !toimage / !toimg
// =========================================
export async function executeToImage(ctx) {
  const { client, msg, jid, reply } = ctx;

  // 1. Verifica se a mensagem é uma figurinha ou se está respondendo a uma
  let stickerMsg = msg.message?.stickerMessage;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  
  if (!stickerMsg && quoted) {
    stickerMsg = quoted.stickerMessage;
  }

  if (!stickerMsg) {
    return reply('❌ Você precisa enviar uma figurinha ou responder a uma para usar este comando!');
  }

  // 2. Verifica se é figurinha animada (o comando original era só para estáticas)
  if (stickerMsg.isAnimated) {
    return reply('❌ Este comando só funciona com figurinhas estáticas!');
  }

  try {
    // Reação de carregando
    await client.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

    // 3. Baixa o arquivo da figurinha (.webp)
    const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    // 4. Converte o buffer do WebP para PNG usando o Sharp
    const imageBuffer = await sharp(buffer).toFormat('png').toBuffer();

    // 5. Envia a imagem de volta
    await client.sendMessage(jid, { 
      image: imageBuffer, 
      caption: '✨ *Figurinha convertida em imagem!*' 
    }, { quoted: msg });

    // Reação de sucesso
    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    console.error('[TOIMAGE] Erro ao converter:', error);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    return reply('❌ Ocorreu um erro ao tentar converter a figurinha.');
  }
}
