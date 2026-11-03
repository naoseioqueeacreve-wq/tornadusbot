import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs';
import path from 'node:path';
const execAsync = promisify(exec);

// Função para copiar pastas/arquivos (Backup)
function copiar(src, dest) {
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}

// Função para deletar a pasta temporária
function deletar(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);
  
  const usuario = 'naoseioqueeacreve-wq'; 
  const token = 'COLE_SEU_TOKEN_AQUI'; // <-- COLOQUE SEU TOKEN AQUI
  const repoUrl = `https://${usuario}:${token}@github.com/naoseioqueeacreve-wq/tornadusbot.git`;
  const branch = 'main';

  // Lista de tudo que NÃO pode ser sobrescrito (Suas configurações e dados)
  const arquivosProtegidos = [
    'config.js',
    'src/config.js',
    'src/database',
    'database',
    'data',
    'session'
  ];

  const tempBackup = './temp_backup_update';

  try {
    // 1. FAZENDO BACKUP
    log('Fazendo backup das configurações e banco de dados...');
    deletar(tempBackup);
    for (const arq of arquivosProtegidos) {
      if (fs.existsSync(arq)) {
        copiar(arq, path.join(tempBackup, arq));
      }
    }

    // 2. VERIFICANDO GIT
    let isRepoValido = false;
    try {
      await execAsync('git rev-parse --is-inside-work-tree');
      await execAsync('git log -1'); 
      isRepoValido = true;
    } catch (e) {
      log('⚠️ Recriando repositório Git do zero...');
      if (fs.existsSync('./.git')) await execAsync('rm -rf .git');
      await execAsync('git init');
      isRepoValido = false; 
    }

    // 3. BAIXANDO ATUALIZAÇÕES
    log('Baixando arquivos do GitHub...');
    await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} ${branch}`);
    
    log('Aplicando atualizações...');
    if (isRepoValido) {
       try { await execAsync('git stash push -u -m "auto-update-stash"'); } catch (e) {}
    }

    // Força a atualização do código (isso apagaria as configs, mas nós já fizemos backup)
    await execAsync('git reset --hard FETCH_HEAD');
    await execAsync('git clean -fd'); // Remove arquivos novos indesejados

    if (isRepoValido) {
       try { await execAsync('git stash pop'); } catch (e) {}
    }

    // 4. RESTAURANDO BACKUP (O Segredo para não resetar)
    log('Restaurando suas configurações e banco de dados...');
    for (const arq of arquivosProtegidos) {
      const backupPath = path.join(tempBackup, arq);
      if (fs.existsSync(backupPath)) {
        copiar(backupPath, arq); // Copia de volta por cima do código novo
      }
    }
    deletar(tempBackup); // Limpa o backup temporário

    // 5. INSTALANDO DEPENDÊNCIAS
    log('Verificando dependências...');
    await execAsync('npm install');

    log('Atualização concluída com sucesso!');
    return { sucesso: true, mensagem: '✅ Bot atualizado com sucesso! Suas configurações foram mantidas.' };
  } catch (error) {
    log(`Erro na atualização: ${error.message}`);
    deletar(tempBackup); // Limpa backup se der erro
    return { sucesso: false, mensagem: `❌ Erro ao atualizar: ${error.message}` };
  }
      }
