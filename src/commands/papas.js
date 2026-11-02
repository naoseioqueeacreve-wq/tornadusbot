import { PREFIX } from '../config.js';

export async function executePapa(ctx) {
  const { client, msg, q, reply } = ctx;
  const jid = msg.key.remoteJid;

  // 1. Reage à mensagem (✝️)
  try {
    await client.sendMessage(jid, { react: { text: '✝️', key: msg.key } });
  } catch (e) {}

  // Banco de dados dos Papas
  const papas = {
    "leao xiii": {
      nome: "Leão XIII (Gioacchino Pecci)",
      nascimento: "2 de março de 1810",
      morte: "20 de julho de 1903",
      pontificado: "1878 a 1903",
      sobre: "Iniciou a Doutrina Social da Igreja Católica com a famosa encíclica 'Rerum Novarum'.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Leo_XIII%2C_1887.jpg/800px-Leo_XIII%2C_1887.jpg",
      alias: ["leao 13"]
    },
    "pio x": {
      nome: "São Pio X (Giuseppe Sarto)",
      nascimento: "2 de junho de 1835",
      morte: "20 de agosto de 1914",
      pontificado: "1903 a 1914",
      sobre: "Incentivou a recepção frequente da Eucaristia e a comunhão para crianças. Foi canonizado santo.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Pius_X%2C_by_Ernest_Walter_Histed_%28retouched%29.jpg/800px-Pius_X%2C_by_Ernest_Walter_Histed_%28retouched%29.jpg",
      alias: ["pio 10", "sao pio x"]
    },
    "bento xv": {
      nome: "Bento XV (Giacomo della Chiesa)",
      nascimento: "21 de novembro de 1854",
      morte: "22 de janeiro de 1922",
      pontificado: "1914 a 1922",
      sobre: "Governou a Igreja durante a Primeira Guerra Mundial, promovendo esforços de paz e ajuda humanitária.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Pope_Benedictus_XV.jpg/800px-Pope_Benedictus_XV.jpg",
      alias: ["bento 15"]
    },
    "pio xi": {
      nome: "Pio XI (Achille Ratti)",
      nascimento: "31 de maio de 1857",
      morte: "10 de fevereiro de 1939",
      pontificado: "1922 a 1939",
      sobre: "Assinou o Tratado de Latrão em 1929, criando o Estado independente da Cidade do Vaticano.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Pius_XI_1932.jpg/800px-Pius_XI_1932.jpg",
      alias: ["pio 11"]
    },
    "pio xii": {
      nome: "Pio XII (Eugenio Pacelli)",
      nascimento: "2 de março de 1876",
      morte: "9 de outubro de 1958",
      pontificado: "1939 a 1958",
      sobre: "Foi o Papa durante a Segunda Guerra Mundial e declarou o dogma da Assunção de Maria.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Pius_XII_crop.jpg/800px-Pius_XII_crop.jpg",
      alias: ["pio 12"]
    },
    "joao xxiii": {
      nome: "São João XXIII (Angelo Roncalli)",
      nascimento: "25 de novembro de 1881",
      morte: "3 de junho de 1963",
      pontificado: "1958 a 1963",
      sobre: "Convocou o histórico Concílio Vaticano II. É conhecido como 'O Papa Bom'.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Johannes_XXIII_1962.jpg/800px-Johannes_XXIII_1962.jpg",
      alias: ["joao 23", "sao joao xxiii"]
    },
    "paulo vi": {
      nome: "São Paulo VI (Giovanni Montini)",
      nascimento: "26 de setembro de 1897",
      morte: "6 de agosto de 1978",
      pontificado: "1963 a 1978",
      sobre: "Concluiu o Concílio Vaticano II e foi o primeiro papa a realizar viagens internacionais de avião.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Paul_VI_1967.jpg/800px-Paul_VI_1967.jpg",
      alias: ["paulo 6", "sao paulo vi"]
    },
    "joao paulo i": {
      nome: "Beato João Paulo I (Albino Luciani)",
      nascimento: "17 de outubro de 1912",
      morte: "28 de setembro de 1978",
      pontificado: "1978 (33 dias)",
      sobre: "Conhecido como 'O Papa do Sorriso', teve um dos pontificados mais curtos da história da Igreja.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/John_Paul_I_%28retouched%29.jpg/800px-John_Paul_I_%28retouched%29.jpg",
      alias: ["joao paulo 1"]
    },
    "joao paulo ii": {
      nome: "São João Paulo II (Karol Wojtyła)",
      nascimento: "18 de maio de 1920",
      morte: "2 de abril de 2005",
      pontificado: "1978 a 2005",
      sobre: "O primeiro papa não italiano em 455 anos, teve o terceiro maior pontificado da história e viajou por todo o mundo.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Pope_John_Paul_II_by_David_Sankok.jpg/800px-Pope_John_Paul_II_by_David_Sankok.jpg",
      alias: ["joao paulo 2", "sao joao paulo ii"]
    },
    "bento xvi": {
      nome: "Bento XVI (Joseph Ratzinger)",
      nascimento: "16 de abril de 1927",
      morte: "31 de dezembro de 2022",
      pontificado: "2005 a 2013",
      sobre: "Teólogo brilhante, renunciou ao papado em 2013 devido à idade avançada.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Benedict_XVI_22_March_2006.jpg/800px-Benedict_XVI_22_March_2006.jpg",
      alias: ["bento 16"]
    },
    "francisco": {
      nome: "Francisco (Jorge Mario Bergoglio)",
      nascimento: "17 de dezembro de 1936",
      morte: "21 de abril de 2025",
      pontificado: "2013 a 2025",
      sobre: "O primeiro papa jesuíta e latino-americano da história. Focado na humildade, simplicidade e questões sociais.",
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pope_Francis_in_2023.jpg/800px-Pope_Francis_in_2023.jpg",
      alias: ["jorge bergoglio"]
    },
    "leao xiv": {
      nome: "Papa Leão XIV",
      sobre: "Iniciou seu pontificado no ano passado (2025).",
      exibirApenasBasico: true,
      foto: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Leo_XIII%2C_1887.jpg/800px-Leo_XIII%2C_1887.jpg", // Foto genérica para exemplo
      alias: ["leao", "leao 14", "papa leao"]
    }
  };

  // 2. Se o usuário não digitar nada, mostra a lista
  if (!q) {
    return reply(
      `⛪ *PAPAS A PARTIR DE 1900* ⛪\n\n` +
      `Digite *${PREFIX}papa <nome>* para ver os detalhes.\n\n` +
      `📜 *Lista de Papas disponíveis:*\n` +
      `• Leão XIII\n` +
      `• Pio X\n` +
      `• Bento XV\n` +
      `• Pio XI\n` +
      `• Pio XII\n` +
      `• João XXIII\n` +
      `• Paulo VI\n` +
      `• João Paulo I\n` +
      `• João Paulo II\n` +
      `• Bento XVI\n` +
      `• Francisco\n` +
      `• Leão XIV\n\n` +
      `💡 *Exemplo:* ${PREFIX}papa francisco`
    );
  }

  // 3. Normaliza a busca do usuário
  const busca = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  let papaEncontrado = null;

  for (const chave in papas) {
    const papa = papas[chave];
    const termos = [chave, papa.nome, ...(papa.alias || [])].map(t => 
      t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );

    if (termos.some(termo => busca.includes(termo) || termo.includes(busca))) {
      papaEncontrado = papa;
      break;
    }
  }

  // 4. Se encontrou, formata a mensagem
  if (papaEncontrado) {
    let texto = `⛪ *INFORMAÇÕES DO PAPA* ⛪\n\n`;

    if (papaEncontrado.exibirApenasBasico) {
      texto += `👤 *Nome:* ${papaEncontrado.nome}\n` +
               `📖 *Sobre:* ${papaEncontrado.sobre}`;
    } else {
      texto += `👤 *Nome:* ${papaEncontrado.nome}\n` +
               `🎂 *Nascimento:* ${papaEncontrado.nascimento}\n` +
               `✝️ *Falecimento:* ${papaEncontrado.morte}\n` +
               `👑 *Pontificado:* ${papaEncontrado.pontificado}\n\n` +
               `📖 *Quem foi:* ${papaEncontrado.sobre}`;
    }

    // Tenta enviar com foto, se a foto falhar, envia só o texto
    if (papaEncontrado.foto) {
      try {
        return await client.sendMessage(jid, {
          image: { url: papaEncontrado.foto },
          caption: texto
        }, { quoted: msg });
      } catch (e) {
        return reply(texto); // Se a foto der erro, manda só o texto
      }
    } else {
      return reply(texto);
    }
  } else {
    return reply(`❌ *Papa não encontrado.*\n\nUse *${PREFIX}papa* para ver a lista de papas disponíveis.`);
  }
}
