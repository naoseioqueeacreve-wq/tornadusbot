import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs';
const execAsync = promisify(exec);

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);
  const repoUrl = 'https://github.com/naoseioqueacreeve-wq/tornadusbot.git';

  try {
    let isRepoValido = false;
    
    // 1. Testa se o repositório Git está saudável
    try {
      await execAsync('git rev-parse --is-inside-work-tree');
      await execAsync('git log -1'); // Verifica se tem pelo menos 1 commit baixado
      isRepoValido = true;
    } catch (e) {
      log('⚠️ Repositório Git não encontrado ou corrompido. Recriando do zero...');
      
      // Apaga a pasta .git "meia-boca" que foi criada antes
      if (fs.existsSync('./.git')) {
        await execAsync('rm -rf .git');
      }
      
      // Inicia e baixa tudo limpo
      await execAsync('git init');
      await execAsync(`git remote add origin ${repoUrl}`);
      await execAsync('git branch -M main');
      await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch origin main`); // O GIT_TERMINAL_PROMPT=0 impede que peça senha
      await execAsync('git reset --hard origin/main');
      isRepoValido = true;
    }

    if (isRepoValido) {
      log('Salvando alterações locais temporariamente...');
      try {
        // Salva o que você tiver alterado localmente
        await execAsync('git stash push -u -m "auto-update-stash"');
      } catch (err) {
        // Se não tiver nada para salvar, ignora
      }

      log('Baixando atualizações do GitHub...');
      try {
        await execAsync(`GIT_TERMINAL_PROMPT=0 git pull origin main --ff-only`);
      } catch (pullError) {
        log('Conflito detectado. Forçando atualização para a versão do GitHub...');
        await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch origin main`);
        await execAsync(`git reset --hard origin/main`);
      }

      log('Restaurando suas alterações locais...');
      try {
        await execAsync('git stash pop');
      } catch (err) {
        log('Nenhuma alteração local para restaurar (ou conflito resolvido).');
      }
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
