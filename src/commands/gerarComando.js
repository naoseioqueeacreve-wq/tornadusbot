import { PREFIX, FREELLM_API_KEY, FREELLM_BASE_URL } from '../config.js';
import { isOwner } from '../functions/permissions.js';

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
  "comando": "Código completo do arquivo a ser criado em src/commands/. Deve exportar uma função assíncrona. O ctx contém: client, msg, sender, pushName, isGroup, groupMetadata, q, args, reply.",
  "funcao": "Código de alguma função auxiliar que precise ser criada em src/functions/. Se não precisar, retorne null.",
  "index_import": "A linha exata do import para colocar no topo do src/index.js (ex: import { executeNovoComando } from './commands/novoComando.js';)",
  "index_case": "O bloco case exato para colocar no switch(command) do src/index.js (ex: case 'novoComando': await executeNovoComando(ctx); break;)"
}

Lembre-se: Retorne APENAS o JSON, sem texto antes ou depois.`;

    const response = await fetch(`${FREELLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FREELLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Temperatura baixa para ser mais preciso e obedecer o JSON
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

    // Limpa possíveis marcações markdown que a IA possa ter colocado
    textoResposta = textoResposta.replace(/```json/g, '').replace(/```/g, '').trim();

    let resultado;
    try {
      resultado = JSON.parse(textoResposta);
    } catch (e) {
      console.error('[GERAR_COMANDO] Falha ao converter JSON:', textoResposta);
      throw new Error('A IA não formatou a resposta corretamente em JSON. Tente novamente.');
    }

    // 1. Envia o código do Comando
    await reply(`✅ *CÓDIGO DO COMANDO:*\n\n\`\`\`javascript\n${resultado.comando || 'Não gerado'}\n\`\`\`\n\n💡 Crie o arquivo em \`src/commands/\``);

    // 2. Envia a Função Auxiliar (se existir)
    if (resultado.funcao && resultado.funcao !== 'null') {
      await client.sendMessage(msg.key.remoteJid, {
        text: `🧩 *CÓDIGO DA FUNÇÃO AUXILIAR:*\n\n\`\`\`javascript\n${resultado.funcao}\n\`\`\`\n\n💡 Crie o arquivo em \`src/functions/\``
      }, { quoted: msg });
    }

    // 3. Envia as instruções do Index.js
    await client.sendMessage(msg.key.remoteJid, {
      text: `⚙️ *INSTRUÇÕES PARA O INDEX.JS:*\n\n` +
            `*1. Adicione no topo (junto com os outros imports):*\n` +
            `\`\`\`javascript\n${resultado.index_import || 'Não gerado'}\n\`\`\`\n\n` +
            `*2. Adicione dentro do switch(command):*\n` +
            `\`\`\`javascript\n${resultado.index_case || 'Não gerado'}\n\`\`\``
    }, { quoted: msg });

  } catch (error) {
    console.error('[GERAR_COMANDO] Erro:', error);
    await reply(`❌ Ocorreu um erro ao gerar o comando:\n\n\`${error.message}\``);
  }
}
