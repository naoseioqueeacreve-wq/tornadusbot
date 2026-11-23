import { PREFIX, FREELLM_API_KEY, FREELLM_BASE_URL } from '../config.js';
import { isOwner } from '../functions/permissions.js';
// Importando o sistema de botões (cópia)
import { enviarBotoes, botaoCopiar } from '../functions/botoes.js';

// Função auxiliar para limpar as crases e a palavra "javascript" que a IA insere
function limparCodigo(str) {
  if (!str || str === 'null') return str;
  return str
    .replace(/^javascript\s*/i, '') 
    .replace(/^```[a-z]*\s*/i, '') 
    .replace(/```$/i, '') 
    .trim();
}

export async function executeGerarComando(ctx) {
  const { client, msg, sender, q, reply } = ctx;

  if (!isOwner(sender)) {
    return reply('❌ Apenas o dono do bot pode usar este comando.');
  }

  if (!q || !q.trim()) {
    return reply(`❌ Use: ${PREFIX}gerar_comando <descrição do comando>\nExemplo: ${PREFIX}gerar_comando criar um comando que envia bom dia todos os dias às 8h`);
  }

  await reply('⏳ *Gerando código e instruções...* Isso pode levar alguns segundos.');

  try {
    const prompt = `Você é um assistente especializado em criar comandos para um bot de WhatsApp baseado na biblioteca Baileys.
O bot usa módulos ES (import/export).
O usuário quer criar o seguinte comando:
"${q}"

Sua tarefa é gerar o código e as instruções de integração. Responda ESTRITAMENTE em formato JSON, sem formatação markdown (sem \`\`\`json), contendo EXATAMENTE estas chaves:

{
  "comando": "Código completo do arquivo a ser criado em src/commands/. Deve exportar uma função assíncrona. O ctx contém: client, msg, sender, pushName, isGroup, groupMetadata, q, args, reply. NÃO inclua a palavra 'javascript' ou crases na resposta.",
  "funcao": "Código de alguma função auxiliar que precise ser criada em src/functions/. Se não precisar, retorne null. NÃO inclua a palavra 'javascript' ou crases na resposta.",
  "index_import": "A linha exata do import para colocar no topo do src/index.js (ex: import { executeNovoComando } from './commands/novoComando.js';). NÃO inclua a palavra 'javascript' ou crases.",
  "index_case": "O bloco case exato para colocar no switch(command) do src/index.js (ex: case 'novoComando': await executeNovoComando(ctx); break;). NÃO inclua a palavra 'javascript' ou crases."
}

Lembre-se: Retorne APENAS o JSON puro, sem texto antes ou depois.`;

    const response = await fetch(`${FREELLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FREELLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    let textoResposta = data.choices?.[0]?.message?.content?.trim();

    if (!textoResposta) throw new Error('A IA não retornou nenhuma resposta.');

    textoResposta = textoResposta.replace(/```json/g, '').replace(/```/g, '').trim();

    let resultado;
    try {
      resultado = JSON.parse(textoResposta);
    } catch (e) {
      console.error('[GERAR_COMANDO] Falha ao converter JSON:', textoResposta);
      throw new Error('A IA não formatou a resposta corretamente em JSON. Tente novamente.');
    }

    const cmdLimpo = limparCodigo(resultado.comando);
    const funcLimpa = limparCodigo(resultado.funcao);
    const importLimpo = limparCodigo(resultado.index_import);
    const caseLimpo = limparCodigo(resultado.index_case);

    // =========================================
    // 1. ENVIO DO COMANDO (COM BOTÃO COPIAR)
    // =========================================
    const botoesCmd = [ botaoCopiar('📋 Copiar Código', cmdLimpo) ];
    try {
      await enviarBotoes(client, msg.key.remoteJid, {
        titulo: '✅ Código do Comando',
        corpo: `Aqui está o código para criar o arquivo em \`src/commands/\`:\n\n${cmdLimpo}`,
        rodape: '© Pikachu Bot',
        botoes: botoesCmd
      }, msg);
    } catch (e) {
      // Se falhar o botão, envia texto normal
      await reply(`✅ *CÓDIGO DO COMANDO:*\n\n${cmdLimpo || 'Não gerado'}\n\n💡 Crie o arquivo em \`src/commands/\``);
    }

    // =========================================
    // 2. ENVIO DA FUNÇÃO AUXILIAR (SE EXISTIR)
    // =========================================
    if (funcLimpa && funcLimpa !== 'null') {
      const botoesFunc = [ botaoCopiar('📋 Copiar Código', funcLimpa) ];
      try {
        await enviarBotoes(client, msg.key.remoteJid, {
          titulo: '🧩 Código da Função Auxiliar',
          corpo: `Aqui está o código para criar o arquivo em \`src/functions/\`:\n\n${funcLimpa}`,
          rodape: '© Pikachu Bot',
          botoes: botoesFunc
        }, msg);
      } catch (e) {
        await client.sendMessage(msg.key.remoteJid, {
          text: `🧩 *CÓDIGO DA FUNÇÃO AUXILIAR:*\n\n${funcLimpa}\n\n💡 Crie o arquivo em \`src/functions/\``
        }, { quoted: msg });
      }
    }

    // =========================================
    // 3. ENVIO DAS INSTRUÇÕES DO INDEX (COM BOTÃO COPIAR)
    // =========================================
    const textoIndex = `*1. Adicione no topo (junto com os outros imports):*\n${importLimpo}\n\n*2. Adicione dentro do switch(command):*\n${caseLimpo}`;
    const codigoParaCopiarIndex = `// IMPORT\n${importLimpo}\n\n// CASE\n${caseLimpo}`;
    
    const botoesIndex = [ botaoCopiar('📋 Copiar Instruções', codigoParaCopiarIndex) ];
    try {
      await enviarBotoes(client, msg.key.remoteJid, {
        titulo: '⚙️ Instruções para o index.js',
        corpo: textoIndex,
        rodape: '© Pikachu Bot',
        botoes: botoesIndex
      }, msg);
    } catch (e) {
      await client.sendMessage(msg.key.remoteJid, {
        text: `⚙️ *INSTRUÇÕES PARA O INDEX.JS:*\n\n${textoIndex}`
      }, { quoted: msg });
    }

  } catch (error) {
    console.error('[GERAR_COMANDO] Erro:', error);
    await reply(`❌ Ocorreu um erro ao gerar o comando:\n\n\`${error.message}\``);
  }
}
