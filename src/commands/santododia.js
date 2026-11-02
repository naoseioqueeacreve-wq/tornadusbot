import { PREFIX } from '../config.js';
import { verificarCooldownSanto, registrarUsoSanto } from '../functions/santoDB.js';

// =========================================
// BANCO DE DADOS DOS SANTOS
// =========================================
// No futuro, você pode adicionar a propriedade "foto: 'url_aqui'" em cada santo.
const SANTOS = [
  {
    nome: "Santo Antônio de Pádua",
    historia: "Frade franciscano português, conhecido como o 'Santo Casamenteiro'. Foi um grande pregador e teólogo, discípulo de São Francisco de Assis.",
    papa: "Papa Gregório IX (em 1232)",
    milagres: "Ficou famoso pelo milagre da pregação aos peixes e por encontrar objetos perdidos. Há relatos de aparições e curas após sua morte."
  },
  {
    nome: "São Francisco de Assis",
    historia: "Fundador da Ordem dos Frades Menores (Franciscanos). Deixou uma vida de riqueza para viver na pobreza absoluta, pregando o amor à natureza e aos animais.",
    papa: "Papa Gregório IX (em 1228)",
    milagres: "Recebeu os estigmas (chagas de Cristo) em seu corpo. É conhecido pelo milagre de acalmar o lobo de Gubbio e por sua comunhão mística com os animais."
  },
  {
    nome: "São João Paulo II",
    historia: "O primeiro papa não italiano em 455 anos. Teve um dos pontificados mais longos da história, viajando o mundo inteiro e sendo uma voz de paz.",
    papa: "Papa Francisco (em 2014)",
    milagres: "A cura de uma freira francesa do Mal de Parkinson e a cura de uma mulher costa-riquenha de um aneurisma cerebral, ambos após rezas a ele."
  },
  {
    nome: "Santa Teresa de Calcutá (Madre Teresa)",
    historia: "Missionária albanesa que dedicou sua vida aos pobres e doentes na Índia. Fundou as Missionárias da Caridade.",
    papa: "Papa Francisco (em 2016)",
    milagres: "A cura milagrosa de uma mulher indiana com um tumor no abdômen e a cura de um homem brasileiro com múltiplos abscessos cerebrais."
  },
  {
    nome: "São Judas Tadeu",
    historia: "Um dos doze apóstolos de Jesus Cristo. É conhecido como o santo das causas impossíveis e desesperadas.",
    papa: "Papa Paulo III (em 1569)", // Reconhecimento formal do culto antigo
    milagres: "Sua carta no Novo Testamento e a tradição de que ele operou muitas curas e expulsou demônios durante suas viagens missionárias."
  },
  {
    nome: "Nossa Senhora Aparecida",
    historia: "Padroeira do Brasil. A imagem foi encontrada por pescadores no Rio Paraíba do Sul em 1717.",
    papa: "Papa Francisco (em 2017)", // Para celebrar os 300 anos
    milagres: "A pesca milagrosa no dia em que foi encontrada, e inúmeros relatos de graças alcançadas ao longo de três séculos."
  },
  {
    nome: "São Jorge",
    historia: "Soldado romano e mártir cristão. É muito venerado no Brasil e associado à proteção e à coragem.",
    papa: "Papa Gelásio I (século V)",
    milagres: "A lenda mais famosa é a de que ele salvou uma cidade matando um dragão. Historicamente, é conhecido por sua fé inabalável diante do martírio."
  },
  {
    nome: "Santa Rita de Cássia",
    historia: "Conhecida como a 'Santa das Causas Impossíveis'. Foi esposa, mãe, viúva e depois freira agostiniana.",
    papa: "Papa Leão XIII (em 1900)",
    milagres: "Recebeu um espinho da coroa de Cristo em sua testa. Há inúmeros relatos de curas e resolução de problemas familiares graves."
  },
  {
    nome: "São Bento de Núrsia",
    historia: "Fundador do monasticismo ocidental. Criou a Regra de São Bento, que organizou a vida nos mosteiros.",
    papa: "Papa Honório III (em 1220)",
    milagres: "O milagre da cruz de São Bento, usada para afastar o mal. Também é famoso por resistir a tentações e por milagres de multiplicação de alimentos."
  },
  {
    nome: "Santa Catarina de Sena",
    historia: "Doutora da Igreja e mística. Teve um papel político crucial, ajudando a trazer o Papa de volta a Roma.",
    papa: "Papa Pio II (em 1461)",
    milagres: "Recebeu os estigmas invisíveis e tinha o dom da leitura dos corações. É conhecida por suas experiências místicas profundas."
  },
  {
    nome: "São José",
    historia: "Esposo de Maria e pai adotivo de Jesus. Padroeiro da Igreja Universal e dos trabalhadores.",
    papa: "Papa Gregório XV (em 1621)",
    milagres: "O milagre de salvar a Sagrada Família na fuga para o Egito. É o santo padroeiro de uma 'boa morte'."
  },
  {
    nome: "São Sebastião",
    historia: "Soldado romano que se converteu ao cristianismo e foi martirizado a flechadas.",
    papa: "Papa Gelásio I (século V)",
    milagres: "Sobreviveu ao martírio das flechas, sendo curado por Santa Irene. É invocado contra a peste e as guerras."
  },
  {
    nome: "São Pedro",
    historia: "O primeiro Papa. Foi um dos apóstolos mais próximos de Jesus e líder da Igreja primitiva.",
    papa: "Reconhecido como o primeiro Bispo de Roma e Papa.",
    milagres: "Caminhou sobre as águas (com Jesus), curou um paralítico e a sombra de seu corpo curava os doentes."
  },
  {
    nome: "Santa Joana d'Arc",
    historia: "Jovem camponesa francesa que liderou o exército francês na Guerra dos Cem Anos, guiada por visões de santos.",
    papa: "Papa Bento XV (em 1920)",
    milagres: "A própria vida dela é considerada um milagre. Após sua morte, foram reconhecidas curas milagrosas por sua intercessão."
  },
  {
    nome: "São Tomás de Aquino",
    historia: "Frade dominicano e um dos maiores teólogos e filósofos da história da Igreja Católica. Criou a Suma Teológica.",
    papa: "Papa João XXII (em 1323)",
    milagres: "Sua obra é considerada um milagre intelectual. Após sua morte, seu corpo exalou um perfume suave e ocorreram curas em seu túmulo."
  }
];

// =========================================
// COMANDO: /santododia
// =========================================
export async function executeSantoDoDia(ctx) {
  const { client, msg, jid, sender, reply } = ctx;

  // 1. Verifica o cooldown
  const check = verificarCooldownSanto(sender);
  
  if (!check.permitido) {
    await client.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
    return reply(
      `⏳ *CALMA AÍ, DEVOTO!*\n\n` +
      `*O Freddy ainda está preparando o próximo santo para você ver.*\n` +
      `> Volte daqui a pouco para receber uma nova bênção!\n\n` +
      `⏱️ *Tempo restante:* ${check.horas}h ${check.minutos}m`
    );
  }

  try {
    // 2. Sorteia um santo
    const santoSorteado = SANTOS[Math.floor(Math.random() * SANTOS.length)];

    // 3. Formata a mensagem
    const mensagem = `⛪𝐒𝐀𝐍𝐓𝐎 𝐃𝐎 𝐃𝐈𝐀 ⛪\n` +
      ` \n` +
      `  👤 *Santo:* ${santoSorteado.nome}\n` +
      ` \n` +
      `  🕊️ 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂̧𝐎̃𝐄𝐒 🕊️ \n\n` +
      `📖 *Quem foi:*\n${santoSorteado.historia}\n\n` +
      `👑 *Canonizado por:*\n${santoSorteado.papa}\n\n` +
      `✨ *Milagres:*\n${santoSorteado.milagres}\n\n` +
      `🙏 _"A santidade não consiste em fazer coisas extraordinárias, mas em fazer as coisas ordinárias de forma extraordinária."_\n\n` +
      `💡 _Volte amanhã para receber outro santo!_`;

    // 4. Envia a mensagem (Reaja com ✅)
    await client.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    // NOTA: Quando você tiver as fotos, descomente o bloco abaixo e coloque o link na propriedade "foto" no array SANTOS.
    /*
    if (santoSorteado.foto) {
      return await client.sendMessage(jid, {
        image: { url: santoSorteado.foto },
        caption: mensagem
      }, { quoted: msg });
    }
    */

    await reply(mensagem);

    // 5. Registra o uso para ativar as 24h de cooldown
    registrarUsoSanto(sender);

  } catch (error) {
    console.error('[SANTO DO DIA] Erro:', error.message);
    await client.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    return reply('❌ Ocorreu um erro ao buscar o santo do dia. Tente novamente mais tarde.');
  }
}
