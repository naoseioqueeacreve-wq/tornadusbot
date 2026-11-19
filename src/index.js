import fs from 'node:fs';
import { areJidsSameUser } from '@whiskeysockets/baileys'; 
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
import { isVIP, isVIPCommand } from './functions/vipDB.js';

// 🕹️ IMPORTAÇÃO DO NOVO SISTEMA DE BOTÕES
import { getRespostaBotao, enviarBotoes, botaoResposta } from './functions/botoes.js';
import { executeMenuBotoes, executePing } from './commands/menuBotoes.js';

// SISTEMA ANTI-PAYMENT (NOVA IMPORTAÇÃO)
import { verificarAntiPayment } from './functions/paymentDefense.js';

// SISTEMA IA GRUPO (NOVO)
import { processarIAGrupo } from './functions/iaGrupoCore.js';
import { executeModoIAGrupo, executePersonalidadeIA } from './commands/iaGrupo_cmd.js';

// IMPORTS DE LEVEL E ATUALIZAÇÃO
import { adicionarXPLevel, isLevelAtivo } from './functions/levelDB.js';
import { executeLevelMsg, executeMeuLevel } from './commands/level_cmd.js';

// APIS YUTA
import { 
  executeLetra, executeYtSearch, executePlayStore, 
  executePinterest, executeMetadinha, executeAkinator 
} from './commands/apis.js';

// COMANDOS PERSONALIZADOS (DONO)
import { executeAddCmd, executeDelCmd } from './commands/custom_cmd.js';
import { getCustomCommand } from './functions/customCommandsDB.js';

// =========================================
// IMPORTS DE COMANDOS
// =========================================
import { executeMenu, executeMenuAdmin, executeMenuRPG, executeMenuBaixar, executeMenuMembros, executeMenuReligioso, executeMenuCatolico, executeMenuVIP, executeMenuPokemon, executeMenuLista } from './commands/menu.js';
import { executeMenuGame, executeDaily } from './commands/game.js';
import { executeMenuOwner, executeSay, executeReiniciar, executeBotOff, executeBotOn, executeNickDono, executeFotoMenu, executeAddCoins, executeRmCoins, executeSetRecado, isBotRestrito, executeSetNomeIAGlobal } from './commands/owner.js';
import { executeDefinirCmdFoto, executeRmCmdFoto, executeChannel, executeRmChannel } from './commands/owner_extras.js';
import { executeModoParceria, executeAddParceria, executeDelParceria, executeListaParceria, executeBan, executeSetFotoGP, executeSetNomeGP } from './commands/adm.js';
import { executeAntiPalavrao, executeAddPalavra, executeDelPalavra, executeListaPalavras, executeBemVindo, executeSetLegenda, executeSetFotoBV, executeAbrir, executeFechar, executeChamarAdmins, executeMute, executeDesmute, executeSorteio, executeBotAdm, executeAntiFake, executeAdvertir, executeRemoverWarn, executeLimparWarns, executeVerWarns, executeListarWarns, executeAntiBot, executeAntiPayment } from './commands/admin_extras.js';
import { executePlayVideo, executePinterest as executePinterestAntigo, executeAnimal, executePlaylistSpotify } from './commands/pesquisas.js';
import { executeYtmp3, executeYtmp4, executeSnapchat, executeGdrive, executeReddit } from './commands/baixar.js';
import { executeSticker, executeTake, executeBrat, executeBratVerde, executeBratVideo } from './commands/stickers.js';
import { executeToImage } from './commands/toimage.js'; 
import { executeToGif } from './commands/togif.js';
import { executeIA, executeIAModo, executeIALimpar, estaNoModoIA, responderAutomatico } from './commands/ia.js';

// --- CORREÇÃO DO ERRO DO JOGO DA FORCA AQUI ---
import { executeVelha, executeJogarVelha, executePararVelha, executeQuebraCabeca, executeResponder, executePararQuebra, executeVDD, executeVDDResponder, executeEuNunca, executeVotarEuNunca, executeForca, executeForcaIndividual, executeLetra as executeLetraJogo, executePararForca, executeQuizAnimal, executeResponderQuiz, executePararQuiz, executeAbracar, executeBeijar, executeElogiar, executeShip } from './commands/jogos.js';

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
import { executeRaid, executePasse, executeComprarPasse, executeAtivarRaid, executeDesativarRaid, executeForcarRaid } from './commands/raid.js';
import { forcarSpawn } from './functions/pokemonSpawn.js';

import { executeSetDelay, executeSetLimite, executeAntiFlood } from './commands/antiflood_cmd.js';
import { executePerfil as executePerfilRPG, executeApostar, executeInvestir, executeRoubar, executePix, executeBanco, executeTrabalhar, executeEmpregos, executeAdotar, executePets, executeTrocarPet, executeBatalhaPet, executeComprarCasa, executeCasas } from './commands/rpg.js';
import { executePerfilGlobal } from './commands/perfil.js';
import { executeData, executeHora, executeIdade, executeIMC, executePorcentagem, executeRegra3, executeJuros, executeSenha, executeSortear, executeEscolher, executeContar, executeInverter, executeMaiusculo, executeMinusculo, executeMorse, executeBinario, executeBase64, executeValidarCPF, executeQuem } from './commands/membros.js';
import { executeHorarioOff } from './commands/horarioOff_cmd.js';
import { executeAutoLeitura } from './commands/autoLeitura_cmd.js';
import { executeAntiPV } from './commands/antipv_cmd.js';
import { executeAddVIP, executeAddCmdVIP, executeRmCmdVIP } from './commands/vip_cmd.js';
import { executeVipInfo, executeVipSenha, executeVipQR, executeVipCifrar, executeVipDecifrar, executeVipEmoji } from './commands/vip_funcs.js';
import { executeReligiao } from './commands/religiao_cmd.js';
import { executePapa } from './commands/papas.js';
import { executeSantuario } from './commands/santuario.js';
import { executeBispo } from './commands/bispo.js';
import { executePadre } from './commands/padre.js';
import { executeSantoDoDia } from './commands/santododia.js';
import { executeDNA } from './commands/dna.js';
import { executeAntiCall } from './commands/anticall.js';
import { executeAntiLink } from './commands/antilink.js';
import { executeAfk, executeAfkLista } from './commands/afk.js';
import { getAFK, removeAFK, formatarTempoAFK } from './functions/afkDB.js';
import { executeAntiSpam, executeAntiMidia, executeListaNegra, verificarProtecoes } from './commands/protecao.js';
import { executeAutoFechar, executeAtividade, executeInativos, executeRmInativos, executeSetRegras, executeRegras, executeDelRegras } from './commands/gestao.js';
import { executeDespedida, executeSetDespedida, executeAddFiltro, executeDelFiltro, executeFiltros, executeAntiMarcacao, verificarAutomacoes } from './commands/automacao.js';
import { executePromover, executeRebaixar, executeApagar, executeTodos, executeHidetag } from './commands/cargos.js';

// ================= CONTROLE DE GRUPOS E CARGOS (DONO) =================
import { executeEntrarGrupo, executeSairGrupo } from './commands/join_leave.js';
import { executeNuke } from './commands/nuke.js';
import { executeSerAdm, executeSerMembro } from './commands/seradm_sermembro.js';

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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ parts: [{ text: prompt }] }] };
    if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    
    if (!res.ok) {
      console.log(`[GEMINI ERRO] Status: ${res.status} | Mensagem: ${data.error?.message}`);
      return null;
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) { 
    console.log('[GEMINI ERRO] Falha na requisição:', e.message);
    return null; 
  }
}

// =========================================
// FUNÇÃO PRINCIPAL
// =========================================
export async function handleMessage(client, msg) {
  let body = getText(msg).trim();

  // 🕹️ LÊ OS BOTÕES USANDO O NOVO ARQUIVO botoes.js
  const respostaBotao = getRespostaBotao(msg);
  if (respostaBotao) {
    body = respostaBotao;
  }

  // Garante que se a pessoa clicou num botão, ele tenha o prefixo
  if (body && !body.startsWith(PREFIX) && respostaBotao) {
    body = PREFIX + body.replace(PREFIX, ''); // Evita duplicar o prefixo se já vier nele
  }

  let bodyLower = body.toLowerCase();

  const jid = msg.key.remoteJid;
  const sender = getRealSender(msg);
  const pushName = msg.pushName || 'Usuário';
  const isGroup = jid.endsWith('@g.us');

  // 🚨 VERIFICAÇÃO ANTI-PAYMENT E ANTIBOT
  if (isGroup) {
    const configGP = getGrupo(jid);
    
    // AntiBot
    if (configGP.antiBot) {
      const isBotMessage = msg.key.id.startsWith('BAE5') || msg.key.id.startsWith('3EB0');
      const isNotMe = !areJidsSameUser(sender, client.user.id);

      if (isBotMessage && isNotMe) {
        try {
          await client.groupParticipantsUpdate(jid, [sender], 'remove');
          await client.sendMessage(jid, { text: `🤖🚫 *ANTIBOT*\n\nUm bot foi detectado e removido automaticamente.` });
        } catch (e) {}
        return; 
      }
    }

    // Anti-Payment (Nova função de verificação)
    if (configGP.antiPayment) {
      const tratadaPayment = await verificarAntiPayment(client, msg);
      if (tratadaPayment) return; 
    }
  }

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

  // 📈 SISTEMA DE LEVEL MSG 📈
  if (sender && isGroup) {
    if (msg.message?.stickerMessage) incrementarFigurinha(sender);
    else incrementarMensagem(sender);

    if (isLevelAtivo(jid)) {
      let tipo = getTipoMensagem(msg); 
      
      if (['text', 'sticker', 'image'].includes(tipo)) {
        const resLevel = adicionarXPLevel(sender, jid, tipo);
        
        if (resLevel.subiu) {
          await client.sendMessage(jid, { 
            text: `🎉 *SUBIU DE NÍVEL!*\n\nParabéns @${sender.split('@')[0]}!\nVocê alcançou o nível *${resLevel.nivel}* e agora seu cargo é: *${resLevel.cargo}* 🚀`,
            mentions: [sender]
          }, { quoted: msg });
        }
      }
    }
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

  // =========================================
  // 🧠 SISTEMA DE IA DO GRUPO
  // =========================================
  if (isGroup && !body.startsWith(PREFIX)) {
    const resIA = await processarIAGrupo({
      client, msg, jid, body, pushName, sender, nomeGrupo, chamarGemini,
      agora: Date.now(), rng: Math.random
    });

    if (resIA.tratada) return; 

    if (resIA.comando) {
      body = resIA.comando;
      bodyLower = body.toLowerCase();
    }
  }
  // =========================================

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
    const comandosDono = ['aluguelglobal', 'aluguel', 'reiniciar', 'botoff', 'boton', 'setdelay', 'setlimite', 'antiflood', 'addcoins', 'rmcoins', 'addvip', 'addcmdvip', 'antispam', 'autofechar', 'atualizarbot', 'addcmd', 'delcmd', 'setnomeia'];
    if (!comandosDono.includes(command) && !temAluguelAtivo(jid)) return;
  }

  if (isBotRestrito() && !ehDono) return;
  if (estaEmHorarioOff() && !ehDono) return;

  let groupMetadata = null;
  if (isGroup) { try { groupMetadata = await client.groupMetadata(jid); } catch (error) {} }

  const ctx = { client, msg, jid, sender, pushName, isGroup, groupMetadata, q, args, reply };

  if (isVIPCommand(command) && !isVIP(sender) && !ehDono) return reply('❌ Este comando é exclusivo para usuários *VIP*!');

  const customResponse = getCustomCommand(command);
  if (customResponse) {
    return reply(customResponse);
  }

  switch (command) {
    // ================= CONTROLE DE GRUPOS E CARGOS (DONO) =================
    case 'entrar':
      if (!ehDono) return reply('❌ Apenas o dono do bot pode usar este comando.');
      await executeEntrarGrupo(ctx);
      break;

    case 'sair':
      if (!ehDono) return reply('❌ Apenas o dono do bot pode usar este comando.');
      await executeSairGrupo(ctx);
      break;

    case 'nuke':
      if (!ehDono) return reply('❌ Apenas o dono do bot pode usar este comando.');
      await executeNuke(client, msg, args);
      break;

    case 'seradm':
      if (!ehDono) return reply('❌ Apenas o dono do bot pode usar este comando.');
      await executeSerAdm(client, msg);
      break;

    case 'sermembro':
      if (!ehDono) return reply('❌ Apenas o dono do bot pode usar este comando.');
      await executeSerMembro(client, msg);
      break;

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
    case 'raid': await executeRaid(ctx); break;
    case 'passe': await executePasse(ctx); break;
    case 'comprarpasse': await executeComprarPasse(ctx); break;
    case 'ativarraid': await executeAtivarRaid(ctx); break;
    case 'desativarraid': await executeDesativarRaid(ctx); break;
    case 'forcarraid': await executeForcarRaid(ctx); break;
    case 'spawn': 
      if (!ehDono) return reply('❌ Apenas o dono pode forçar o spawn.');
      const forcou = await forcarSpawn(client, jid);
      if (!forcou) reply('⚠️ Já tem um Pokémon esperando captura.');
      break;

    // ================= APIS YUTA =================
    case 'letra': await executeLetra(ctx); break;
    case 'ytsearch': await executeYtSearch(ctx); break;
    case 'playstore': await executePlayStore(ctx); break;
    case 'pinterest': case 'pin': await executePinterest(ctx); break;
    case 'metadinha': await executeMetadinha(ctx); break;
    case 'akinator': await executeAkinator(ctx); break;

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

    // ================= LEVEL MSG =================
    case 'levelmsg': await executeLevelMsg(ctx); break;
    case 'meulevel': await executeMeuLevel(ctx); break;

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
      
    // 🕹️ NOVO SISTEMA DE MENU COM BOTÕES AQUI
    case 'menubotoes': await executeMenuBotoes(ctx, executeMenu); break;
    case 'menutexto': await executeMenu(ctx); break;
    case 'ping': await executePing(ctx); break;
    
    case 'menulista': case 'menu2': await executeMenuLista(ctx); break;
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
    case 'toimage': case 'toimg': await executeToImage(ctx); break; 
    case 'togif': case 'gif': await executeToGif(ctx); break; 
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
    case 'setnomeia': await executeSetNomeIAGlobal(ctx); break;
    
    // COMANDOS PERSONALIZADOS (DONO)
    case 'addcmd': await executeAddCmd(ctx); break;
    case 'delcmd': await executeDelCmd(ctx); break;
    
    // === CENTRAL DE ATUALIZAÇÕES COM BOTÕES ===
    case 'atualizacao': 
      if (!ehDono) return reply('❌ Apenas o dono do bot pode usar este comando.');
      
      // 🔍 Ação do Botão 1: Verificar
      if (args[0] === 'verificar') {
        await reply('🔍 *VERIFICANDO...*\nBuscando novas versões no servidor, aguarde.');
        try {
          const { execSync } = await import('node:child_process');
          execSync('git fetch');
          const status = execSync('git status -uno').toString();
          
          if (status.includes('up to date') || status.includes('em dia') || status.includes('nada a consolidar')) {
            await reply('✅ *TUDO ATUALIZADO!*\nSeu bot já está rodando na versão mais recente.');
          } else {
            await reply('⚠️ *ATUALIZAÇÃO DISPONÍVEL!*\nUse o botão "Atualizar o Bot" no comando `!atualizacao` para baixar.');
          }
        } catch (e) {
          await reply('❌ Ocorreu um erro ao verificar as atualizações.');
        }
        break;
      }

      // 📥 Ação do Botão 2: Atualizar
      if (args[0] === 'baixar') {
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
      }

      // ✨ Ação do Botão 3: Novidades (Resumido)
      if (args[0] === 'novidades') {
        const changelog = `✨ *O QUE HÁ DE NOVO?* ✨\n\n` +
          `📌 *Última Atualização:*\n` +
          `> 🤖 Sistema de Botões Interativos adicionados ao menu.\n` +
          `> ⚡ Agora você pode Capturar Pokémon usando botões.\n` +
          `> 🎰 Novos botões para Apostar e Investir no RPG.\n` +
          `> 🛡️ Opções de menus aleatórios para facilitar a navegação.\n` +
          `> 💸 Sistema de PIX e transferências otimizado.\n\n` +
          `_Fique de olho, novidades são adicionadas toda semana!_`;
        
        return reply(changelog);
      }

      // Se digitar apenas "!atualizacao", mostra o menu com os 3 botões
      const botoesAtualizacao = [
        botaoResposta('🔍 Verificar Atualizações', `${PREFIX}atualizacao verificar`),
        botaoResposta('📥 Atualizar o Bot', `${PREFIX}atualizacao baixar`),
        botaoResposta('✨ O que há de novo?', `${PREFIX}atualizacao novidades`)
      ];
      
      await enviarBotoes(client, jid, {
        titulo: '⚙️ Central de Atualizações',
        corpo: '🤖 *PAINEL DE CONTROLE DO DONO*\n\nEscolha uma das opções abaixo para gerenciar o seu bot:',
        rodape: '© Pikachu Bot',
        botoes: botoesAtualizacao
      }, msg);
      break;

    case 'botoff': await executeBotOff(ctx); break;
    case 'boton': await executeBotOn(ctx); break;
    case 'nick-dono': await executeNickDono(ctx); break;
    case 'f
