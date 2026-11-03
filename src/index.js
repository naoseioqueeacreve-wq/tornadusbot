import fs from 'node:fs';
import { areJidsSameUser } from '@whiskeysockets/baileys'; // <-- IMPORT ADICIONADO
import { PREFIX, BOT_NAME, GRUPO_SUPORTE, GEMINI_API_KEY } from './config.js';
import { getText, createReply } from './functions/helpers.js';
import { isOwner, isAdmin, getRealSender } from './functions/permissions.js';
import { temAluguelAtivo, getAluguelGlobal } from './functions/aluguel.js';
import { registrarGrupo } from './functions/pokemonSpawn.js';
import { lerConfig as lerAntiFlood } from './functions/antiflood.js';
import { verificarBonusDiario, incrementarMensagem, incrementarComando, incrementarFigurinha } from './functions/rpg.js';
import { getFotoComando, getCanal } from './functions/configGlobal.js';
import { getModoParceria, temParceriaAtiva, usarParceria } from './functions/parceria.js';
import { getGrupo, estaMutado } from './functions/adminDB.js';
import { adicionarXP } from './functions/extrasDB.js';
import { logMensagem, logEvento, logErro } from './functions/logger.js';
import { estaEmHorarioOff } from './functions/horarioOff.js';
import { estaAtiva, registrarLeitura } from './functions/autoLeitura.js';
import { isAntiPVAtivo } from './functions/antipv.js';
import { getModoIAGrupo } from './functions/iaGrupoDB.js';
import { isVIP, isVIPCommand } from './functions/vipDB.js';

// =========================================
// IMPORTS DE COMANDOS
// =========================================
import { executeMenu, executeMenuAdmin, executeMenuRPG, executeMenuBaixar, executeMenuMembros, executeMenuReligioso, executeMenuCatolico, executeMenuVIP, executeMenuPokemon } from './commands/menu.js';
import { executeMenuGame, executeDaily } from './commands/game.js';
import { executeMenuOwner, executeSay, executeReiniciar, executeBotOff, executeBotOn, executeNickDono, executeFotoMenu, executeAddCoins, executeRmCoins, executeSetRecado, isBotRestrito } from './commands/owner.js';
import { executeDefinirCmdFoto, executeRmCmdFoto, executeChannel, executeRmChannel } from './commands/owner_extras.js';
import { executeModoParceria, executeAddParceria, executeDelParceria, executeListaParceria, executeBan, executeSetFotoGP, executeSetNomeGP } from './commands/adm.js';
import { executeAntiPalavrao, executeAddPalavra, executeDelPalavra, executeListaPalavras, executeBemVindo, executeSetLegenda, executeSetFotoBV, executeAbrir, executeFechar, executeChamarAdmins, executeMute, executeDesmute, executeSorteio, executeBotAdm, executeAntiFake, executeAdvertir, executeRemoverWarn, executeLimparWarns, executeVerWarns, executeListarWarns, executeAntiBot } from './commands/admin_extras.js';
import { executePlayVideo, executePinterest, executeAnimal, executePlaylistSpotify } from './commands/pesquisas.js';
import { executeYtmp3, executeYtmp4, executeSnapchat, executeGdrive, executeReddit } from './commands/baixar.js';
import { executeSticker, executeTake, executeBrat, executeBratVerde, executeBratVideo } from './commands/stickers.js';
import { executeIA, executeIAModo, executeIALimpar, estaNoModoIA, responderAutomatico } from './commands/ia.js';
import { executeVelha, executeJogarVelha, executePararVelha, executeQuebraCabeca, executeResponder, executePararQuebra, executeVDD, executeVDDResponder, executeEuNunca, executeVotarEuNunca, executeForca, executeForcaIndividual, executeLetra, executePararForca, executeQuizAnimal, executeResponderQuiz, executePararQuiz, executeAbracar, executeBeijar, executeElogiar, executeShip } from './commands/jogos.js';
import { executePPT, executeAdivinha, executeChutar, executeRoletaRussa, executeBlackjack, executePalavra, executeDesembaralhar, executeAnagrama, executeRespAnagrama, executeMatematica, executeRespMatematica, executeBandeira, executeRespBandeira, executeMemoria, executeRespMemoria, executeStop, executeRespStop } from './commands/jogos2.js';
import { executeId, executeInfo, executeUptime, executeConvite, executeMeusDados, executeDado, executeMoeda, executeSorte, executeSimOuNao, executePiada, executeCuriosidade } from './commands/utilidades.js';
import { executeRaspadinha, executeCassino, executeDuelo, executePresentear, executeTop, executeTopMoney, executeCalc, executeClima, executeSigla, executeGay, executeCorno, executeBeijo } from './commands/novos.js';
import { executeFNAFStart, executeVerCamera, executeFecharCamera, executePorta, executeLuz, executeStatusFNAF } from './commands/fnaf.js';
import { executeFazendas, executeComprarFazenda, executeMinhaFazenda, executeLojaAnimais, executeComprarAnimal, executeMelhorias, executeComprarMelhoria, executeColetar } from './commands/fazenda.js';
import { executeCidade, executeCriarCidade, executeConstruir, executeColetarImpostos, executeRankingCidade, executeDemolir, executeMelhorarEstrutura, executeProposta, executeAceitarProposta, executeRecusarProposta } from './commands/cidade.js';
import { executePescar, executeAquario, executeVenderPeixes, executeComprarIscas, executeCriarCla, executeEntrarCla, executeSairCla, executeMeuCla, executeRankingClas, executeCasar, executeDivorciar, executeMeuCasamento } from './commands/rpgExtras.js';
import { executeMeuNivel, executeLojaPocoes, executeComprarPocao, executeMeusBuffs, executeEmprestimo, executePagarEmprestimo } from './commands/extras.js';
import { executeAluguelGlobal, executeAluguel, executeRgAluguel, executeRmAluguel, executeRnAluguel } from './commands/aluguel.js';
import { executeListarAlugueis, executeLimparAlugueis } from './commands/aluguel_debug.js';
import { executePlay } from './commands/play.js';

// IMPORTS POKÉMON
import { executePokemon, executeMeusPokemons, executeTrocar, executeAlimentar, executeBatalhaPokemon, executeAtaque, executeLojaPokemon, executeLojaPokebola, executeComprar, executeCapturar, executeAtivarSpawn, executeDesativarSpawn } from './commands/pokemon.js';
import { forcarSpawn } from './functions/pokemonSpawn.js';

import { executeSetDelay, executeSetLimite, executeAntiFlood } from './commands/antiflood_cmd.js';
import { executePerfil as executePerfilRPG, executeApostar, executeInvestir, executeRoubar, executePix, executeBanco, executeTrabalhar, executeEmpregos, executeAdotar, executePets, executeTrocarPet, executeBatalhaPet, executeComprarCasa, executeCasas } from './commands/rpg.js';
import { executePerfilGlobal } from './commands/perfil.js';
import { executeData, executeHora, executeIdade, executeIMC, executePorcentagem, executeRegra3, executeJuros, executeSenha, executeSortear, executeEscolher, executeContar, executeInverter, executeMaiusculo, executeMinusculo, executeMorse, executeBinario, executeBase64, executeValidarCPF, executeQuem } from './commands/membros.js';
import { executeHorarioOff } from './commands/horarioOff_cmd.js';
import { executeAutoLeitura } from './commands/autoLeitura_cmd.js';
import { executeAntiPV } from './commands/antipv_cmd.js';
import { executeModoIAGrupo } from './commands/iaGrupo_cmd.js';
import { executeAddVIP, executeAddCmdVIP, executeRmCmdVIP } from './commands/vip_cmd.js';
import { executeVipInfo, executeVipSenha, executeVipQR, executeVipCifrar, executeVipDecifrar, executeVipEmoji } from './commands/vip_funcs.js';
import { executeReligiao } from './commands/religiao_cmd.js';
import { executePapa } from './commands/papas.js';
import { executeSantuario } from './commands/santuario.js';
import { executeBispo } from './commands/bispo.js';
import { executePadre } from './commands/padre.js';
import { executeSantoDoDia } from './commands/santododia.js';
import { executeDNA } from './commands/dna.js';
import { executeAkinator, executeRespAkinator, executeTopAkinator } from './commands/akinator.js';
import { executeAntiCall } from './commands/anticall.js';
import { executeAntiLink } from './commands/antilink.js';
import { executeAfk, executeAfkLista } from './commands/afk.js';
import { getAFK, removeAFK, formatarTempoAFK } from './functions/afkDB.js';
import { executeAntiSpam, executeAntiMidia, executeListaNegra, verificarProtecoes } from './commands/protecao.js';
import { executeAutoFechar, executeAtividade, executeInativos, executeRmInativos, executeSetRegras, executeRegras, executeDelRegras } from './commands/gestao.js';
import { executeDespedida, executeSetDespedida, executeAddFiltro, executeDelFiltro, executeFiltros, executeAntiMarcacao, verificarAutomacoes } from './commands/automacao.js';
import { executePromover, executeRebaixar, executeApagar, executeTodos, executeHidetag } from './commands/cargos.js';

// =========================================
// ANTI-FLOOD
// =========================================
const historicoComandos = {};
const avisosEnviados = {};

function podeUsarComando(sender, ehDono) {
  if (ehDono) return { permitido: true };
  const config = lerAntiFlood();
  if (!config.ativo) return { permitido: true };
  const agora = Date.now();
  const janela = config.janela * 1000;
  if (!historicoComandos[sender]) historicoComandos[sender] = [];
  historicoComandos[sender] = historicoComandos[sender].filter(t => agora - t < janela);
  if (historicoComandos[sender].length >= config.limite) {
    const tempoRestante = Math.ceil((janela - (agora - historicoComandos[sender][0])) / 1000);
    return { permitido: false, tempoRestante, config };
  }
  historicoComandos[sender].push(agora);
  return { permitido: true, config };
}

async function delayResposta(ehDono) {
  if (ehDono) return;
  const config = lerAntiFlood();
  if (!config.ativo) return;
  await new Promise(resolve => setTimeout(resolve, config.delay * 1000));
}

function getTipoMensagem(msg) {
  const m = msg.message;
  if (!m) return null;
  if (m.conversation || m.extendedTextMessage) return 'text';
  if (m.stickerMessage) return 'sticker';
  if (m.imageMessage) return 'image';
  if (m.videoMessage) return 'video';
  if (m.audioMessage) return 'audio';
  if (m.documentMessage) return 'document';
  return 'other';
}

async function chamarGemini(prompt, systemInstruction = '') {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return null;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { return null; }
}

// =========================================
// FUNÇÃO PRINCIPAL
// =========================================
export async function handleMessage(client, msg) {
  let body = getText(msg).trim();
  let bodyLower = body.toLowerCase();

  const jid = msg.key.remoteJid;
  const sender = getRealSender(msg);
  const pushName = msg.pushName || 'Usuário';
  const isGroup = jid.endsWith('@g.us');

  // =========================================
  // 🚨 LÓGICA DO ANTIBOT (ADAPTADA) 🚨
  // =========================================
  if (isGroup) {
    const configGP = getGrupo(jid);
    if (configGP.antiBot) {
      // 1. Verifica se a mensagem é de um bot (ID do Baileys)
      const isBotMessage = msg.key.id.startsWith('BAE5') || msg.key.id.startsWith('3EB0');
      
      // 2. Verifica se o JID de quem enviou NÃO é o próprio bot
      // areJidsSameUser compara o JID do remetente com o JID do seu bot
      const isNotMe = !areJidsSameUser(sender, client.user.id);

      if (isBotMessage && isNotMe) {
        try {
          // Tenta remover o bot do grupo
          await client.groupParticipantsUpdate(jid, [sender], 'remove');
          await client.sendMessage(jid, { text: `🤖🚫 *ANTIBOT*\n\nUm bot foi detectado e removido automaticamente.` });
        } catch (e) {
          console.log('Erro ao tentar banir bot:', e.message);
        }
        return; // Para de processar a mensagem
      }
    }
  }
  // =========================================

  if (!isGroup && isAntiPVAtivo()) {
    const ehDono = isOwner(sender);
    if (!ehDono) {
      try {
        await client.sendMessage(jid, { text: '🚫 *ANTI-PV ATIVADO*\n\nVocê foi bloqueado.' });
        await client.updateBlockStatus(sender, 'block');
      } catch (e) {}
      return;
    }
  }

  const tipoMsgAFK = getTipoMensagem(msg);
  const tiposQueRemovemAFK = ['text', 'sticker', 'image'];
  const ehCmdAfk = bodyLower === `${PREFIX}afk` || bodyLower.startsWith(`${PREFIX}afk `) || bodyLower === `${PREFIX}afklista`;

  if (!ehCmdAfk && tiposQueRemovemAFK.includes(tipoMsgAFK)) {
    const afkAnterior = getAFK(sender);
    if (afkAnterior) {
      removeAFK(sender);
      const tempo = formatarTempoAFK(afkAnterior.timestamp);
      try { await client.sendMessage(jid, { text: `👋 *BEM-VINDO(A) DE VOLTA!*\n\n@${sender.split('@')[0].split(':')[0]} voltou!\n⏱️ Ficou ausente por: *${tempo}*`, mentions: [sender] }, { quoted: msg }); } catch (e) {}
    }
  }

  if (!ehCmdAfk) {
    try {
      const ctxInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo || msg.message?.stickerMessage?.contextInfo || msg.message?.documentMessage?.contextInfo || msg.message?.audioMessage?.contextInfo || msg.message?.buttonsResponseMessage?.contextInfo || msg.message?.listResponseMessage?.contextInfo;
      let jidsParaChecar = [...new Set([...(ctxInfo?.mentionedJid || []), ctxInfo?.participant].filter(Boolean))];
      const afkEncontrados = [];
      for (let j of jidsParaChecar) {
        let afkData = getAFK(j);
        if (!afkData && j.endsWith('@lid')) {
          const senderAlt = msg?.key?.participantAlt || msg?.key?.remoteJidAlt;
          const numJ = j.split('@')[0].split(':')[0];
          const numSender = sender.split('@')[0].split(':')[0];
          if (senderAlt === j || numJ === numSender) { afkData = getAFK(sender); if (afkData) j = sender; }
        }
        if (afkData && !afkEncontrados.find(a => a.jid === j)) afkEncontrados.push({ jid: j, ...afkData });
      }
      if (afkEncontrados.length > 0) {
        let texto = `📴 *USUÁRIO(S) AFK*\n\n`;
        const mentions = [];
        for (const u of afkEncontrados) {
          texto += `👤 @${u.jid.split('@')[0].split(':')[0]}\n📝 Motivo: ${u.motivo}\n⏱️ Ausente há: *${formatarTempoAFK(u.timestamp)}*\n\n`;
          mentions.push(u.jid);
        }
        await client.sendMessage(jid, { text: texto.trim(), mentions }, { quoted: msg });
      }
    } catch (e) {}
  }

  // 🛡️ VERIFICAÇÕES AUTOMÁTICAS
  if (isGroup && !ehCmdAfk) {
    const tratadaProtecao = await verificarProtecoes(client, msg, jid, sender);
    if (tratadaProtecao) return;

    const tratadaAutomacao = await verificarAutomacoes(client, msg, jid, sender);
    if (tratadaAutomacao) return;
  }

  const ehComando = body.startsWith(PREFIX);
  let nomeGrupo = isGroup ? 'Grupo' : 'Conversa Privada';
  if (isGroup) { try { nomeGrupo = (await client.groupMetadata(jid))?.subject || 'Grupo sem nome'; } catch (e) {} }
  const numeroAutor = sender.split('@')[0].split(':')[0];

  if (body && body.trim().length > 0) {
    logMensagem({ tipo: ehComando ? 'COMANDO' : 'MENSAGEM', autorNome: pushName, autorNumero: numeroAutor, grupoNome: nomeGrupo, grupoJid: jid, mensagem: body, isComando: ehComando });
    try {
      if (estaAtiva()) { registrarLeitura({ tipo: ehComando ? 'COMANDO' : 'MENSAGEM', autor: pushName, autorNumero: numeroAutor, grupoNome: nomeGrupo, grupoJid: jid, mensagem: body, isComando: ehComando }); try { await client.readMessages([msg.key]); } catch (e) {} }
    } catch (e) {}
  }

  if (sender) {
    if (msg.message?.stickerMessage) incrementarFigurinha(sender);
    else incrementarMensagem(sender);
  }

  if (isGroup) {
    const configGP = getGrupo(jid);
    if (estaMutado(jid, sender)) {
      try { await client.sendMessage(jid, { delete: msg.key }); } catch (e) {}
      if (body.startsWith(PREFIX)) try { await client.groupParticipantsUpdate(jid, [sender], 'remove'); } catch (e) {}
      return;
    }
    if (configGP.antiPalavrao && configGP.palavrasProibidas.length > 0) {
      if (configGP.palavrasProibidas.some(p => body.toLowerCase().includes(p))) {
        try { await client.sendMessage(jid, { delete: msg.key }); } catch (e) {}
        return;
      }
    }
    if (configGP.antiLink) {
      const regexLink = /(https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/)[^\s]+/gi;
      if (regexLink.test(body)) {
        let meta = null; try { meta = await client.groupMetadata(jid); } catch (e) {}
        if (!isAdmin(sender, meta) && !isOwner(sender)) {
          try { await client.sendMessage(jid, { delete: msg.key }); } catch (e) {}
          await client.sendMessage(jid, { text: `🚫 @${sender.split('@')[0]}, links não são permitidos!`, mentions: [sender] });
          return;
        }
      }
    }
  }

  if (jid === GRUPO_SUPORTE && estaNoModoIA(sender) && !body.startsWith(PREFIX)) {
    await responderAutomatico(client, msg, sender, pushName, body);
    return;
  }

  if (isGroup && !body.startsWith(PREFIX)) {
    const modoIA = getModoIAGrupo(jid);
    if (modoIA > 0) {
      const chamouBot = bodyLower.includes('freddy') || bodyLower.includes('bot') || bodyLower.includes(BOT_NAME.toLowerCase());
      if (chamouBot) {
        let textoLimpo = body.replace(/freddy/gi, '').replace(/bot/gi, '').replace(new RegExp(BOT_NAME, 'gi'), '').replace(/[,\?\!]/g, '').trim();
        if (textoLimpo.length > 0) {
          if (modoIA === 1) {
            await client.sendMessage(jid, { text: '🤔 Deixe-me pensar...' }, { quoted: msg });
            const resposta = await chamarGemini(textoLimpo, "Você é o Freddy Bot, responda de forma clara e curta.");
            if (resposta) await client.sendMessage(jid, { text: resposta }, { quoted: msg });
            return;
          }
        }
      }
    }
  }

  if (bodyLower === 'prefixo' || bodyLower === 'prefixo?' || bodyLower === 'qual o prefixo') {
    await client.sendMessage(jid, { text: `🤖 O prefixo é: *${PREFIX}*` }, { quoted: msg });
    return;
  }

  if (!body.startsWith(PREFIX)) return;
  const input = body.slice(PREFIX.length).trim();
  if (!input) return;

  const [rawCommand, ...args] = input.split(/\s+/);
  const command = rawCommand.toLowerCase();
  const q = args.join(' ');

  incrementarComando(sender);
  adicionarXP(sender, 10);
  const ehDono = isOwner(sender);
  const verificado = podeUsarComando(sender, ehDono);
  
  if (!verificado.permitido) {
    if (Date.now() - (avisosEnviados[sender] || 0) > 10000) {
      avisosEnviados[sender] = Date.now();
      try { await client.sendMessage(jid, { text: `⚠️ *CALMA AÍ!*\nAguarde *${verificado.tempoRestante}s*.` }, { quoted: msg }); } catch (e) {}
    }
    return;
  }

  await delayResposta(ehDono);

  const fotoCmd = getFotoComando(command);
  const fotoExiste = fotoCmd && fs.existsSync(fotoCmd) ? fotoCmd : null;
  let ultimoTextoEnviado = null;
  const replyNormal = createReply(client, msg);

  const reply = async (text, extras = {}) => {
    if (extras.image) return replyNormal(text, extras);
    if (fotoExiste) { ultimoTextoEnviado = text; return null; }
    return replyNormal(text, extras);
  };

  if (isGroup) registrarGrupo(jid);

  const bonus = verificarBonusDiario(sender);
  if (bonus.recebeu) { try { await client.sendMessage(jid, { text: `🎁 *BÔNUS DIÁRIO!*\nVocê recebeu 125 coins!` }, { quoted: msg }); } catch (e) {} }

  if (getAluguelGlobal() && isGroup && !ehDono) {
    const comandosDono = ['aluguelglobal', 'aluguel', 'reiniciar', 'botoff', 'boton', 'setdelay', 'setlimite', 'antiflood', 'addcoins', 'rmcoins', 'addvip', 'addcmdvip', 'antispam', 'autofechar', 'atualizarbot'];
    if (!comandosDono.includes(command) && !temAluguelAtivo(jid)) return;
  }

  if (isBotRestrito() && !ehDono) return;
  if (estaEmHorarioOff() && !ehDono) return;

  let groupMetadata = null;
  if (isGroup) { try { groupMetadata = await client.groupMetadata(jid); } catch (error) {} }

  const ctx = { client, msg, jid, sender, pushName, isGroup, groupMetadata, q, args, reply };

  if (isVIPCommand(command) && !isVIP(sender) && !ehDono) return reply('❌ Este comando é exclusivo para usuários *VIP*!');

  switch (command) {
    // ================= POKÉMON =================
    case 'menupokemon': case 'menupoke': await executeMenuPokemon(ctx); break;
    case 'pokemon': await executePokemon(ctx); break;
    case 'meuspokemons': await executeMeusPokemons(ctx); break;
    case 'trocar': await executeTrocar(ctx); break;
    case 'alimentar': await executeAlimentar(ctx); break;
    case 'batalhapokemon': await executeBatalhaPokemon(ctx); break;
    case 'ataque1': await executeAtaque(ctx, 1); break;
    case 'ataque2': await executeAtaque(ctx, 2); break;
    case 'ataque3': await executeAtaque(ctx, 3); break;
    case 'lojapokemon': await executeLojaPokemon(ctx); break;
    case 'lojapokebola': await executeLojaPokebola(ctx); break;
    case 'comprar': await executeComprar(ctx); break;
    case 'capturar': await executeCapturar(ctx); break;
    case 'ativarspawn': await executeAtivarSpawn(ctx); break;
    case 'desativarspawn': await executeDesativarSpawn(ctx); break;
    case 'spawn': 
      if (!ehDono) return reply('❌ Apenas o dono pode forçar o spawn.');
      const forcou = await forcarSpawn(client, jid);
      if (!forcou) reply('⚠️ Já tem um Pokémon esperando captura.');
      break;

    // ================= PROTEÇÃO =================
    case 'antispam': await executeAntiSpam(ctx); break;
    case 'antimidia': await executeAntiMidia(ctx); break;
    case 'blacklist': case 'listanegra': await executeListaNegra(ctx); break;

    // ================= GESTÃO =================
    case 'autofechar': await executeAutoFechar(ctx); break;
    case 'atividade': await executeAtividade(ctx); break;
    case 'inativos': await executeInativos(ctx); break;
    case 'rminativos': await executeRmInativos(ctx); break;
    case 'setregras': await executeSetRegras(ctx); break;
    case 'regras': await executeRegras(ctx); break;
    case 'delregras': await executeDelRegras(ctx); break;

    // ================= AUTOMAÇÃO =================
    case 'despedida': await executeDespedida(ctx); break;
    case 'setdespedida': await executeSetDespedida(ctx); break;
    case 'addfiltro': await executeAddFiltro(ctx); break;
    case 'delfiltro': await executeDelFiltro(ctx); break;
    case 'filtros': await executeFiltros(ctx); break;
    case 'antimarcacao': await executeAntiMarcacao(ctx); break;

    // ================= CARGOS =================
    case 'promover': await executePromover(ctx); break;
    case 'rebaixar': await executeRebaixar(ctx); break;
    case 'apagar': await executeApagar(ctx); break;
    case 'todos': await executeTodos(ctx); break;
    case 'hidetag': await executeHidetag(ctx); break;

    // ================= AFK =================
    case 'afk': await executeAfk(ctx); break;
    case 'afklista': await executeAfkLista(ctx); break;

    // ================= MENUS =================
    case 'menu':
      if (args[0] === 'admin') await executeMenuAdmin(ctx);
      else if (args[0] === 'game') await executeMenuGame(ctx);
      else if (args[0] === 'rpg') await executeMenuRPG(ctx);
      else if (args[0] === 'pokemon' || args[0] === 'poke') await executeMenuPokemon(ctx);
      else if (args[0] === 'membros') await executeMenuMembros(ctx);
      else if (args[0] === 'religioso') await executeMenuReligioso(ctx);
      else if (args[0] === 'catolico') await executeMenuCatolico(ctx);
      else if (args[0] === 'vip') await executeMenuVIP(ctx);
      else if (args[0] === 'dono') await executeMenuOwner(ctx);
      else await executeMenu(ctx);
      break;
    case 'menuadmin': await executeMenuAdmin(ctx); break;
    case 'menugame': await executeMenuGame(ctx); break;
    case 'menurg': await executeMenuRPG(ctx); break;
    case 'menumembros': await executeMenuMembros(ctx); break;
    case 'menureligioso': await executeMenuReligioso(ctx); break;
    case 'menucatolico': await executeMenuCatolico(ctx); break;
    case 'menuvip': await executeMenuVIP(ctx); break;
    case 'menudono': await executeMenuOwner(ctx); break;
    case 'menubaixar': case 'menudownload': await executeMenuBaixar(ctx); break;
    case 'help': await executeMenu(ctx); break;
    case 'perfil': await executePerfilGlobal(ctx); break;

    // ================= OUTROS =================
    case 'ia': case 'freddy': await executeIA(ctx); break;
    case 'iamodo': await executeIAModo(ctx); break;
    case 'ialimpar': await executeIALimpar(ctx); break;
    case 's': case 'sticker': case 'fig': await executeSticker(ctx); break;
    case 'take': case 'rename': await executeTake(ctx); break;
    case 'brat': await executeBrat(ctx); break;
    case 'bratverde': await executeBratVerde(ctx); break;
    case 'bratvideo': await executeBratVideo(ctx); break;
    case 'id': await executeId(ctx); break;
    case 'info': await executeInfo(ctx); break;
    case 'uptime': await executeUptime(ctx); break;
    case 'convite': case 'linkgp': await executeConvite(ctx); break;
    case 'meusdados': case 'stats': await executeMeusDados(ctx); break;
    case 'calc': case 'calcular': await executeCalc(ctx); break;
    case 'clima': case 'tempo': await executeClima(ctx); break;
    case 'sigla': await executeSigla(ctx); break;
    case 'dado': await executeDado(ctx); break;
    case 'moeda': await executeMoeda(ctx); break;
    case 'sorte': await executeSorte(ctx); break;
    case 'simounao': case '8ball': await executeSimOuNao(ctx); break;
    case 'piada': await executePiada(ctx); break;
    case 'curiosidade': await executeCuriosidade(ctx); break;
    case 'abracar': await executeAbracar(ctx); break;
    case 'beijar': await executeBeijar(ctx); break;
    case 'elogiar': await executeElogiar(ctx); break;
    case 'ship': await executeShip(ctx); break;
    case 'gay': await executeGay(ctx); break;
    case 'corno': await executeCorno(ctx); break;
    case 'beijo': await executeBeijo(ctx); break;
    case 'raspadinha': await executeRaspadinha(ctx); break;
    case 'cassino': case 'slot': await executeCassino(ctx); break;
    case 'duelo': await executeDuelo(ctx); break;
    case 'presentear': case 'dar': await executePresentear(ctx); break;
    case 'top': case 'topmoney': case 'ranking': await executeTop(ctx); break;
    case 'topbanco': await executeTopMoney(ctx); break;
    
    // DONO
    case 'say': await executeSay(ctx); break;
    case 'reiniciar': await executeReiniciar(ctx); break;
    
    // === NOVO COMANDO DE ATUALIZAR BOT AQUI ===
    case 'atualizarbot': 
      if (!ehDono) return reply('❌ Apenas o dono do bot pode usar este comando.');
      await reply('🔄 *Iniciando atualização...*\nBuscando mudanças no GitHub. Por favor, aguarde alguns segundos.');
      
      const { atualizarBot } = await import('./update.js');
      const resultadoUpdate = await atualizarBot();
      
      await reply(resultadoUpdate.mensagem);
      
      if (resultadoUpdate.sucesso) {
        await reply('♻️ Reiniciando o bot para aplicar o código novo...');
        setTimeout(() => {
          process.exit(0);
        }, 5000);
      }
      break;
    // =========================================

    case 'botoff': await executeBotOff(ctx); break;
    case 'boton': await executeBotOn(ctx); break;
    case 'nick-dono': await executeNickDono(ctx); break;
    case 'fotomenu': await executeFotoMenu(ctx); break;
    case 'setdelay': await executeSetDelay(ctx); break;
    case 'setlimite': await executeSetLimite(ctx); break;
    case 'antiflood': await executeAntiFlood(ctx); break;
    case 'addcoins': await executeAddCoins(ctx); break;
    case 'rmcoins': await executeRmCoins(ctx); break;
    case 'definircmdfoto': await executeDefinirCmdFoto(ctx); break;
    case 'rmcmdfoto': await executeRmCmdFoto(ctx); break;
    case 'channel': case 'canal': await executeChannel(ctx); break;
    case 'rmchannel': case 'rmcanal': await executeRmChannel(ctx); break;
    case 'horariooff': case 'horario-off': await executeHorarioOff(ctx); break;
    case 'auto-leitura': case 'autoleitura': case 'auto_leitura': await executeAutoLeitura(ctx); break;
    case 'antipv': await executeAntiPV(ctx); break;
    case 'setrecado': await executeSetRecado(ctx); break;
    case 'addvip': await executeAddVIP(ctx); break;
    case 'addcmdvip': await executeAddCmdVIP(ctx); break;
    case 'rmcmdvip': await executeRmCmdVIP(ctx); break;
    
    // ADMIN
    case 'modoia': await executeModoIAGrupo(ctx); break;
    case 'modoparceria': await executeModoParceria(ctx); break;
    case 'addparceria': await executeAddParceria(ctx); break;
    case 'delparceria': await executeDelParceria(ctx); break;
    case 'lista-parceria': await executeListaParceria(ctx); break;
    case 'ban': await executeBan(ctx); break;
    case 'setfotogp': await executeSetFotoGP(ctx); break;
    case 'setnomegp': await executeSetNomeGP(ctx); break;
    case 'antipalavrao': await executeAntiPalavrao(ctx); break;
    case 'addpalavra': await executeAddPalavra(ctx); break;
    case 'delpalavra': await executeDelPalavra(ctx); break;
    case 'listapalavras': await executeListaPalavras(ctx); break;
    case 'bemvindo': await executeBemVindo(ctx); break;
    case 'setlegenda': await executeSetLegenda(ctx); break;
    case 'setfotobv': await executeSetFotoBV(ctx); break;
    case 'abrir': await executeAbrir(ctx); break;
    case 'fechar': await executeFechar(ctx); break;
    case 'admins': await executeChamarAdmins(ctx); break;
    case 'mute': await executeMute(ctx); break;
    case 'desmute': await executeDesmute(ctx); break;
    case 'sorteio': await executeSorteio(ctx); break;
    case 'botadm': await executeBotAdm(ctx); break;
    case 'antifake': await executeAntiFake(ctx); break;
    case 'antibot': await executeAntiBot(ctx); break; 
    case 'anticall': case 'anti-call': case 'anti-ligacao': await executeAntiCall(ctx); break;
    case 'antilink': case 'anti-link': await executeAntiLink(ctx); break;
    case 'advertir': case 'warn': await executeAdvertir(ctx); break;
    case 'rmwarn': case 'removerwarn': await executeRemoverWarn(ctx); break;
    case 'limparwarns': case 'limparwarn': await executeLimparWarns(ctx); break;
    case 'warns': case 'verwarns': await executeVerWarns(ctx); break;
    case 'listarwarns': await executeListarWarns(ctx); break;

    // PESQUISAS
    case 'play-video': case 'play_video': case 'playvideo': case 'playmp4': await executePlayVideo(ctx); break;
    case 'pinterest': case 'pin': await executePinterest(ctx); break;
    case 'animal': case 'animais': await executeAnimal(ctx); break;
    case 'playlist-spotify': case 'playlist_spotify': case 'spotify-playlist': await executePlaylistSpotify(ctx); break;

    // DOWNLOADS
    case 'ytmp3': await executeYtmp3(ctx); break;
    case 'ytmp4': await executeYtmp4(ctx); break;
    case 'snapchat': await executeSnapchat(ctx); break;
    case 'gdrive': await executeGdrive(ctx); break;
    case 'reddit': await executeReddit(ctx); break;

    // JOGOS
    case 'velha': await executeVelha(ctx); break;
    case 'jogarvelha': await executeJogarVelha(ctx); break;
    case 'pararvelha': await executePararVelha(ctx); break;
    case 'quebracabeca': case 'quebra-cabeca': await executeQuebraCabeca(ctx); break;
    case 'responder': await executeResponder(ctx); break;
    case 'pararquebra': await executePararQuebra(ctx); break;
    case 'vdd': await executeVDD(ctx); break;
    case 'vd': case 'verdadedesafio': await executeVDDResponder(ctx); break;
    case 'eununca': case 'eu-nunca':
      if (args[0] === '1' || args[0] === '2') await executeVotarEuNunca(ctx);
      else await executeEuNunca(ctx);
      break;
    case 'forca': await executeForca(ctx); break;
    case 'forcaunica': case 'forca-unica': await executeForcaIndividual(ctx); break;
    case 'letra': await executeLetra(ctx); break;
    case 'pararforca': await executePararForca(ctx); break;
    case 'quizanimal': case 'quiz': await executeQuizAnimal(ctx); break;
    case 'responderquiz': await executeResponderQuiz(ctx); break;
    case 'pararquiz': await executePararQuiz(ctx); break;
    case 'ppt': await executePPT(ctx); break;
    case 'adivinha': await executeAdivinha(ctx); break;
    case 'chutar': await executeChutar(ctx); break;
    case 'roleta-russa': case 'roletarussa': await executeRoletaRussa(ctx); break;
    case '21': case 'blackjack': await executeBlackjack(ctx); break;
    case 'palavra': await executePalavra(ctx); break;
    case 'desembaralhar': await executeDesembaralhar(ctx); break;
    case 'anagrama': await executeAnagrama(ctx); break;
    case 'resp-anagrama': await executeRespAnagrama(ctx); break;
    case 'matematica': await executeMatematica(ctx); break;
    case 'resp-matematica': await executeRespMatematica(ctx); break;
    case 'bandeira': await executeBandeira(ctx); break;
    case 'resp-bandeira': await executeRespBandeira(ctx); break;
    case 'memoria': await executeMemoria(ctx); break;
    case 'resp-memoria': await executeRespMemoria(ctx); break;
    case 'stop': await executeStop(ctx); break;
    case 'resp-stop': await executeRespStop(ctx); break;

    // SISTEMAS EXTRAS
    case 'dna': case 'meu-dna': case 'dnacheck': await executeDNA(ctx); break;
    case 'akinator': await executeAkinator(ctx); break;
    case 'resp': await executeRespAkinator(ctx); break;
    case 'topakinator': await executeTopAkinator(ctx); break;
    case 'modofnaf': await executeFNAFStart(ctx); break;
    case 'vercamera': await executeVerCamera(ctx); break;
    case 'fecharcamera': await executeFecharCamera(ctx); break;
    case 'porta': await executePorta(ctx); break;
    case 'luz': await executeLuz(ctx); break;
    case 'statusfnaf': await executeStatusFNAF(ctx); break;
    case 'fazendas': await executeFazendas(ctx); break;
    case 'comprarfazenda': await executeComprarFazenda(ctx); break;
    case 'minhafazenda': case 'fazenda': await executeMinhaFazenda(ctx); break;
    case 'lojaanimais': await executeLojaAnimais(ctx); break;
    case 'compraranimal': await executeComprarAnimal(ctx); break;
    case 'melhorias': await executeMelhorias(ctx); break;
    case 'comprarmelhoria': await executeComprarMelhoria(ctx); break;
    case 'coletar': await executeColetar(ctx); break;
    case 'cidade':
      if (args[0] === 'ranking') await executeRankingCidade(ctx);
      else await executeCidade(ctx);
      break;
    case 'criarcidade': await executeCriarCidade(ctx); break;
    case 'construir': await executeConstruir(ctx); break;
    case 'coletarimpostos': await executeColetarImpostos(ctx); break;
    case 'rankingcidade': await executeRankingCidade(ctx); break;
    case 'demolir': await executeDemolir(ctx); break;
    case 'melhorarestrutura': await executeMelhorarEstrutura(ctx); break;
    case 'proposta': await executeProposta(ctx); break;
    case 'aceitarproposta': await executeAceitarProposta(ctx); break;
    case 'recusarproposta': await executeRecusarProposta(ctx); break;
    case 'pescar': await executePescar(ctx); break;
    case 'aquario': await executeAquario(ctx); break;
    case 'venderpeixes': await executeVenderPeixes(ctx); break;
    case 'comprariscas': await executeComprarIscas(ctx); break;
    case 'criarcla': await executeCriarCla(ctx); break;
    case 'entrarcla': await executeEntrarCla(ctx); break;
    case 'saircla': await executeSairCla(ctx); break;
    case 'meucla': case 'cla': await executeMeuCla(ctx); break;
    case 'rankingclas': await executeRankingClas(ctx); break;
    case 'casar': await executeCasar(ctx); break;
    case 'divorciar': await executeDivorciar(ctx); break;
    case 'meucasamento': case 'casamento': await executeMeuCasamento(ctx); break;
    case 'meunivel': case 'nivel': await executeMeuNivel(ctx); break;
    case 'lojapocoes': await executeLojaPocoes(ctx); break;
    case 'comprarpocao': await executeComprarPocao(ctx); break;
    case 'meusbuffs': case 'buffs': await executeMeusBuffs(ctx); break;
    case 'emprestimo': await executeEmprestimo(ctx); break;
    case 'pagaremprestimo': await executePagarEmprestimo(ctx); break;
    case 'daily': await executeDaily(ctx); break;
    case 'play': await executePlay(ctx); break;
    case 'aluguelglobal': await executeAluguelGlobal(ctx); break;
    case 'aluguel': await executeAluguel(ctx); break;
    case 'rg_aluguel': await executeRgAluguel(ctx); break;
    case 'rm_aluguel': await executeRmAluguel(ctx); break;
    case 'rn_aluguel': await executeRnAluguel(ctx); break;
    case 'listar_alugueis': await executeListarAlugueis(ctx); break;
    case 'limpar_alugueis': await executeLimparAlugueis(ctx); break;
    case 'perfilrpg': await executePerfilRPG(ctx); break;
    case 'apostar': await executeApostar(ctx); break;
    case 'investir': await executeInvestir(ctx); break;
    case 'roubar': await executeRoubar(ctx); break;
    case 'pix': await executePix(ctx); break;
    case 'banco': await executeBanco(ctx); break;
    case 'trabalhar': await executeTrabalhar(ctx); break;
    case 'empregos': await executeEmpregos(ctx); break;
    case 'adotar': await executeAdotar(ctx); break;
    case 'pets': await executePets(ctx); break;
    case 'trocarpet': await executeTrocarPet(ctx); break;
    case 'batalhapet': await executeBatalhaPet(ctx); break;
    case 'comprarcasa': await executeComprarCasa(ctx); break;
    case 'casas': await executeCasas(ctx); break;
    case 'data': await executeData(ctx); break;
    case 'hora': await executeHora(ctx); break;
    case 'idade': await executeIdade(ctx); break;
    case 'imc': await executeIMC(ctx); break;
    case 'porcentagem': case 'porcento': await executePorcentagem(ctx); break;
    case 'regra3': case 'regradetres': await executeRegra3(ctx); break;
    case 'juros': await executeJuros(ctx); break;
    case 'senha': case 'gerarsenha': await executeSenha(ctx); break;
    case 'sortear': await executeSortear(ctx); break;
    case 'escolher': await executeEscolher(ctx); break;
    case 'contar': await executeContar(ctx); break;
    case 'inverter': await executeInverter(ctx); break;
    case 'maiusculo': case 'upper': await executeMaiusculo(ctx); break;
    case 'minusculo': case 'lower': await executeMinusculo(ctx); break;
    case 'morse': await executeMorse(ctx); break;
    case 'binario': await executeBinario(ctx); break;
    case 'base64': await executeBase64(ctx); break;
    case 'validarcpf': await executeValidarCPF(ctx); break;
    case 'quem': await executeQuem(ctx); break;
    case 'vipinfo': await executeVipInfo(ctx); break;
    case 'vipsenha': await executeVipSenha(ctx); break;
    case 'vipqr': await executeVipQR(ctx); break;
    case 'vipcifrar': await executeVipCifrar(ctx); break;
    case 'vipdecifrar': await executeVipDecifrar(ctx); break;
    case 'vipemoji': await executeVipEmoji(ctx); break;
    case 'religiao': case 'registrarreligiao': await executeReligiao(ctx); break;
    case 'papa': case 'papas': await executePapa(ctx); break;
    case 'santuario': case 'santuário': await executeSantuario(ctx); break;
    case 'bispo': case 'bispo-brasil': await executeBispo(ctx); break;
    case 'padre': await executePadre(ctx); break;
    case 'santododia': await executeSantoDoDia(ctx); break;
    default: break;
  }

  if (fotoExiste && ultimoTextoEnviado) {
    try {
      const canal = getCanal();
      const payload = { image: fs.readFileSync(fotoExiste), caption: ultimoTextoEnviado };
      if (canal && canal.id) {
        payload.contextInfo = { forwardingScore: 999, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: canal.id, newsletterName: canal.nome || 'Canal', serverMessageId: -1 } };
      }
      await client.sendMessage(jid, payload, { quoted: msg });
    } catch (e) {}
  }
        }
