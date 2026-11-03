import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);
  
  // URL do seu repositório
  const repoUrl = 'https://github.com/naoseioqueacreeve-wq/tornadusbot.git';

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
        
        // O SEGREDO ESTÁ AQUI: Evita que o git peça senha e trave o terminal
        await execAsync(`GIT_TERMINAL_PROMPT=0 git remote add origin ${repoUrl}`);
        await execAsync('git branch -M main');
        
        git = typeof simpleGit === 'function' ? simpleGit() : simpleGit.default();
        
        log('Baixando o repositório pela primeira vez...');
        // Força o download sem pedir credenciais
        await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} main`);
        await execAsync('git reset --hard FETCH_HEAD');
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
      await execAsync(`GIT_TERMINAL_PROMPT=0 git pull ${repoUrl} main`);

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
    // Se der erro de autenticação, avisa o dono
    if (error.message.includes('Authentication failed') || error.message.includes('could not read Username')) {
      return { sucesso: false, mensagem: `❌ Erro: O repositório está PRIVADO. Mude para Público no GitHub ou use um Token.` };
    }
    return { sucesso: false, mensagem: `❌ Erro ao atualizar: ${error.message}` };
  }
}
