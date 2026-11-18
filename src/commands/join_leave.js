import { PREFIX } from '../config.js'; // 👈 Adicionado esta linha

export async function executeEntrarGrupo(ctx) {
  const { client, q, reply } = ctx;
  
  if (!q) {
    return reply(`❌ Você precisa fornecer o link do grupo.\n\n💡 Exemplo: ${PREFIX}entrar https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv`);
  }

  // Expressão regular para extrair o código do link do WhatsApp
  const match = q.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]{20,24})/);
  
  if (!match) {
    return reply('❌ Link inválido. Certifique-se de que copiou o link completo do grupo do WhatsApp.');
  }

  const inviteCode = match[1];

  try {
    await reply('⏳ Tentando entrar no grupo, aguarde...');
    await client.groupAcceptInvite(inviteCode);
    await reply('✅ *Sucesso!* Entrei no grupo.');
  } catch (error) {
    console.error('[ENTRAR] Erro ao entrar no grupo:', error);
    let motivo = error.message || 'Erro desconhecido';
    
    // Traduzindo alguns erros comuns do WhatsApp
    if (motivo.includes('not-authorized')) motivo = 'O link expirou ou foi revogado.';
    if (motivo.includes('conflict')) motivo = 'O bot já está neste grupo.';
    if (motivo.includes('forbidden')) motivo = 'O grupo está cheio ou você não tem permissão.';
    
    await reply(`❌ Não consegui entrar no grupo.\n\n📝 *Motivo:* ${motivo}`);
  }
}

export async function executeSairGrupo(ctx) {
  const { client, jid, isGroup, reply } = ctx;

  if (!isGroup) {
    return reply('❌ Este comando só pode ser usado dentro de um grupo.');
  }

  try {
    await reply('👋 Até logo! Estou saindo do grupo...');
    await client.groupLeave(jid);
  } catch (error) {
    console.error('[SAIR] Erro ao sair do grupo:', error);
    await reply(`❌ Não consegui sair do grupo. Motivo: ${error.message}`);
  }
}
