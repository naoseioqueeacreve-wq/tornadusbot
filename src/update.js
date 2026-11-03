import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs';
const execAsync = promisify(exec);

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);
  
  // ✅ NOME DE USUÁRIO CORRIGIDO AQUI ✅
  const usuario = 'naoseioqueeacreve-wq'; 
  
  // ⚠️ COLE O SEU NOVO TOKEN AQUI (apague o texto antigo) ⚠️
  const token = 'COLE_SEU_NOVO_TOKEN_AQUI'; 
  
  const repoUrl = `https://${usuario}:${token}@github.com/naoseioqueeacreve-wq/tornadusbot.git`;
  const branch = 'main';

  try {
    let isRepoValido = false;
    
    // 1. Verifica se o repositório existe e está saudável
    try {
      await execAsync('git rev-parse --is-inside-work-tree');
      await execAsync('git log -1'); 
      isRepoValido = true;
    } catch (e) {
      log('⚠️ Recriando repositório Git do zero para evitar erros...');
      if (fs.existsSync('./.git')) {
        await execAsync('rm -rf .git');
      }
      await execAsync('git init');
      isRepoValido = false; 
    }

    log('Baixando arquivos do GitHub...');
    await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} ${branch}`);
    
    log('Aplicando atualizações...');
    if (isRepoValido) {
       try { await execAsync('git stash push -u -m "auto-update-stash"'); } catch (e) {}
    }

    await execAsync('git reset --hard FETCH_HEAD');

    if (isRepoValido) {
       try { await execAsync('git stash pop'); } catch (e) {}
    }

    log('Verificando dependências...');
    await execAsync('npm install');

    log('Atualização concluída com sucesso!');
    return { sucesso: true, mensagem: '✅ Bot atualizado com sucesso para a versão mais recente!' };
  } catch (error) {
    log(`Erro na atualização: ${error.message}`);
    return { sucesso: false, mensagem: `❌ Erro ao atualizar: ${error.message}` };
  }
}
