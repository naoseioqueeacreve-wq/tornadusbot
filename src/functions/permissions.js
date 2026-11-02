import { OWNER_NUMBER } from '../config.js';

// Extrai apenas os dígitos
function extrairNumero(jid) {
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0];
}

// 🔍 Pega o número real do remetente (ignora o LID)
export function getRealSender(msg) {
  if (!msg || !msg.key) return '';
  
  // ✅ PRIORIDADE 1: participantAlt (número real quando vem LID)
  if (msg.key.participantAlt) {
    return msg.key.participantAlt;
  }
  
  // PRIORIDADE 2: participantPn (nome alternativo em algumas versões)
  if (msg.key.participantPn) {
    return msg.key.participantPn;
  }
  
  // PRIORIDADE 3: participant (funciona em grupos antigos)
  if (msg.key.participant) {
    return msg.key.participant;
  }
  
  // PRIORIDADE 4: remoteJid (conversas privadas)
  if (msg.key.remoteJid) {
    return msg.key.remoteJid;
  }
  
  return '';
}

// Verifica se é o dono
export function isOwner(sender) {
  if (!sender) return false;
  
  const senderNumber = extrairNumero(sender);
  const ownerNumber = String(OWNER_NUMBER).replace(/\D/g, '');
  const resultado = senderNumber === ownerNumber;
  
  console.log(`[PERMISSAO] Sender: "${senderNumber}" | Owner: "${ownerNumber}" | É dono? ${resultado ? 'SIM ✅' : 'NÃO ❌'}`);
  
  return resultado;
}

// Verifica se é admin do grupo
export function isAdmin(sender, groupMetadata) {
  if (!groupMetadata || !groupMetadata.participants) return false;
  
  const senderNumber = extrairNumero(sender);
  
  // Para admins, precisamos verificar tanto o participant quanto o participantAlt
  const participante = groupMetadata.participants.find(p => {
    const pId = extrairNumero(p.id);
    const pAlt = p.participantAlt ? extrairNumero(p.participantAlt) : '';
    return pId === senderNumber || pAlt === senderNumber;
  });
  
  if (!participante) return false;
  return participante.admin === 'admin' || participante.admin === 'superadmin';
}
