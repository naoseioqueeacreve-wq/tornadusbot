import { getUsuario } from '../functions/rpg.js';
import { isOwner, isAdmin } from '../functions/permissions.js';

// =========================================
// FUNÇÕES AUXILIARES
// =========================================
function chutarPorcentagem() {
  return Math.floor(Math.random() * 104); // 0 a 103
}

function chutarValor() {
  return Math.floor(Math.random() * (9999 - 200 + 1)) + 200; // 200 a 9999
}

function formatarNumero(numero) {
  return numero.toLocaleString('pt-BR');
}

// =========================================
// COMANDO: !perfil
// =========================================
export async function executePerfilGlobal(ctx) {
  const { client, msg, sender, pushName, isGroup, groupMetadata } = ctx;

  const user = getUsuario(sender);
  const dados = user.dados || { mensagens: 0, comandos: 0, figurinhas: 0 };

  // =========================================
  // COLETA DE DADOS
  // =========================================
  const numero = sender.split('@')[0].split(':')[0];

  // Descrição (status do WhatsApp)
  let descricao = 'Sem Bio';
  try {
    const status = await client.fetchStatus(sender);
    if (status && status.status) {
      descricao = status.status;
    }
  } catch (e) {
    // Ignora se não conseguir pegar
  }

  // Plataforma (Android, iOS, Web)
  let plataforma = 'Desconhecida';
  try {
    const presence = await client.fetchStatus(sender);
    // O Baileys não tem uma API direta pra plataforma,
    // então fazemos um chute baseado no dispositivo.
    // Se você tiver como pegar do dispositivo conectado, use aqui.
    plataforma = 'Android 🗿';
  } catch (e) {}

  // =========================================
  // PATENTES
  // =========================================
  const ehDono = isOwner(sender);
  const ehAdm = isGroup ? isAdmin(sender, groupMetadata) : false;

  const masterEmoji = ehDono ? '✅' : '❌';
  const admEmoji = ehAdm ? '✅' : '❌';

  // =========================================
  // PERSONALIDADE (aleatório)
  // =========================================
  const gado = chutarPorcentagem();
  const puta = chutarPorcentagem();
  const gostosura = chutarPorcentagem();
  const beleza = chutarPorcentagem();
  const programa = chutarValor();

  // =========================================
  // MONTAGEM DO PERFIL
  // =========================================
  const texto = 
`╔══════════════════════╗
⟁ 𝐅𝐈𝐂𝐇𝐀 𝐃𝐄 𝐔𝐒𝐔𝐀́𝐑𝐈𝐎 ⟁
╚══════════════════════╝

┌──────────────────────┐
❖ 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂̧𝐎̃𝐄𝐒 ❖
└──────────────────────┘

▸ 🌠 𝐀𝐏𝐄𝐋𝐈𝐃𝐎 ➺ ${pushName || 'Sem nome'}
▸ ☎️ 𝐂𝐎𝐍𝐓𝐀𝐓𝐎 ➺ ${numero}
▸ 📝 𝐃𝐄𝐒𝐂𝐑𝐈𝐂̧𝐀̃𝐎 ➺ ${descricao}
▸ 📲 𝐏𝐋𝐀𝐓𝐀𝐅𝐎𝐑𝐌𝐀 ➺ ${plataforma}

┌──────────────────────┐
❖ 𝐏𝐀𝐓𝐄𝐍𝐓𝐄𝐒 ❖
└──────────────────────┘

▸ 👑 𝐌𝐀𝐒𝐓𝐄𝐑 ➺ 〘 ${masterEmoji} 〙
▸ 🔐 𝐀𝐃𝐌 ➺ 〘 ${admEmoji} 〙
▸ 🏦 𝐂𝐀𝐈𝐗𝐀 ➺ 〘 ${user.coins} 〙

┌──────────────────────┐
❖ 𝐏𝐄𝐑𝐒𝐎𝐍𝐀𝐋𝐈𝐃𝐀𝐃𝐄 ❖
└──────────────────────┘

▸ 🐄 𝐆𝐀𝐃𝐎 ➺ ${gado}%
▸ 🌷 𝐏𝐔𝐓𝐀 ➺ ${puta}%
▸ 🥵 𝐆𝐎𝐗𝐓𝐎𝐒𝐔𝐑𝐀 ➺ ${gostosura}%
▸ 😻 𝐁𝐄𝐋𝐄𝐙𝐀 ➺ ${beleza}%
▸ 🧸 𝐏𝐑𝐎𝐆𝐑𝐀𝐌𝐀 ➺ R$${formatarNumero(programa)}

┌──────────────────────┐
❖ 𝐃𝐀𝐃𝐎𝐒 ❖
└──────────────────────┘

▸ ✉️ 𝐌𝐄𝐍𝐒𝐀𝐆𝐄𝐍𝐒 ➺ ${formatarNumero(dados.mensagens)}
▸ 🎯 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 ➺ ${formatarNumero(dados.comandos)}
▸ 🩷 𝐅𝐈𝐆𝐔𝐑𝐈𝐍𝐇𝐀𝐒 ➺ ${formatarNumero(dados.figurinhas)}

╔══════════════════════╗
⟁ 𝐅𝐈𝐌 𝐃𝐀 𝐅𝐈𝐂𝐇𝐀 ⟁
╚══════════════════════╝

✩ ✩ ✩ ✩ ✩`;

  return client.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg });
}
