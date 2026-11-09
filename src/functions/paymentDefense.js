import { delay } from '@whiskeysockets/baileys';

// --- DETECÇÃO DE PAGAMENTO ---
const PAYMENT_MESSAGE_KEYS = new Set([
  "paymentInviteMessage", "requestPaymentMessage", "sendPaymentMessage", 
  "cancelPaymentRequestMessage", "declinePaymentRequestMessage", "invoiceMessage",
]);

function canScanObject(value) {
  return value && typeof value === "object" && !(value instanceof ArrayBuffer) && !ArrayBuffer.isView(value);
}

function hasPaymentMessageKey(value, depth = 0, seenObjects = new WeakSet()) {
  if (!canScanObject(value) || depth > 8 || seenObjects.has(value)) return false;
  seenObjects.add(value);

  for (const [key, childValue] of Object.entries(value)) {
    if (key === "quotedMessage") continue;
    if (PAYMENT_MESSAGE_KEYS.has(key) && canScanObject(childValue)) return true;
    if (hasPaymentMessageKey(childValue, depth + 1, seenObjects)) return true;
  }
  return false;
}

export function hasPaymentMessage(webMessage) {
  return hasPaymentMessageKey(webMessage?.message);
}

// --- EXCLUSÃO ESPECIAL DE PAGAMENTO ---
export async function deletePaymentMessageWithFallback({ socket, remoteJid, messageKey, settleMs = 400 }) {
  const id = messageKey?.id;
  const participant = messageKey?.participant;

  if (!id || !participant) return;

  try {
    const dummyMessage = await socket.sendMessage(remoteJid, { text: "​" });
    const dummyMessageId = dummyMessage?.key?.id;

    if (!dummyMessageId) throw new Error("Falha ao gerar ID auxiliar");

    await socket.sendMessage(remoteJid, {
      text: `🚫 *Mensagem de pagamento removida por segurança.*`,
      edit: { remoteJid, fromMe: true, id: dummyMessageId },
    }, { messageId: id });

    await delay(settleMs);

    await socket.sendMessage(remoteJid, {
      delete: { remoteJid, id, fromMe: false, participant },
    });

    await delay(settleMs);

    try {
      await socket.sendMessage(remoteJid, {
        delete: { remoteJid, id: dummyMessageId, fromMe: true },
      });
    } catch (e) {}
  } catch (error) {
    // Fallback para delete normal se o especial falhar
    await socket.sendMessage(remoteJid, {
      delete: {
        remoteJid: messageKey?.remoteJid || remoteJid,
        fromMe: messageKey?.fromMe ?? false,
        id: messageKey?.id,
        participant: messageKey?.participant,
      },
    });
  }
}

// --- ESTADO DE DEFESA (Evita fechar/abrir o grupo várias vezes) ---
const RECENT_PARTICIPANT_TTL_MS = 60 * 1000;
const DEFAULT_GROUP_INCIDENT_TTL_MS = 8 * 1000;
let groupIncidentTtlMs = DEFAULT_GROUP_INCIDENT_TTL_MS;

const recentlyHandled = new Map(); 
const inFlight = new Map(); 
const groupIncidents = new Map(); 

function participantKey(remoteJid, userLid) {
  return `${remoteJid}:${userLid}`;
}

function ensureGroupIncident(socket, remoteJid) {
  const existing = groupIncidents.get(remoteJid);
  if (existing) return existing;

  const incident = { groupClosed: false, reopenTimer: undefined };

  incident.closePromise = (async () => {
    try {
      await socket.groupSettingUpdate(remoteJid, "announcement"); // Fecha
      incident.groupClosed = true;
      // Avisa no grupo (substituindo o sendCleanChat original)
      await socket.sendMessage(remoteJid, { text: "🚨 *ANTI-PAYMENT ATIVADO*\nO grupo foi fechado temporariamente por segurança devido a tentativas de golpe." });
    } catch (e) {}
  })();

  groupIncidents.set(remoteJid, incident);
  return incident;
}

function scheduleGroupReopen(socket, remoteJid) {
  const incident = groupIncidents.get(remoteJid);
  if (!incident || !incident.groupClosed) return;

  if (incident.reopenTimer) clearTimeout(incident.reopenTimer);

  incident.reopenTimer = setTimeout(() => {
    socket.groupSettingUpdate(remoteJid, "not_announcement").catch(() => {}).finally(() => {
        if (groupIncidents.get(remoteJid) === incident) {
          groupIncidents.delete(remoteJid);
        }
      });
  }, groupIncidentTtlMs);

  incident.reopenTimer.unref?.();
}

async function runDefense({ socket, remoteJid, userLid, messageKey }) {
  const incident = ensureGroupIncident(socket, remoteJid);
  let removed = false;

  await Promise.all([
    incident.closePromise,
    socket.groupParticipantsUpdate(remoteJid, [userLid], "remove")
      .then(() => { removed = true; })
      .catch(() => {}),
    messageKey ? deletePaymentMessageWithFallback({ socket, remoteJid, messageKey }) : Promise.resolve(),
  ]);

  scheduleGroupReopen(socket, remoteJid);

  if (removed) {
    recentlyHandled.set(participantKey(remoteJid, userLid), Date.now() + RECENT_PARTICIPANT_TTL_MS);
  }

  return removed;
}

export function defendAgainstPayment({ socket, remoteJid, userLid, messageKey }) {
  if (!remoteJid || !userLid) return Promise.resolve(false);

  const key = participantKey(remoteJid, userLid);
  const expiresAt = recentlyHandled.get(key);
  if (expiresAt && expiresAt > Date.now()) return Promise.resolve(true);

  const existing = inFlight.get(key);
  if (existing) return existing;

  const defense = Promise.resolve().then(() => runDefense({ socket, remoteJid, userLid, messageKey }));
  inFlight.set(key, defense);

  return defense.finally(() => { inFlight.delete(key); });
                           }
