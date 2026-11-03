import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);

  try {
    const simpleGitModule = await import('simple-git');
    const simpleGit = simpleGitModule.default || simpleGitModule.simpleGit || simpleGitModule;
    
    let git = typeof simpleGit === 'function' ? simpleGit() : simpleGit.default();

    // 1. Verifica se o Git está inicializado
    let isRepo = false;
    try {
      await git.status();
      isRepo = true;
    } catch (e) {
      if (e.message.includes('not a git repository')) {
        log('⚠️ Repositório Git não encontrado. Inicializando...');
        await execAsync('git init');
        await execAsync('git remote add origin https://github.com/naoseioqueacreeve-wq/tornadusbot.git');
        await execAsync('git branch -M main');
        
        // Reconecta a instância do simple-git após o init
        git = typeof simpleGit === 'function' ? simpleGit() : simpleGit.default();
        
        log('Baixando o repositório pela primeira vez...');
        await execAsync('git fetch origin main');
        await execAsync('git reset --hard origin/main');
        isRepo = true;
      } else {
        throw e;
      }
    }

    if (isRepo) {
      log('Verificando se há alterações locais...');
      const status = await git.status();
      const hasChanges = status.files.length > 0;

      if (hasChanges) {
        log('Salvando alterações locais (stash)...');
        await git.stash(['push', '--include-untracked']); 
      }

      log('Baixando atualizações do GitHub...');
      await git.pull('origin', 'main', { '--ff-only': null });

      if (hasChanges) {
        try {
          await git.stash(['pop']);
        } catch (conflictError) {
          log('Conflito. Mantendo a versão mais nova do GitHub.');
          await git.checkout(['--', '.']); 
        }
      }
    }

    log('Verificando dependências...');
    await execAsync('npm install');

    return { sucesso: true, mensagem: '✅ Bot atualizado com sucesso!' };
  } catch (error) {
    log(`Erro na atualização: ${error.message}`);
    return { sucesso: false, mensagem: `❌ Erro ao atualizar: ${error.message}` };
  }
}
