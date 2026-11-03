import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs';
const execAsync = promisify(exec);

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);
  
  // Link direto do seu repositório público
  const repoUrl = 'https://github.com/naoseioqueacreeve-wq/tornadusbot.git';
  const branch = 'main';

  try {
    let isRepoValido = false;
    
    // 1. Verifica se o repositório já existe e está saudável
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
      isRepoValido = false; // Força o download limpo
    }

    log('Baixando arquivos do GitHub...');
    // O SEGREDO ESTÁ AQUI: Usar o link direto em vez do 'origin'
    // O GIT_TERMINAL_PROMPT=0 garante que ele não vai travar pedindo senha
    await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} ${branch}`);
    
    log('Aplicando atualizações...');
    // Se já existia um código rodando, salva suas alterações locais
    if (isRepoValido) {
       try { await execAsync('git stash push -u -m "auto-update-stash"'); } catch (e) {}
    }

    // Aplica a versão mais nova que acabou de ser baixada
    await execAsync('git reset --hard FETCH_HEAD');

    // Restaura as alterações locais (se houver)
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
