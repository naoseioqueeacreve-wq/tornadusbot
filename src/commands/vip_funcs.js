import { PREFIX } from '../config.js';
import { isOwner } from '../functions/permissions.js';
import { isVIP, getVipExpiracao } from '../functions/vipDB.js';
import fs from 'node:fs';
import path from 'node:path';

const PERFIL_ARQUIVO = './src/database/vip_perfis.json';

// Função para garantir que o arquivo de perfis exista
function garantirPerfilDB() {
  const dir = path.dirname(PERFIL_ARQUIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(PERFIL_ARQUIVO)) {
    fs.writeFileSync(PERFIL_ARQUIVO, JSON.stringify({}, null, 2));
  }
}

function getPerfil(jid) {
  garantirPerfilDB();
  const db = JSON.parse(fs.readFileSync(PERFIL_ARQUIVO, 'utf-8'));
  const numero = jid.split('@')[0].split(':')[0];
  return db[numero] || { emoji: '' };
}

function salvarPerfil(jid, dados) {
  garantirPerfilDB();
  const db = JSON.parse(fs.readFileSync(PERFIL_ARQUIVO, 'utf-8'));
  const numero = jid.split('@')[0].split(':')[0];
  db[numero] = { ...db[numero], ...dados };
  fs.writeFileSync(PERFIL_ARQUIVO, JSON.stringify(db, null, 2));
}

// Verifica se é VIP ou Dono
function checarAcesso(ctx) {
  const { sender, reply } = ctx;
  if (!isVIP(sender) && !isOwner(sender)) {
    reply('❌ Este comando é exclusivo para usuários *VIP*!\n\n💎 Use /menuvip para saber mais.');
    return false;
  }
  return true;
}

// =========================================
// COMANDO: /vipinfo
// =========================================
export async function executeVipInfo(ctx) {
  if (!checarAcesso(ctx)) return;
  const { reply, sender } = ctx;

  const expiracao = getVipExpiracao(sender);
  let textoExp = 'Permanente / Dono';
  
  if (expiracao > 0) {
    textoExp = new Date(expiracao).toLocaleDateString('pt-BR');
  }

  return reply(
    `💎 *INFORMAÇÕES VIP*\n\n` +
    `👤 Status: *Ativado* ✅\n` +
    `📅 Expira em: *${textoExp}*\n\n` +
    `✨ *Seus Benefícios:*\n` +
    `• Acesso ao Menu VIP\n` +
    `• Ferramentas de Criptografia\n` +
    `• Gerador de QR Code\n` +
    `• Emojis Personalizados\n\n` +
    `👑 Obrigado por apoiar o bot!`
  );
}

// =========================================
// COMANDO: /vipsenha
// =========================================
export async function executeVipSenha(ctx) {
  if (!checarAcesso(ctx)) return;
  const { reply, args } = ctx;

  const tamanho = parseInt(args[0]) || 16;
  if (tamanho < 8 || tamanho > 64) {
    return reply('❌ O tamanho da senha deve ser entre 8 e 64 caracteres.');
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return reply(
    `🔐 *SENHA VIP GERADA*\n\n` +
    `\`${senha}\`\n\n` +
    `⚠️ _Não compartilhe esta senha com ninguém._`
  );
}

// =========================================
// COMANDO: /vipqr
// =========================================
export async function executeVipQR(ctx) {
  if (!checarAcesso(ctx)) return;
  const { reply, client, msg, q } = ctx;
  const jid = msg.key.remoteJid;

  if (!q) return reply(`📱 Use: ${PREFIX}vipqr <texto ou link>`);

  const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(q)}`;
  
  await client.sendMessage(jid, {
    image: { url },
    caption: `✅ *QR CODE GERADO*\n\n📝 Texto: ${q}`
  }, { quoted: msg });
}

// =========================================
// COMANDO: /vipcifrar e /vipdecifrar
// =========================================
export async function executeVipCifrar(ctx) {
  if (!checarAcesso(ctx)) return;
  const { reply, q } = ctx;

  if (!q) return reply(`🔒 Use: ${PREFIX}vipcifrar <texto>`);

  const encoded = Buffer.from(q, 'utf-8').toString('base64');
  return reply(`🔒 *TEXTO CIFRADO*\n\n\`${encoded}\`\n\n_Envie o código para a pessoa e ela pode decifrar usando o bot._`);
}

export async function executeVipDecifrar(ctx) {
  if (!checarAcesso(ctx)) return;
  const { reply, q } = ctx;

  if (!q) return reply(`🔓 Use: ${PREFIX}vipdecifrar <codigo_base64>`);

  try {
    const decoded = Buffer.from(q, 'base64').toString('utf-8');
    return reply(`🔓 *TEXTO DECIFRADO*\n\n${decoded}`);
  } catch (e) {
    return reply('❌ Código inválido ou corrompido.');
  }
}

// =========================================
// COMANDO: /vipemoji
// =========================================
export async function executeVipEmoji(ctx) {
  if (!checarAcesso(ctx)) return;
  const { reply, sender, q } = ctx;

  if (!q) {
    const perfil = getPerfil(sender);
    return reply(`😃 Seu emoji atual é: ${perfil.emoji || 'Nenhum'}\nPara mudar use: ${PREFIX}vipemoji 🔥`);
  }

  const emoji = q.trim().substring(0, 2); // Pega no máximo 2 caracteres
  salvarPerfil(sender, { emoji });

  return reply(`✅ Emoji VIP definido para: *${emoji}*\n_(Ele aparecerá ao lado do seu nome futuramente em comandos de RPG)_`);
}
