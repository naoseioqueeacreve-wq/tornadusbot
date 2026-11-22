import { PREFIX, FREELLM_API_KEY, FREELLM_BASE_URL } from '../config.js';
import { isOwner } from '../functions/permissions.js';

export async function executeGerarComando(ctx) {
  const { client, msg, sender, q, reply } = ctx;

  // 1. Verifica se é o dono
  if (!isOwner(sender)) {
    return reply('❌ Apenas o dono do bot pode usar este comando.');
  }

  // 2. Verifica se a descrição foi enviada
  if (!q || !q.trim()) {
    return reply(`❌ Use: ${PREFIX}gerar_comando <descrição do comando>\nExemplo: ${PREFIX}gerar_comando criar um comando que envia bom dia todos os dias às 8h`);
  }

  await reply('⏳ *Gerando código...* Isso pode levar alguns segundos.');

  try {
    // 3. Monta o prompt para a IA
    const prompt = `Você é um assistente especializado em criar comandos para um bot de WhatsApp baseado na biblioteca Baileys.
O bot usa módulos ES (import/export) e a estrutura de pastas é a seguinte:
- src/index.js (arquivo principal que gerencia os comandos)
- src/commands/ (pasta onde ficam os comandos)
- src/functions/ (pasta com funções auxiliares)

O usuário quer criar o seguinte comando:
"${q}"

Por favor, gere o código completo do comando seguindo o padrão do bot. O código deve ser um arquivo .js que exporta uma função assíncrona (ex: \`export async function executeNomeDoComando(ctx) { ... }\`). O \`ctx\` contém: client, msg, sender, pushName, isGroup, groupMetadata, q, args, reply.

Retorne APENAS o código do arquivo, sem explicações adicionais, sem markdown, sem blocos de código. Apenas o texto puro do código.`;

    // 4. Chama a API do FreeLLMAPI (endpoint compatível com OpenAI)
    const response = await fetch(`${FREELLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FREELLM_API_KEY}`
      },
      body: JSON.stringify({
        model: 'auto', // ou 'auto:smart', 'auto:fast', etc.
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    const codigoGerado = data.choices?.[0]?.message?.content?.trim();

    if (!codigoGerado) {
      throw new Error('A IA não retornou nenhum código.');
    }

    // 5. Envia o código gerado de volta para o dono
    await reply(`✅ *CÓDIGO GERADO:*\n\n\`\`\`javascript\n${codigoGerado}\n\`\`\`\n\n💡 Copie o código acima e crie o arquivo correspondente na pasta \`src/commands/\`.`);

  } catch (error) {
    console.error('[GERAR_COMANDO] Erro:', error);
    await reply(`❌ Ocorreu um erro ao gerar o comando:\n\n\`${error.message}\``);
  }
}
