import { PREFIX } from '../config.js';
import { isAdmin, isOwner } from '../functions/permissions.js';
import {
  setModoIAGrupo,
  getConfigIAGrupo,
  setPersonalidadeIAGrupo
} from '../functions/iaGrupoDB.js';
import {
  PERSONALIDADES,
  CHAVES_PERSONALIDADE,
  MAX_CUSTOM,
  getPersonalidade,
  getVoz,
  resolverPersonalidade,
  semAcento,
  preencher
} from '../functions/iaGrupoCore.js';

function nomeDoModo(modo) {
  if (modo === 1) return 'Perguntas (modo 1)';
  if (modo === 2) return 'Comandos (modo 2)';
  return 'Desligada';
}

async function liberar(ctx) {
  const { reply, sender, groupMetadata, isGroup } = ctx;
  if (!isGroup) {
    await reply('❌ Este comando só pode ser usado em grupos!');
    return null;
  }
  const grupoJid = ctx.msg.key.remoteJid;
  const cfg = getConfigIAGrupo(grupoJid);
  const voz = getVoz(cfg);
  // Permite apenas admins ou dono
  if (!isAdmin(sender, groupMetadata) && !isOwner(sender)) {
    await reply(`❌ ${preencher(voz.semPermissao, { nome: cfg.nome })}`);
    return null;
  }
  return { cfg, voz, grupoJid };
}

export async function executeModoIAGrupo(ctx) {
  const { reply, args } = ctx;
  const ok = await liberar(ctx);
  if (!ok) return;
  const { grupoJid } = ok;

  const sub = (args[0] || '').toLowerCase();

  if (sub === '1' || sub === '2') {
    const modo = Number(sub);
    setModoIAGrupo(grupoJid, modo);
    const cfg = getConfigIAGrupo(grupoJid);
    const voz = getVoz(cfg);
    const vars = { nome: cfg.nome };

    return reply(
      `🧠 *MODO IA ${modo} ATIVADO*\n\n` +
      `${preencher(modo === 1 ? voz.ligou1 : voz.ligou2, vars)}\n\n` +
      (modo === 1
        ? `Me chame pelo nome e faça sua pergunta.\nExemplo: _"${cfg.nome}, o que é FNAF?"_\n\n`
        : `Me chame pelo nome e peça a ação em texto natural.\nExemplo: _"${cfg.nome}, abra o grupo"_\n\n`) +
      `🎭 Personalidade: ${getPersonalidade(cfg.personalidade).emoji} *${getPersonalidade(cfg.personalidade).rotulo}*\n` +
      `💡 Desativar: *${PREFIX}modoia off* | Mudar personalidade: *${PREFIX}personalidadeia*`
    );
  }

  if (sub === 'off' || sub === '0' || sub === 'desativar') {
    const cfg = getConfigIAGrupo(grupoJid);
    setModoIAGrupo(grupoJid, 0);
    return reply(
      `🛑 *MODO IA DESATIVADO*\n\n` +
      `${preencher(getVoz(cfg).desligou, { nome: cfg.nome })}\n\n` +
      `_(Minha personalidade continua salva.)_`
    );
  }

  const cfg = getConfigIAGrupo(grupoJid);
  const pers = getPersonalidade(cfg.personalidade);
  const voz = getVoz(cfg);
  const ligada = cfg.modo > 0;

  return reply(
    `🧠 *CENTRAL DA IA DO GRUPO*\n\n` +
    `${preencher(voz.exemplo, { nome: cfg.nome })}\n\n` +
    `📌 Status: *${nomeDoModo(cfg.modo)}*\n` +
    `🪪 Nome: *${cfg.nome}*\n` +
    `🎭 Personalidade: ${pers.emoji} *${pers.rotulo}*\n` +
    (ligada ? `📣 Como chamar: _"${cfg.nome}, ..."_\n` : '') +
    `\n*Opções:*\n` +
    `▸ *${PREFIX}modoia 1* → Responde perguntas\n` +
    `▸ *${PREFIX}modoia 2* → Executa comandos por texto\n` +
    `▸ *${PREFIX}modoia off* → Desativar\n` +
    `▸ *${PREFIX}personalidadeia* → Muda o jeito de falar\n\n` +
    `_(Para mudar o nome da IA, fale com o Dono do bot)_`
  );
}

export async function executePersonalidadeIA(ctx) {
  const { reply, q } = ctx;
  const ok = await liberar(ctx);
  if (!ok) return;
  const { cfg, grupoJid } = ok;

  const entrada = (q || '').trim();
  const primeira = semAcento(entrada.split(/\s+/)[0]);

  if (!entrada || primeira === 'lista' || primeira === 'listar') {
    const atual = getPersonalidade(cfg.personalidade);
    const linhas = CHAVES_PERSONALIDADE.map(k => {
      const p = PERSONALIDADES[k];
      const marca = k === cfg.personalidade ? ' ✅' : '';
      return `${p.emoji} *${p.rotulo}*${marca}\n    ↳ _${p.resumo}_\n    ↳ ${PREFIX}personalidadeia ${semAcento(p.rotulo)}`;
    });
    const custom = cfg.personalidade === 'custom' ? ' ✅' : '';

    return reply(
      `🎭 *PERSONALIDADE DA IA*\n\n` +
      `Agora estou: ${atual.emoji} *${atual.rotulo}*\n\n` +
      `${linhas.join('\n\n')}\n\n` +
      `✨ *Personalizada*${custom}\n` +
      `    ↳ _Você descreve o jeito de falar_\n` +
      `    ↳ ${PREFIX}personalidadeia custom <descrição>\n` +
      `    ↳ Ex.: ${PREFIX}personalidadeia custom um pirata engraçado que fala "arrr"\n\n` +
      `🔄 ${PREFIX}personalidadeia resetar → volta para Amigável`
    );
  }

  if (['resetar', 'reset', 'restaurar'].includes(primeira)) {
    setPersonalidadeIAGrupo(grupoJid, 'padrao');
    const nova = getConfigIAGrupo(grupoJid);
    return reply(
      `🔄 *PERSONALIDADE RESTAURADA*\n\n` +
      `${preencher(getVoz(nova).persOk, { nome: nova.nome })}\n\n` +
      `${preencher(getVoz(nova).exemplo, { nome: nova.nome })}`
    );
  }

  if (primeira === 'custom' || primeira === 'personalizada' || primeira === 'personalizado') {
    const texto = entrada.replace(/^\S+\s*/, '').replace(/\s+/g, ' ').trim();

    if (texto.length < 5) {
      return reply(
        `✨ *PERSONALIDADE PERSONALIZADA*\n\n` +
        `Descreva como eu devo falar (5 a ${MAX_CUSTOM} caracteres).\n\n` +
        `Exemplos:\n` +
        `▸ ${PREFIX}personalidadeia custom um pirata engraçado que fala "arrr"\n` +
        `▸ ${PREFIX}personalidadeia custom um professor paciente que explica com exemplos`
      );
    }
    if (texto.length > MAX_CUSTOM) {
      return reply(`❌ Descrição grande demais (${texto.length}). O máximo é *${MAX_CUSTOM}* caracteres.`);
    }

    setPersonalidadeIAGrupo(grupoJid, 'custom', texto);
    const nova = getConfigIAGrupo(grupoJid);
    return reply(
      `✨ *PERSONALIDADE PERSONALIZADA SALVA*\n\n` +
      `A partir de agora vou falar assim: _${texto}_\n\n` +
      (nova.modo === 0 ? `⚠️ A IA está desligada neste grupo. Ligue com *${PREFIX}modoia 1*.` : `Pode testar: _"${nova.nome}, se apresente!"_`)
    );
  }

  const chave = resolverPersonalidade(primeira);
  if (!chave) {
    return reply(
      `❌ Não conheço a personalidade *${entrada}*.\n\n` +
      `Opções: ${CHAVES_PERSONALIDADE.map(k => `*${semAcento(PERSONALIDADES[k].rotulo)}*`).join(', ')} ou *custom*.\n` +
      `Veja os detalhes com *${PREFIX}personalidadeia*.`
    );
  }

  setPersonalidadeIAGrupo(grupoJid, chave);
  const nova = getConfigIAGrupo(grupoJid);
  const p = getPersonalidade(chave);

  return reply(
    `🎭 *PERSONALIDADE ALTERADA: ${p.emoji} ${p.rotulo.toUpperCase()}*\n\n` +
    `${preencher(getVoz(nova).persOk, { nome: nova.nome })}\n\n` +
    `_${preencher(getVoz(nova).exemplo, { nome: nova.nome })}_\n\n` +
    (nova.modo === 0 ? `⚠️ A IA está desligada neste grupo. Ligue com *${PREFIX}modoia 1*.` : `📣 Teste: _"${nova.nome}, me conta uma curiosidade!"_`)
  );
      }
