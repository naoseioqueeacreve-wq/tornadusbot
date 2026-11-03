import simpleGit from 'simple-git'; // Importação corrigida e direta
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);

  try {
    // Agora chamamos a função diretamente
    const git = simpleGit();

    log('Verificando se há alterações locais...');
    const status = await git.status();
    const hasChanges = status.files.length > 0;

    if (hasChanges) {
      log('Salvando alterações locais temporariamente (stash)...');
      await git.stash(['push', '--include-untracked']); 
    }

    log('Baixando atualizações do GitHub...');
    await git.pull('origin', 'main', { '--ff-only': null });

    if (hasChanges) {
      log('Restaurando suas alterações locais...');
      try {
        await git.stash(['pop']);
      } catch (conflictError) {
        log('Conflito ao restaurar. Mantendo o código mais novo do GitHub.');
        await git.checkout(['--', '.']); 
      }
    }

    log('Verificando se há novas dependências...');
    await execAsync('npm install');

    log('Atualização concluída com sucesso!');
    return { sucesso: true, mensagem: '✅ Bot atualizado com sucesso para a versão mais recente!' };
  } catch (error) {
    log(`Erro na atualização: ${error.message}`);
    return { sucesso: false, mensagem: `❌ Erro ao atualizar: ${error.message}` };
  }
}
