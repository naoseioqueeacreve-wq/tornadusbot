// =========================================
// COMANDOS DO MENU DE MEMBROS
// Ferramentas úteis - Sem API, sem coins
// =========================================

// =========================================
// 📅 DATA E HORA
// =========================================
export async function executeData(ctx) {
  const { reply } = ctx;
  const agora = new Date();
  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const diaSemana = diasSemana[agora.getDay()];
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = meses[agora.getMonth()];
  const ano = agora.getFullYear();

  return reply(
    `📅 *DATA ATUAL*\n\n` +
    `📆 ${diaSemana}, ${dia} de ${mes} de ${ano}`
  );
}

export async function executeHora(ctx) {
  const { reply } = ctx;
  const agora = new Date();
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');
  const segundo = String(agora.getSeconds()).padStart(2, '0');

  return reply(
    `⏰ *HORA ATUAL*\n\n` +
    `🕐 ${hora}:${minuto}:${segundo}`
  );
}

// =========================================
// 🎂 IDADE
// =========================================
export async function executeIdade(ctx) {
  const { reply, q } = ctx;

  if (!q) {
    return reply('❌ Use: /idade DD/MM/AAAA\n\nExemplo: /idade 15/08/2000');
  }

  const match = q.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!match) {
    return reply('❌ Formato inválido! Use: /idade DD/MM/AAAA');
  }

  const dia = parseInt(match[1]);
  const mes = parseInt(match[2]) - 1;
  const ano = parseInt(match[3]);

  const nascimento = new Date(ano, mes, dia);
  const hoje = new Date();

  if (nascimento > hoje) return reply('❌ Data no futuro!');
  if (dia > 31 || mes > 11) return reply('❌ Data inválida!');

  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();

  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }

  return reply(
    `🎂 *CALCULADORA DE IDADE*\n\n` +
    `📅 Nascimento: ${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}/${ano}\n` +
    `🎉 Idade: *${idade} anos*`
  );
}

// =========================================
// 🏋️ IMC
// =========================================
export async function executeIMC(ctx) {
  const { reply, args } = ctx;

  if (args.length < 2) {
    return reply('❌ Use: /imc <peso> <altura>\n\nExemplo: /imc 70 1.75');
  }

  const peso = parseFloat(args[0]);
  const altura = parseFloat(args[1]);

  if (isNaN(peso) || isNaN(altura) || peso <= 0 || altura <= 0) {
    return reply('❌ Peso e altura devem ser números válidos!');
  }

  const imc = peso / (altura * altura);
  let classificacao = '';

  if (imc < 18.5) classificacao = '🔵 Abaixo do peso';
  else if (imc < 25) classificacao = '🟢 Peso normal';
  else if (imc < 30) classificacao = '🟡 Sobrepeso';
  else if (imc < 35) classificacao = '🟠 Obesidade Grau I';
  else if (imc < 40) classificacao = '🔴 Obesidade Grau II';
  else classificacao = '⚫ Obesidade Grau III';

  return reply(
    `🏋️ *CALCULADORA DE IMC*\n\n` +
    `⚖️ Peso: ${peso} kg\n` +
    `📏 Altura: ${altura} m\n` +
    `📊 IMC: *${imc.toFixed(2)}*\n\n` +
    `📋 Classificação: ${classificacao}`
  );
}

// =========================================
// 📊 PORCENTAGEM
// =========================================
export async function executePorcentagem(ctx) {
  const { reply, args } = ctx;

  if (args.length < 2) {
    return reply('❌ Use: /porcentagem <valor> <porcentagem>\n\nExemplo: /porcentagem 200 15');
  }

  const valor = parseFloat(args[0]);
  const porcento = parseFloat(args[1]);

  if (isNaN(valor) || isNaN(porcento)) {
    return reply('❌ Use apenas números!');
  }

  const resultado = (valor * porcento) / 100;

  return reply(
    `📊 *PORCENTAGEM*\n\n` +
    `🔢 ${porcento}% de ${valor}\n` +
    `✅ Resultado: *${resultado}*`
  );
}

// =========================================
// 📐 REGRA DE TRÊS
// =========================================
export async function executeRegra3(ctx) {
  const { reply, args } = ctx;

  if (args.length < 3) {
    return reply('❌ Use: /regra3 <A> <B> <C>\n\nExemplo: /regra3 5 10 20\n\n*A* está para *B*, assim como *C* está para *X*');
  }

  const a = parseFloat(args[0]);
  const b = parseFloat(args[1]);
  const c = parseFloat(args[2]);

  if (isNaN(a) || isNaN(b) || isNaN(c) || a === 0) {
    return reply('❌ Valores inválidos!');
  }

  const x = (b * c) / a;

  return reply(
    `📐 *REGRA DE TRÊS*\n\n` +
    `🔹 ${a} → ${b}\n` +
    `🔹 ${c} → *${x}*\n\n` +
    `✅ Resultado: *${x}*`
  );
}

// =========================================
// 💰 JUROS
// =========================================
export async function executeJuros(ctx) {
  const { reply, args } = ctx;

  if (args.length < 3) {
    return reply('❌ Use: /juros <capital> <taxa%> <tempo>\n\nExemplo: /juros 1000 5 12\n(taxa ao mês, tempo em meses)');
  }

  const capital = parseFloat(args[0]);
  const taxa = parseFloat(args[1]) / 100;
  const tempo = parseFloat(args[2]);

  if (isNaN(capital) || isNaN(taxa) || isNaN(tempo)) {
    return reply('❌ Valores inválidos!');
  }

  const jurosSimples = capital * taxa * tempo;
  const montanteSimples = capital + jurosSimples;
  const montanteComposto = capital * Math.pow(1 + taxa, tempo);
  const jurosComposto = montanteComposto - capital;

  return reply(
    `💰 *CALCULADORA DE JUROS*\n\n` +
    `💵 Capital: R$ ${capital.toFixed(2)}\n` +
    `📈 Taxa: ${(taxa * 100).toFixed(2)}%\n` +
    `⏳ Tempo: ${tempo} meses\n\n` +
    `📊 *JUROS SIMPLES*\n` +
    `Juros: R$ ${jurosSimples.toFixed(2)}\n` +
    `Montante: R$ ${montanteSimples.toFixed(2)}\n\n` +
    `📊 *JUROS COMPOSTOS*\n` +
    `Juros: R$ ${jurosComposto.toFixed(2)}\n` +
    `Montante: R$ ${montanteComposto.toFixed(2)}`
  );
}

// =========================================
// 🔐 GERADOR DE SENHA
// =========================================
export async function executeSenha(ctx) {
  const { reply, args } = ctx;
  const tamanho = parseInt(args[0]) || 16;

  if (tamanho < 4 || tamanho > 64) {
    return reply('❌ O tamanho deve ser entre 4 e 64 caracteres!');
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*?';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return reply(
    `🔐 *SENHA GERADA*\n\n` +
    `🔑 \`${senha}\`\n\n` +
    `📏 Tamanho: ${tamanho} caracteres\n` +
    `⚠️ Guarde em local seguro!`
  );
}

// =========================================
// 🎲 SORTEAR NÚMERO
// =========================================
export async function executeSortear(ctx) {
  const { reply, args } = ctx;

  if (args.length < 2) {
    return reply('❌ Use: /sortear <min> <max>\n\nExemplo: /sortear 1 100');
  }

  const min = parseInt(args[0]);
  const max = parseInt(args[1]);

  if (isNaN(min) || isNaN(max) || min >= max) {
    return reply('❌ Valores inválidos! O mínimo deve ser menor que o máximo.');
  }

  const resultado = Math.floor(Math.random() * (max - min + 1)) + min;

  return reply(
    `🎲 *SORTEIO DE NÚMERO*\n\n` +
    `📉 Mínimo: ${min}\n` +
    `📈 Máximo: ${max}\n\n` +
    `🎯 Resultado: *${resultado}*`
  );
}

// =========================================
// 🎯 ESCOLHER OPÇÃO
// =========================================
export async function executeEscolher(ctx) {
  const { reply, q } = ctx;

  if (!q || !q.includes(',')) {
    return reply('❌ Use: /escolher <opção1>, <opção2>, <opção3>\n\nExemplo: /escolher Pizza, Hambúrguer, Sushi');
  }

  const opcoes = q.split(',').map(o => o.trim()).filter(o => o.length > 0);

  if (opcoes.length < 2) {
    return reply('❌ Informe pelo menos 2 opções separadas por vírgula!');
  }

  const escolhida = opcoes[Math.floor(Math.random() * opcoes.length)];

  return reply(
    `🎯 *ESCOLHA ALEATÓRIA*\n\n` +
    `📋 Opções: ${opcoes.join(' | ')}\n\n` +
    `✅ Escolhido: *${escolhida}*`
  );
}

// =========================================
// 📝 CONTAR CARACTERES
// =========================================
export async function executeContar(ctx) {
  const { reply, q } = ctx;

  if (!q) {
    return reply('❌ Use: /contar <texto>\n\nExemplo: /contar Olá mundo!');
  }

  const caracteres = q.length;
  const semEspacos = q.replace(/\s/g, '').length;
  const palavras = q.trim().split(/\s+/).filter(p => p.length > 0).length;
  const linhas = q.split('\n').length;

  return reply(
    `📝 *CONTAGEM DE TEXTO*\n\n` +
    `🔤 Caracteres (com espaços): *${caracteres}*\n` +
    `🔡 Caracteres (sem espaços): *${semEspacos}*\n` +
    `📖 Palavras: *${palavras}*\n` +
    `📄 Linhas: *${linhas}*`
  );
}

// =========================================
// 🔃 INVERTER TEXTO
// =========================================
export async function executeInverter(ctx) {
  const { reply, q } = ctx;

  if (!q) {
    return reply('❌ Use: /inverter <texto>');
  }

  const invertido = q.split('').reverse().join('');

  return reply(
    `🔃 *TEXTO INVERTIDO*\n\n` +
    `📝 Original: ${q}\n` +
    `🔁 Invertido: *${invertido}*`
  );
}

// =========================================
// 🔠 MAIÚSCULO / MINÚSCULO
// =========================================
export async function executeMaiusculo(ctx) {
  const { reply, q } = ctx;
  if (!q) return reply('❌ Use: /maiusculo <texto>');
  return reply(`🔠 *MAIÚSCULO*\n\n${q.toUpperCase()}`);
}

export async function executeMinusculo(ctx) {
  const { reply, q } = ctx;
  if (!q) return reply('❌ Use: /minusculo <texto>');
  return reply(`🔡 *MINÚSCULO*\n\n${q.toLowerCase()}`);
}

// =========================================
// 📡 CÓDIGO MORSE
// =========================================
const MORSE_MAP = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
  '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
  '8': '---..', '9': '----.', ' ': '/'
};

export async function executeMorse(ctx) {
  const { reply, q } = ctx;
  if (!q) return reply('❌ Use: /morse <texto>');

  const morse = q.toUpperCase().split('').map(c => MORSE_MAP[c] || '').filter(c => c).join(' ');

  return reply(
    `📡 *CÓDIGO MORSE*\n\n` +
    `📝 Original: ${q}\n` +
    `📻 Morse: \`${morse}\``
  );
}

// =========================================
// 💻 BINÁRIO
// =========================================
export async function executeBinario(ctx) {
  const { reply, q } = ctx;
  if (!q) return reply('❌ Use: /binario <texto>');

  const binario = q.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');

  return reply(
    `💻 *CÓDIGO BINÁRIO*\n\n` +
    `📝 Original: ${q}\n` +
    `🔢 Binário: \`${binario}\``
  );
}

// =========================================
// 🔐 BASE64 (CODIFICAR / DECODIFICAR)
// =========================================
export async function executeBase64(ctx) {
  const { reply, args, q } = ctx;

  if (!q) {
    return reply('❌ Use: /base64 <encode/decode> <texto>\n\nExemplos:\n/base64 encode Olá mundo\n/base64 decode SGVsbG8=');
  }

  const partes = q.split(' ');
  const acao = partes[0].toLowerCase();
  const texto = partes.slice(1).join(' ');

  if (acao === 'encode') {
    const encoded = Buffer.from(texto, 'utf-8').toString('base64');
    return reply(`🔐 *BASE64 ENCODE*\n\n📝 Original: ${texto}\n🔒 Codificado: \`${encoded}\``);
  } else if (acao === 'decode') {
    try {
      const decoded = Buffer.from(texto, 'base64').toString('utf-8');
      return reply(`🔓 *BASE64 DECODE*\n\n🔒 Codificado: ${texto}\n📝 Decodificado: *${decoded}*`);
    } catch (e) {
      return reply('❌ Texto Base64 inválido!');
    }
  } else {
    return reply('❌ Use "encode" ou "decode". Ex: /base64 encode Olá');
  }
}

// =========================================
// ✅ VALIDAR CPF
// =========================================
export async function executeValidarCPF(ctx) {
  const { reply, q } = ctx;
  if (!q) return reply('❌ Use: /validarcpf 000.000.000-00');

  const cpf = q.replace(/\D/g, '');

  if (cpf.length !== 11) return reply('❌ CPF deve ter 11 dígitos!');
  if (/^(\d)\1{10}$/.test(cpf)) return reply('❌ CPF inválido!');

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return reply('❌ CPF inválido!');

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[10])) return reply('❌ CPF inválido!');

  return reply(
    `✅ *VALIDAR CPF*\n\n` +
    `📋 CPF: ${q}\n` +
    `✅ Status: *VÁLIDO*`
  );
}
// =========================================
// COMANDO: !quem <pergunta>
// =========================================
export async function executeQuem(ctx) {
  const { reply, isGroup, groupMetadata, q } = ctx;

  if (!isGroup) {
    return reply('❌ Este comando só pode ser usado em grupos.');
  }

  if (!q || q.trim().length === 0) {
    return reply(`❌ Use: !quem <pergunta>\n\n*Exemplo:* !quem vai pagar a conta?`);
  }

  if (!groupMetadata || !groupMetadata.participants) {
    return reply('❌ Não foi possível ler os membros do grupo.');
  }

  // Filtra para não escolher o próprio bot ou contas estranhas
  const membros = groupMetadata.participants.filter(p => p.id);
  
  if (membros.length === 0) {
    return reply('❌ Não há membros suficientes no grupo.');
  }

  // Sorteia um membro
  const aleatorio = membros[Math.floor(Math.random() * membros.length)];
  const jidAleatorio = aleatorio.id;
  
  // Cria a mensagem
  const pergunta = q.trim();
  const texto = `🤔 *QUEM ${pergunta.toUpperCase()}?*\n\n🔮 O escolhido(a) foi: @${jidAleatorio.split('@')[0]}!`;

  // Envia a mensagem mencionando a pessoa sorteada
  return reply(texto, { mentions: [jidAleatorio] });
}
