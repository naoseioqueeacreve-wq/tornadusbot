import { PREFIX } from '../config.js';
import { getUsuario as getRpgUser, salvarUsuario as saveRpgUser } from '../functions/rpg.js';
import { getUsuario as getPokeUser, salvarUsuario as savePokeUser } from '../functions/pokemonDB.js';
import { enviarBotoes, botaoLista } from '../functions/botoes.js';

export async function executeCambio(ctx) {
  const { client, msg, sender, jid, q, reply } = ctx;
  
  // Pega os dados dos dois sistemas
  const rpgUser = getRpgUser(sender);
  const pokeUser = getPokeUser(sender);

  const qtd = parseInt(q.trim());

  // Se o usuário não digitou a quantidade, mostra o menu de botões
  if (!qtd || qtd <= 0) {
    const secoes = [
      {
        titulo: "💱 𝙊𝙋𝘾̧𝙊̃𝙀𝙎 𝘿𝙀 𝘾𝘼̂𝙈𝘽𝙄𝙊 ↴",
        linhas: [
          { titulo: "💳 100 PokéCoins", descricao: "Custa 1.000 RPG Coins", tag: "Trocar", id: `${PREFIX}cambio 100` },
          { titulo: "💳 250 PokéCoins", descricao: "Custa 2.500 RPG Coins", tag: "Trocar", id: `${PREFIX}cambio 250` },
          { titulo: "💳 500 PokéCoins", descricao: "Custa 5.000 RPG Coins", tag: "Trocar", id: `${PREFIX}cambio 500` },
          { titulo: "💳 1.000 PokéCoins", descricao: "Custa 10.000 RPG Coins", tag: "Trocar", id: `${PREFIX}cambio 1000` }
        ]
      }
    ];

    const botoes = [ botaoLista('『 𝑻𝑹𝑶𝑪𝑨𝑹 𝑪𝑶𝑰𝑵𝑺 』', secoes) ];
    
    const texto = `💱 *CÂMBIO DE MOEDAS*\n\nAqui você pode trocar suas *RPG Coins* por *PokéCoins* para usar no sistema Pokémon!\n\n💰 *Sua Carteira RPG:* ${rpgUser.coins.toLocaleString('pt-BR')} Coins\n💳 *Sua Carteira Pokémon:* ${pokeUser.pokecoins.toLocaleString('pt-BR')} PokéCoins\n\n👇 Selecione uma opção abaixo para trocar:`;

    try {
      return await enviarBotoes(client, jid, {
        titulo: '🏦 Banco Central',
        corpo: texto,
        rodape: '© Pikachu Bot',
        mencoes: [sender],
        botoes
      }, msg);
    } catch {
      return reply(texto);
    }
  }

  // Se digitou a quantidade, processa o câmbio
  // Regra: 1000 Coins = 100 PokéCoins (ou seja, 10 Coins = 1 PokéCoin)
  const custoRpg = qtd * 10; 
  const pokecoinsGanhas = qtd;

  if (rpgUser.coins < custoRpg) {
    return reply(
      `❌ *SALDO INSUFICIENTE*\n\n` +
      `💸 Para comprar *${pokecoinsGanhas} PokéCoins*, você precisa de *${custoRpg.toLocaleString('pt-BR')} RPG Coins*.\n` +
      `💰 Seu saldo atual: *${rpgUser.coins.toLocaleString('pt-BR')} Coins*.`
    );
  }

  // Desconta do RPG e Adiciona no Pokémon
  rpgUser.coins -= custoRpg;
  pokeUser.pokecoins += pokecoinsGanhas;

  // Salva nos dois bancos de dados
  saveRpgUser(sender, rpgUser);
  savePokeUser(sender, pokeUser);

  return reply(
    `✅ *CÂMBIO REALIZADO COM SUCESSO!*\n\n` +
    `💸 Você gastou: *${custoRpg.toLocaleString('pt-BR')}* RPG Coins\n` +
    `🎁 Você recebeu: *${pokecoinsGanhas.toLocaleString('pt-BR')}* PokéCoins\n\n` +
    `💰 Saldo RPG: *${rpgUser.coins.toLocaleString('pt-BR')}*\n` +
    `💳 Saldo Pokémon: *${pokeUser.pokecoins.toLocaleString('pt-BR')}*`
  );
}
