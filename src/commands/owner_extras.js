import { isOwner } from '../functions/permissions.js';
import {
  setFotoComando,
  removerFotoComando,
  getFotoComando,
  lerConfigGlobal,
  setCanal,
  removerCanal,
  getCanal
} from '../functions/configGlobal.js';
import fs from 'node:fs';
import path from 'node:path';

// =========================================
// !definircmdfoto <comando>
// =========================================
export async function executeDefinirCmdFoto(ctx) {
  const { client, msg, sender, q, reply } = ctx;

  console.log('[CMDFOTO] Comando chamado por:', sender);

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const imageMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;

  console.log('[CMDFOTO] Tem imagem?', !!imageMsg);
  console.log('[CMDFOTO] Comando alvo:', q);

  if (!imageMsg) {
    return reply(
      `📸 *COMO USAR:*\n\n` +
      `1. Envie uma foto no chat\n` +
      `2. *RESPONDA* a foto (segure e toque em Responder)\n` +
      `3. Digite: !definircmdfoto <comando>\n\n` +
      `💡 Exemplo: !definircmdfoto menu\n\n` +
      `⚠️ A foto precisa estar *marcada/responsida*!`
    );
  }

  if (!q.trim()) {
    return reply(`❌ Você precisa dizer o nome do comando.\nExemplo: !definircmdfoto menu`);
  }

  const comandoAlvo = q.trim().toLowerCase().replace(/^[!./]/, '');

  try {
    const { downloadContentFromMessage } = await import('@whiskeysockets/baileys');
    const stream = await downloadContentFromMessage(imageMsg, 'image');

    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    console.log('[CMDFOTO] Tamanho do arquivo:', buffer.length, 'bytes');

    if (buffer.length < 100) {
      return reply('❌ A imagem está muito pequena/corrompida. Tente outra.');
    }

    const dir = './src/assets/cmdfotos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const caminho = path.join(dir, `${comandoAlvo}.jpg`);
    fs.writeFileSync(caminho, buffer);

    setFotoComando(comandoAlvo, caminho);

    console.log('[CMDFOTO] Foto salva em:', caminho);

    return reply(
      `✅ *FOTO DEFINIDA!*\n\n` +
      `📸 Comando: *!${comandoAlvo}*\n` +
      `📁 ${caminho}\n` +
      `📦 Tamanho: ${(buffer.length / 1024).toFixed(1)} KB\n\n` +
      `💡 Agora use *!${comandoAlvo}* e a foto aparece junto.`
    );

  } catch (error) {
    console.error('[CMDFOTO] Erro:', error.message);
    return reply(`❌ Erro ao processar: ${error.message}`);
  }
}

// =========================================
// !rmcmdfoto <comando>
// =========================================
export async function executeRmCmdFoto(ctx) {
  const { sender, q, reply } = ctx;

  if (!isOwner(sender)) return reply('❌ Apenas o dono pode usar este comando.');

  if (!q.trim()) {
    const config = lerConfigGlobal();
    const lista = Object.keys(config.fotosComandos || {});
    if (lista.length === 0) return reply('ℹ️ Nenhuma foto de comando configurada.');
    return reply(`📋 *COMANDOS COM FOTO:*\n\n${lista.map(c => `• !${c}`).join('\n')}\n\n💡 Use: !rmcmdfoto <comando>`);
  }

  const comando = q.trim().toLowerCase().replace(/^[!./]/, '');
  const existia = getFotoComando(comando);

  if (!existia) return reply(`❌ Nenhuma foto configurada para *!${comando}*.`);

  try {
    if (fs.existsSync(existia)) fs.unlinkSync(existia);
  } catch (e) {}

  removerFotoComando(comando);
  return reply(`🗑️ Foto removida do comando *!${comando}*.`);
}

// =========================================
// !channel <link>
// =========================================
export async function executeChannel(ctx) {
  const { client, msg, sender, q, reply } = ctx;

  if (!isOwner(sender)) return reply('🚫 Apenas o dono pode configurar o canal!');

  const qCan = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const textoCan = q.trim() || qCan?.conversation || qCan?.extendedTextMessage?.text || '';

  const mCan = /whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/.exec(textoCan);
  const canalAtual = getCanal();

  if (!mCan) {
    const atual = canalAtual && canalAtual.id
      ? `\n\n📢 *Canal atual:* ${canalAtual.nome}\n🔗 ${canalAtual.link}`
      : '';
    return reply(
      '⚠️ Envie o link do canal junto com o comando.\nEx: `!channel https://whatsapp.com/channel/0029VbXXXXXXXX`' + atual
    );
  }

  const codigoCan = mCan[1];

  await reply('🔎 Procurando o canal...');

  try {
    const metaCan = await client.newsletterMetadata('invite', codigoCan);
    if (!metaCan || !metaCan.id) throw new Error('Canal sem ID');

    const nomeCan = metaCan.name || metaCan.thread_metadata?.name?.text || 'Canal';
    const linkCan = `https://whatsapp.com/channel/${codigoCan}`;

    setCanal({ id: metaCan.id, nome: nomeCan, link: linkCan });

    return reply(
      `✨ *CHANNEL ATIVO!* ✨\n\n` +
      `📢 Nome: ${nomeCan}\n` +
      `🔗 ${linkCan}\n\n` +
      `Para remover: !rmchannel`
    );
  } catch (err) {
    console.error('[CHANNEL] Erro:', err.message);
    return reply('❌ Não consegui encontrar esse canal. Confira o link.');
  }
}

// =========================================
// !rmchannel
// =========================================
export async function executeRmChannel(ctx) {
  const { sender, reply } = ctx;

  if (!isOwner(sender)) return reply('🚫 Apenas o dono pode remover o canal!');

  const canal = getCanal();
  if (!canal || !canal.id) return reply('ℹ️ Nenhum canal configurado.');

  const nomeRm = canal.nome || 'Canal';
  removerCanal();

  return reply(`🗑️ *CANAL REMOVIDO*\n\nO canal *${nomeRm}* foi desvinculado.`);
}
