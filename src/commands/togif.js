import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

// =========================================
// COMANDO: !togif / !gif
// =========================================
export async function executeToGif(ctx) {
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

  try {
    // Reação de carregando
    await client.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

    // 2. Baixa o arquivo da figurinha (.webp)
    const stream = await downloadContentFromMessage(stickerMsg, 'sticker');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    // 3. Salva temporariamente e converte usando o FFmpeg
    const tempIn = `./temp_${Date.now()}.webp`;
    const tempOut = `./temp_${Date.now()}.mp4`; // Enviamos como MP4 com gifPlayback para ser um GIF no WhatsApp

    await fs.writeFile(tempIn, buffer);
    
    // Comando FFmpeg para converter WebP animado em MP4 (formato de GIF do WhatsApp)
    await execAsync(`ffmpeg -y -i ${tempIn} -movflags faststart -pix_fmt yuv420p ${tempOut}`);

    const gifBuffer = await fs.readFile(tempOut);

    // 4. Envia como GIF
    await client.sendMessage(jid, { 
      video: gifBuffer, 
      gifPlayback: true, 
      caption: '✨ *Figurinha convertida em GIF!*' 
    }, { quoted: msg });

    // 5. Limpa os arquivos temporários
    await fs.unlink(tempIn).catch(() => {});
    await fs.unlink(tempOut).catch(() => {});

    // Reação de sucesso
    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });

  } catch (error) {
    console.error('[TOGIF] Erro ao converter:', error);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    return reply('❌ Ocorreu um erro ao tentar converter a figurinha em GIF. (Pode ser que a figurinha não seja animada).');
  }
}
