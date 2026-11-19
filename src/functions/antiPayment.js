import { getGrupo } from './adminDB.js';
import { isOwner, isAdmin } from './permissions.js';

// =========================================
// PADRÕES DE DETECÇÃO DE PAGAMENTO
// =========================================
const REGEX_CHAVE_PIX_ALEATORIA = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const REGEX_CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const REGEX_CNPJ = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/;
const REGEX_TELEFONE_PIX = /\b(?:\+?55)?\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/;
const REGEX_VALOR_DINHEIRO = /(r\$|rs\$?|reais)\s?\d+([.,]\d{2})?/i;
const REGEX_CODIGO_BOLETO = /\b\d{5}\.\d{5}\s?\d{5}\.\d{6}\s?\d{5}\.\d{6}\s?\d\s?\d{14}\b/;
const REGEX_QRCODE_PIX_PAYLOAD = /00020126/; // payload EMV típico de QR Pix
const REGEX_PALAVRAS_PAGAMENTO = /\b(pix|pague|pagamento|transfer[eê]ncia|dep[oó]sito|boleto|paypal|mercado\s?pago|picpay|nubank|cart[aã]o\s?de\s?cr[eé]dito|chave\s?pix|qr\s?code\s?pix|valor\s?de\s?r\$?)\b/i;
const REGEX_LINK_PAGAMENTO = /(mpago\.la|picpay\.me|paypal\.me|pix\.link|nubank\.com\.br\/cobrar|mercadopago\.com)/i;

export function detectarPagamento(texto = '') {
  if (!texto || typeof texto !== 'string') return { suspeito: false };

  const alvo = texto.toLowerCase();
  const sinais = [];

  if (REGEX_CHAVE_PIX_ALEATORIA.test(texto)) sinais.push('chave_pix_aleatoria');
  if (REGEX_QRCODE_PIX_PAYLOAD.test(texto)) sinais.push('qrcode_pix_payload');
  if (REGEX_CODIGO_BOLETO.test(texto)) sinais.push('codigo_boleto');
  if (REGEX_LINK_PAGAMENTO.test(texto)) sinais.push('link_pagamento');
  if (REGEX_VALOR_DINHEIRO.test(texto)) sinais.push('valor_dinheiro');
  if (REGEX_PALAVRAS_PAGAMENTO.test(alvo)) sinais.push('palavra_chave');
  if (REGEX_CPF.test(texto) || REGEX_CNPJ.test(texto)) sinais.push('documento');
  if (REGEX_TELEFONE_PIX.test(texto) && REGEX_PALAVRAS_PAGAMENTO.test(alvo)) sinais.push('telefone_contexto_pix');

  // Critério: QR Code payload ou link de pagamento já é prova suficiente isolada.
  const provaForte = sinais.includes('qrcode_pix_payload') || sinais.includes('link_pagamento') || sinais.includes('chave_pix_aleatoria');

  // Critério: combinação de pelo menos 2 sinais fracos (ex: "pix" + valor em R$)
  const combinado = sinais.length >= 2;

  return {
    suspeito: provaForte || combinado,
    sinais
  };
}

export function extrairTextoMensagem(msg) {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    ''
  );
}

export async function verificarAntiPayment(client, msg) {
  try {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) return false;

    const grupo = getGrupo(jid);
    if (!grupo?.antiPayment) return false;

    const sender = msg.key.participant || msg.key.remoteJid;

    // Nunca age contra o dono do bot ou administradores
    const groupMetadata = await client.groupMetadata(jid).catch(() => null);
    if (isOwner(sender)) return false;
    if (groupMetadata && isAdmin(sender, groupMetadata)) return false;

    const texto = extrairTextoMensagem(msg);
    const { suspeito, sinais } = detectarPagamento(texto);

    if (!suspeito) return false;

    // --- AÇÃO: tenta deletar a mensagem ---
    try {
      await client.sendMessage(jid, { delete: msg.key });
    } catch {}

    // --- AÇÃO: remove o autor do grupo ---
    let banido = false;
    try {
      await client.groupParticipantsUpdate(jid, [sender], 'remove');
      banido = true;
    } catch {}

    // --- AÇÃO: fecha o grupo temporariamente (3 minutos) ---
    let fechou = false;
    try {
      await client.groupSettingUpdate(jid, 'announcement');
      fechou = true;
      setTimeout(async () => {
        try {
          await client.groupSettingUpdate(jid, 'not_announcement');
          await client.sendMessage(jid, {
            text: '🔓 *Grupo reaberto automaticamente* após medida de segurança do Anti-Payment.'
          });
        } catch {}
      }, 3 * 60 * 1000);
    } catch {}

    await client.sendMessage(jid, {
      text:
        `🚨 *ANTI-PAYMENT ACIONADO*\n\n` +
        `👤 Usuário: @${sender.split('@')[0]}\n` +
        `🔎 Indícios: ${sinais.join(', ')}\n` +
        (banido ? `🚫 Usuário *removido* do grupo.\n` : `⚠️ Não consegui remover o usuário (verifique se sou admin).\n`) +
        (fechou ? `🔒 Grupo *fechado por 3 minutos* como medida de segurança.\n` : ``) +
        `\n⚠️ Pedidos de pagamento, chaves Pix, boletos ou QR Codes financeiros não são permitidos aqui.`,
      mentions: [sender]
    });

    return true;
  } catch (e) {
    console.log('[ANTI-PAYMENT ERRO]', e.message);
    return false;
  }
}
