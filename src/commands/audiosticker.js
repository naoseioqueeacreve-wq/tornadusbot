import { proto } from '@whiskeysockets/baileys';

export async function executeAudioSticker(ctx) {
  const { client, msg, sender, jid, reply } = ctx;

  try {
    const { randomBytes } = await import('node:crypto');

    // Pega o contexto da mensagem para ver se tem áudio ou imagem citada
    const ctxInfo = msg.message?.extendedTextMessage?.contextInfo || 
                    msg.message?.imageMessage?.contextInfo || 
                    msg.message?.videoMessage?.contextInfo;
                    
    const quotedMsg = ctxInfo?.quotedMessage;

    // Tenta pegar o áudio (pode ser o citado ou o que a pessoa mandou junto)
    const audio = quotedMsg?.audioMessage || msg.message?.audioMessage;

    if (!audio) {
      return reply('❌ Marque um áudio para criar a figurinha com som.');
    }

    // Payload base da figurinha (Necessário para o hack de áudio do WhatsApp)
    const figurinha = {
      url: 'https://mmg.whatsapp.net/v/t62.15575-24/914418802_998776306001430_6861763622615627779_n.enc?ccb=11-4&oh=01_Q5Aa6AGUK9fRcG3CtBG_FTfVDGk-sp57A8_C35_nPqvyg3tGTg&oe=6B268895&_nc_sid=5e03e0&mms3=true',
      fileSha256: Buffer.from('l8qenAIPd+CWzPtGGdCaqyrTmzRRUM7xjxxSM96/EYE=', 'base64'),
      fileEncSha256: Buffer.from('nSjnSv8U+3uEmDgJJBMqDgA8k+O6DptnIrvRIHkOdoM=', 'base64'),
      mediaKey: Buffer.from('nWG+qHli3scYN31FAJAgejf6w2oNHy1jWhlVZIv17B0=', 'base64'),
      mimetype: 'image/webp',
      height: 512,
      width: 512,
      directPath: '/v/t62.15575-24/914418802_998776306001430_6861763622615627779_n.enc?ccb=11-4&oh=01_Q5Aa6AGUK9fRcG3CtBG_FTfVDGk-sp57A8_C35_nPqvyg3tGTg&oe=6B268895&_nc_sid=5e03e0',
      fileLength: 48734,
      mediaKeyTimestamp: 1794962736,
      isAnimated: false,
      contextInfo: {},
      stickerSentTs: Date.now(),
      isAvatar: false,
      isAiSticker: false,
      isLottie: false
    };

    const midia = proto.Message.fromObject({ stickerMessage: figurinha });
    const mensagemProto = midia.constructor;
    const chavePatch = Symbol.for('yutabot.audioSticker.encoder');

    // Verifica se a versão da Baileys possui os tipos necessários
    if (
      typeof mensagemProto.encode !== 'function' ||
      typeof mensagemProto.FutureProofMessage?.encode !== 'function' ||
      typeof mensagemProto.StickerMessage?.encode !== 'function' ||
      typeof mensagemProto.AudioMessage?.encode !== 'function'
    ) {
      throw new Error('A versão do Baileys não possui os tipos necessários.');
    }

    // Faz o "patch" no encoder para aceitar o áudio dentro da figurinha
    if (!mensagemProto[chavePatch]) {
      const tipos = [
        [mensagemProto, 'audioStickerMessage', 1074, mensagemProto.FutureProofMessage],
        [mensagemProto.StickerMessage, 'audioMessage', 210, mensagemProto.AudioMessage]
      ];

      for (const [tipo, campo, tag, schema] of tipos) {
        const encodeOriginal = tipo.encode;

        tipo.encode = function (mensagem, writer) {
          const resultado = encodeOriginal.call(this, mensagem, writer);

          if (mensagem[campo]) {
            return schema
              .encode(mensagem[campo], resultado.uint32(tag).fork())
              .ldelim();
          }

          return resultado;
        };
      }

      Object.defineProperty(mensagemProto, chavePatch, { value: true });
    }

    // Adiciona o áudio na figurinha
    midia.stickerMessage.audioMessage = audio;

    // Envia a figurinha com áudio
    await client.relayMessage(
      jid,
      {
        proto: midia,
        audioStickerMessage: { message: midia },
        messageContextInfo: { messageSecret: randomBytes(32) }
      },
      {}
    );
    
  } catch (erro) {
    console.error('[audiosticker] erro:', erro);
    await reply(`❌ Não foi possível enviar a figurinha com áudio: ${erro?.message || erro}`);
  }
}
