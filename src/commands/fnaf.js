import {
  iniciarPartida,
  avancarHora,
  togglePorta,
  usarLuz,
  pararPartida,
  getPartida,
  lerDB,
  salvarDB,
  ANIMATRONICOS,
  CAMERAS,
  CONFIG_ENERGIA,
  timersAtivos,
  tickTimersAtivos,
  cameraTimers
} from '../functions/fnaf.js';
import { isOwner, isAdmin } from '../functions/permissions.js';
import fs from 'node:fs';

function temPermissao(ctx) {
  const { sender, groupMetadata } = ctx;
  return isAdmin(sender, groupMetadata) || isOwner(sender);
}

// =========================================
// COMANDO: !modofnaf start
// =========================================
export async function executeFNAFStart(ctx) {
  const { client, reply, msg, isGroup, q } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');
  if (!temPermissao(ctx)) return reply('❌ Apenas administradores podem iniciar o jogo.');

  const grupoJid = msg.key.remoteJid;
  const arg = q.trim().toLowerCase();

  if (arg === 'parar' || arg === 'stop') {
    pararPartida(grupoJid);
    return reply('🛑 Partida encerrada.');
  }

  const existente = getPartida(grupoJid);
  if (existente && existente.ativo) {
    return reply('⚠️ Já existe uma partida em andamento neste grupo!');
  }

  iniciarPartida(grupoJid, 1);

  const texto = `🎮 *FNAF - FIVE NIGHTS AT FREDDY'S* 🎮\n\n` +
    `🌙 *Noite 1*\n` +
    `⏰ Hora: 12 AM\n` +
    `⚡ Energia: 100%\n\n` +
    `📋 *COMO JOGAR:*\n` +
    `• !vercamera <1-5> — Ver câmeras\n` +
    `• !fecharcamera — Fechar câmera\n` +
    `• !porta esquerda — Fechar/abrir porta ESQUERDA\n` +
    `• !porta direita — Fechar/abrir porta DIREITA\n` +
    `• !luz — Acender/apagar luz\n` +
    `• !statusfnaf — Status\n\n` +
    `⏰ Cada hora = *5 minutos reais*\n` +
    `⚡ Porta/Luz/Câmera gastam energia POR SEGUNDO!\n` +
    `💀 Se um animatrônico atacar, você tem *25s* para fechar AS DUAS portas!\n\n` +
    `💀 *Boa sorte!*`;

  await reply(texto);

  // =========================================
  // TIMER DE AVANÇO DE HORA (a cada 5 minutos)
  // =========================================
  if (timersAtivos[grupoJid]) clearInterval(timersAtivos[grupoJid]);

  timersAtivos[grupoJid] = setInterval(async () => {
    try {
      const resultado = avancarHora(grupoJid);
      if (!resultado) return;

      if (resultado.vitoria) {
        pararPartida(grupoJid);
        await client.sendMessage(grupoJid, {
          text: `🎉 *6 AM — SOBREVIVERAM!* 🎉\n\nNoite ${resultado.noite} concluída!`
        });
        return;
      }

      if (resultado.derrota) {
        pararPartida(grupoJid);
        await client.sendMessage(grupoJid, {
          text: `💀 *GAME OVER* — A energia acabou!`
        });
        return;
      }

      const partida = resultado.partida;
      await client.sendMessage(grupoJid, {
        text: `⏰ *${partida.hora} AM*\n\n` +
          `⚡ Energia: ${partida.energia.toFixed(0)}%\n` +
          `🚪 Portas: Esq ${partida.portas.esquerda ? '🔒' : '🔓'} | Dir ${partida.portas.direita ? '🔒' : '🔓'}\n` +
          `💡 Luz: ${partida.luz ? 'Acesa' : 'Apagada'}`
      });

      const chanceSpawn = 0.4 + (partida.noite * 0.05);
      if (!partida.ataqueAtivo && Math.random() < chanceSpawn) {
        await iniciarAtaque(client, grupoJid);
      }
    } catch (e) {
      console.error('[FNAF] Erro timer hora:', e.message);
    }
  }, 5 * 60 * 1000);

  // =========================================
  // TICK DE 1 SEGUNDO
  // =========================================
  if (tickTimersAtivos[grupoJid]) clearInterval(tickTimersAtivos[grupoJid]);

  tickTimersAtivos[grupoJid] = setInterval(async () => {
    try {
      const partida = getPartida(grupoJid);
      if (!partida || !partida.ativo) {
        clearInterval(tickTimersAtivos[grupoJid]);
        delete tickTimersAtivos[grupoJid];
        return;
      }

      let gasto = 0;
      if (partida.portas.esquerda) gasto += CONFIG_ENERGIA.PORTA_POR_SEGUNDO;
      if (partida.portas.direita) gasto += CONFIG_ENERGIA.PORTA_POR_SEGUNDO;
      if (partida.luz) gasto += CONFIG_ENERGIA.LUZ_POR_SEGUNDO;
      if (partida.cameraAberta) gasto += CONFIG_ENERGIA.CAMERA_POR_SEGUNDO;

      if (gasto > 0) {
        const db = lerDB();
        const p = db.partidas[grupoJid];
        if (p) {
          p.energia -= gasto;
          if (p.energia <= 0) {
            p.energia = 0;
            p.ativo = false;
            salvarDB(db);
            pararPartida(grupoJid);
            await client.sendMessage(grupoJid, {
              text: `💀 *GAME OVER* — A energia acabou!\n\nVocê deixou os equipamentos ligados por muito tempo.`
            });
            return;
          }
          salvarDB(db);
        }
      }

      // Countdown do ataque
      if (partida.ataqueAtivo && partida.ataqueCountdown > 0) {
        const db = lerDB();
        const p = db.partidas[grupoJid];
        if (!p) return;

        // Se as DUAS portas estão fechadas, defendeu
        if (p.portas.esquerda && p.portas.direita) {
          const atacante = p.animatronico;
          p.ataqueAtivo = false;
          p.ataqueCountdown = 0;
          p.animatronico = null;
          salvarDB(db);

          const anim = ANIMATRONICOS[atacante];
          await client.sendMessage(grupoJid, {
            text: `✅ *DEFENDIDO!* ${anim.emoji} *${anim.nome}* saiu da porta!\n\n` +
              `🚪 As portas foram fechadas a tempo.\n⚡ Energia: ${p.energia.toFixed(0)}%`
          });
          return;
        }

        p.ataqueCountdown -= 1;
        salvarDB(db);

        if (p.ataqueCountdown % 5 === 0 && p.ataqueCountdown > 0) {
          await client.sendMessage(grupoJid, {
            text: `⚠️ *ATENÇÃO!* Faltam *${p.ataqueCountdown}s* para fechar as duas portas!\n\n` +
              `🚪 Esq: ${p.portas.esquerda ? '🔒' : '🔓'} | Dir: ${p.portas.direita ? '🔒' : '🔓'}`
          });
        }

        if (p.ataqueCountdown <= 0) {
          const atacante = p.animatronico;
          p.ativo = false;
          salvarDB(db);
          pararPartida(grupoJid);

          const anim = ANIMATRONICOS[atacante];
          await client.sendMessage(grupoJid, {
            text: `💀 *GAME OVER* 💀\n\n` +
              `${anim.emoji} *${anim.nome}* te pegou!\n` +
              `⏰ Tempo esgotado — ninguém fechou as duas portas.`
          });
        }
      }
    } catch (e) {
      console.error('[FNAF] Erro tick:', e.message);
    }
  }, 1000);
}

// =========================================
// FUNÇÃO: INICIA UM ATAQUE
// =========================================
async function iniciarAtaque(client, grupoJid) {
  const db = lerDB();
  const partida = db.partidas[grupoJid];
  if (!partida || !partida.ativo) return;

  const lista = Object.keys(ANIMATRONICOS);
  const escolhido = lista[Math.floor(Math.random() * lista.length)];
  const anim = ANIMATRONICOS[escolhido];

  partida.animatronico = escolhido;
  partida.ataqueAtivo = true;
  partida.ataqueCountdown = CONFIG_ENERGIA.TEMPO_ATAQUE;
  salvarDB(db);

  const texto = `🚨 *ATAQUE!* 🚨\n\n` +
    `${anim.emoji} *${anim.nome}* está na sua porta!\n\n` +
    `⏰ Você tem *${CONFIG_ENERGIA.TEMPO_ATAQUE} segundos* para FECHAR AS DUAS PORTAS!\n\n` +
    `💡 Use: !porta esquerda e !porta direita`;

  try {
    if (fs.existsSync(anim.foto)) {
      await client.sendMessage(grupoJid, {
        image: fs.readFileSync(anim.foto),
        caption: texto
      });
    } else {
      await client.sendMessage(grupoJid, { text: texto });
    }
  } catch (e) {
    await client.sendMessage(grupoJid, { text: texto });
  }
}

// =========================================
// COMANDO: !vercamera <1-5>
// =========================================
export async function executeVerCamera(ctx) {
  const { reply, msg, q, isGroup } = ctx;

  if (!isGroup) return reply('❌ Este comando só funciona em grupos.');

  const grupoJid = msg.key.remoteJid;
  const partida = getPartida(grupoJid);

  if (!partida || !partida.ativo) {
    return reply('❌ Nenhuma partida ativa.');
  }

  const num = parseInt(q.trim());

  if (!num) {
    let texto = `📺 *CÂMERAS DISPONÍVEIS*\n\n`;
    for (const [id, cam] of Object.entries(CAMERAS)) {
      const ativa = partida.cameraAtual === parseInt(id) ? ' 🟢' : '';
      texto += `${cam.emoji} *${id}* — ${cam.nome}${ativa}\n`;
    }
    texto += `\n💡 Use: !vercamera <número>\n⚠️ Câmera gasta energia por segundo!`;
    return reply(texto);
  }

  if (!CAMERAS[num]) return reply('❌ Câmera inválida. Use 1 a 5.');

  const db = lerDB();
  const p = db.partidas[grupoJid];
  if (!p) return reply('❌ Partida não encontrada.');

  p.cameraAtual = num;
  p.cameraAberta = true;
  salvarDB(db);

  if (cameraTimers[grupoJid]) clearTimeout(cameraTimers[grupoJid]);
  cameraTimers[grupoJid] = setTimeout(() => {
    const db2 = lerDB();
    if (db2.partidas[grupoJid]) {
      db2.partidas[grupoJid].cameraAberta = false;
      salvarDB(db2);
    }
  }, 15 * 1000);

  const cam = CAMERAS[num];
  const animatronicoAqui = p.animatronico &&
    ANIMATRONICOS[p.animatronico]?.cameraInicial === num;

  let texto = `📺 *CÂMERA ${num} — ${cam.nome}* ${cam.emoji}\n_${cam.descricao}_\n\n`;

  if (animatronicoAqui) {
    const a = ANIMATRONICOS[p.animatronico];
    texto += `👀 *ATENÇÃO!* ${a.emoji} *${a.nome}* está aqui!\n`;
  } else {
    texto += `✅ Nenhum animatrônico detectado.\n`;
  }

  texto += `\n⚡ Energia: ${p.energia.toFixed(0)}%\n⏰ Hora: ${p.hora} AM\n` +
    `⚠️ Câmera fechará automaticamente em 15s`;

  return reply(texto);
}

// =========================================
// COMANDO: !fecharcamera
// =========================================
export async function executeFecharCamera(ctx) {
  const { reply, msg, isGroup } = ctx;

  if (!isGroup) return reply('❌ Só em grupos.');

  const grupoJid = msg.key.remoteJid;
  const partida = getPartida(grupoJid);

  if (!partida || !partida.ativo) return reply('❌ Nenhuma partida ativa.');

  const db = lerDB();
  db.partidas[grupoJid].cameraAberta = false;
  salvarDB(db);

  if (cameraTimers[grupoJid]) {
    clearTimeout(cameraTimers[grupoJid]);
    delete cameraTimers[grupoJid];
  }

  return reply('📺 Câmera fechada. Energia parou de ser consumida.');
}

// =========================================
// COMANDO: !porta <esquerda|direita>
// =========================================
export async function executePorta(ctx) {
  const { reply, msg, q, isGroup } = ctx;

  if (!isGroup) return reply('❌ Só em grupos.');

  const grupoJid = msg.key.remoteJid;
  const partida = getPartida(grupoJid);
  if (!partida || !partida.ativo) return reply('❌ Nenhuma partida ativa.');

  const arg = q.trim().toLowerCase();

  // Se não especificou, mostra o status
  if (!arg) {
    return reply(
      `🚪 *STATUS DAS PORTAS*\n\n` +
      `Esquerda: ${partida.portas.esquerda ? '🔒 FECHADA' : '🔓 ABERTA'}\n` +
      `Direita: ${partida.portas.direita ? '🔒 FECHADA' : '🔓 ABERTA'}\n\n` +
      `⚡ Energia: ${partida.energia.toFixed(0)}%\n\n` +
      `💡 Use:\n` +
      `• !porta esquerda\n` +
      `• !porta direita`
    );
  }

  // Verifica qual porta fechar
  let lado = null;
  if (arg === 'esquerda' || arg === 'e' || arg === 'esq' || arg === 'left') {
    lado = 'esquerda';
  } else if (arg === 'direita' || arg === 'd' || arg === 'dir' || arg === 'right') {
    lado = 'direita';
  } else {
    return reply('❌ Porta inválida. Use `esquerda` ou `direita`.');
  }

  const atualizado = togglePorta(grupoJid, lado);

  const nomePorta = lado === 'esquerda' ? 'ESQUERDA' : 'DIREITA';
  const status = atualizado.portas[lado] ? 'FECHADA 🔒' : 'ABERTA 🔓';

  return reply(
    `🚪 *PORTA ${nomePorta} ${status}*\n\n` +
    `⚡ Energia: ${atualizado.energia.toFixed(0)}%\n⏰ Hora: ${atualizado.hora} AM\n` +
    `⚠️ Cada segundo com a porta fechada gasta energia!`
  );
}

// =========================================
// COMANDO: !luz
// =========================================
export async function executeLuz(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');

  const grupoJid = msg.key.remoteJid;
  const partida = getPartida(grupoJid);
  if (!partida || !partida.ativo) return reply('❌ Nenhuma partida ativa.');

  const atualizado = usarLuz(grupoJid);

  return reply(
    `💡 *LUZ ${atualizado.luz ? 'ACESA' : 'APAGADA'}*\n\n` +
    `⚡ Energia: ${atualizado.energia.toFixed(0)}%\n⏰ Hora: ${atualizado.hora} AM\n` +
    `⚠️ Cada segundo com a luz acesa gasta energia!`
  );
}

// =========================================
// COMANDO: !statusfnaf
// =========================================
export async function executeStatusFNAF(ctx) {
  const { reply, msg, isGroup } = ctx;
  if (!isGroup) return reply('❌ Só em grupos.');

  const grupoJid = msg.key.remoteJid;
  const partida = getPartida(grupoJid);
  if (!partida || !partida.ativo) return reply('❌ Nenhuma partida ativa.');

  const anim = partida.animatronico ? ANIMATRONICOS[partida.animatronico] : null;

  const texto = `🎮 *STATUS FNAF*\n\n` +
    `🌙 Noite: ${partida.noite}\n` +
    `⏰ Hora: ${partida.hora} AM\n` +
    `⚡ Energia: ${partida.energia.toFixed(1)}%\n` +
    `🚪 Porta Esq: ${partida.portas.esquerda ? '🔒' : '🔓'}\n` +
    `🚪 Porta Dir: ${partida.portas.direita ? '🔒' : '🔓'}\n` +
    `💡 Luz: ${partida.luz ? 'Acesa' : 'Apagada'}\n` +
    `📺 Câmera: ${partida.cameraAberta ? `Aberta (${partida.cameraAtual})` : 'Fechada'}\n` +
    (partida.ataqueAtivo
      ? `\n🚨 *ATAQUE ATIVO!* ${anim ? `${anim.emoji} ${anim.nome}` : ''}\n` +
        `⏰ Fechar em *${partida.ataqueCountdown}s*!`
      : '');

  return reply(texto);
}
