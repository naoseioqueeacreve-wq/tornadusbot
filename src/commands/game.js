import { PREFIX } from '../config.js';
import fs from 'node:fs';

function getFotoMenu(nomeMenu) {
  const caminho = `./src/assets/menus/${nomeMenu}.jpg`;
  if (fs.existsSync(caminho)) return fs.readFileSync(caminho);
  return null;
}

export async function executeMenuGame(ctx) {
  const { reply, sender } = ctx;

  const menuText = `╭━━━〔 🎮 𝗠𝗘𝗡𝗨 𝗚𝗔𝗠𝗘 〕━━━╮\n` +
    `│\n` +
    `│  𖹭 🎲 𝗝𝗢𝗚𝗢𝗦 𝗖𝗟𝗔́𝗦𝗦𝗜𝗖𝗢𝗦 𖹭\n` +
    `│  ╰┈➤ ⭕ ${PREFIX}velha\n` +
    `│  ╰┈➤ ✂️ ${PREFIX}ppt\n` +
    `│  ╰┈➤ 🃏 ${PREFIX}blackjack (21)\n` +
    `│  ╰┈➤ 🔫 ${PREFIX}roleta-russa\n` +
    `│\n` +
    `│  𖹭 🧠 𝗔𝗗𝗜𝗩𝗜𝗡𝗛𝗔𝗖̧𝗢̃𝗘𝗦 𝗘 𝗤𝗨𝗜𝗭 𖹭\n` +
    `│  ╰┈➤ 🧞‍♂️ ${PREFIX}akinator\n` +
    `│  ╰┈➤ 🏆 ${PREFIX}topakinator\n` +
    `│  ╰┈➤ 🤔 ${PREFIX}adivinha\n` +
    `│  ╰┈➤ 🐾 ${PREFIX}quizanimal\n` +
    `│  ╰┈➤ 🌍 ${PREFIX}bandeira\n` +
    `│  ╰┈➤ 🧮 ${PREFIX}matematica\n` +
    `│  ╰┈➤ 🧩 ${PREFIX}memoria\n` +
    `│\n` +
    `│  𖹭 📝 𝗣𝗔𝗟𝗔𝗩𝗥𝗔𝗦 𝗘 𝗧𝗘𝗫𝗧𝗢𝗦 𖹭\n` +
    `│  ╰┈➤ 🔠 ${PREFIX}anagrama\n` +
    `│  ╰┈➤ 🔀 ${PREFIX}desembaralhar\n` +
    `│  ╰┈➤ 🛑 ${PREFIX}stop\n` +
    `│  ╰┈➤ 🕵️ ${PREFIX}forca\n` +
    `│  ╰┈➤ 📖 ${PREFIX}palavra\n` +
    `│\n` +
    `│  𖹭 💬 𝗜𝗡𝗧𝗘𝗥𝗔𝗖̧𝗔̃𝗢 𝗘 𝗦𝗢𝗥𝗧𝗘 𖹭\n` +
    `│  ╰┈➤ 💬 ${PREFIX}vdd\n` +
    `│  ╰┈➤ 🙊 ${PREFIX}eununca\n` +
    `│  ╰┈➤ 🧬 ${PREFIX}dna <@user>\n` +
    `│\n` +
    `│  ⚠️ *Todos os jogos têm limite de tempo!*\n` +
    `│  💡 *Para parar um jogo, digite:* ${PREFIX}parar\n` +
    `│\n` +
    `╰━━━〔 🎮 Diversão Garantida 〕━━━╯`;

  const foto = getFotoMenu('game');
  if (foto) return reply(menuText, { image: foto, mentions: [sender] });
  return reply(menuText, { mentions: [sender] });
}

export async function executeDaily(ctx) {
  const { reply, sender, pushName } = ctx;
  return reply(
    `🎁 *BÔNUS DIÁRIO*\n\n` +
    `Olá, ${pushName}! Você já resgatou seu bônus de hoje.\n` +
    `Volte amanhã para receber mais moedas!`
  );
}
