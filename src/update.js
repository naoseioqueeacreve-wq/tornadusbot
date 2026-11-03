import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs';
import path from 'node:path';
const execAsync = promisify(exec);

function copiar(src, dest) {
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  }
}

function deletar(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

export async function atualizarBot() {
  const log = (msg) => console.log(`[UPDATE] ${msg}`);
  
  const usuario = 'naoseioqueeacreve-wq'; 
  const token = process.env.GITHUB_TOKEN || 'COLE_SEU_TOKEN_AQUI'; 
  const repoUrl = `https://${usuario}:${token}@github.com/naoseioqueeacreve-wq/tornadusbot.git`;
  const branch = 'main';

  const arquivosProtegidos = [
    'config.js', 'src/config.js', 'src/database', 'database', 'data', 'session'
  ];

  const tempBackup = './temp_backup_update';

  try {
    // 1. FAZ BACKUP
    log('Fazendo backup das configurações...');
    deletar(tempBackup);
    for (const arq of arquivosProtegidos) {
      if (fs.existsSync(arq)) copiar(arq, path.join(tempBackup, arq));
    }

    // 2. FORÇA O DOWNLOAD DO GITHUB (Ignorando conflitos locais)
    log('Baixando atualizações do GitHub (Forçando código novo)...');
    
    // Se a pasta .git estiver uma bagunça (unmerged), apaga tudo para começar do zero
    if (fs.existsSync('./.git')) {
       try {
         await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} ${branch}`);
         // O reset --hard ignora completamente os erros de unmerged e force o código do GitHub
         await execAsync('git reset --hard FETCH_HEAD'); 
         // Limpa arquivos que sobraram (mas preserva a pasta de backup)
         await execAsync('git clean -fd -e temp_backup_update'); 
       } catch (e) {
         log('⚠️ Repositório local corrompido. Recriando do zero...');
         await execAsync('rm -rf .git');
         await execAsync('git init');
         await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} ${branch}`);
         await execAsync('git reset --hard FETCH_HEAD');
       }
    } else {
       await execAsync('git init');
       await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} ${branch}`);
       await execAsync('git reset --hard FETCH_HEAD');
    }

    // 3. RESTAURA BACKUP
    log('Restaurando suas configurações...');
    for (const arq of arquivosProtegidos) {
      const backupPath = path.join(tempBackup, arq);
      if (fs.existsSync(backupPath)) copiar(backupPath, arq);
    }
    deletar(tempBackup);

    // 4. INSTALA DEPENDÊNCIAS
    log('Verificando dependências...');
    await execAsync('npm install');

    log('Atualização concluída!');
    return { sucesso: true, mensagem: '✅ Bot atualizado com sucesso! Configurações mantidas.' };
  } catch (error) {
    log(`Erro na atualização: ${error.message}`);
    deletar(tempBackup);
    return { sucesso: false, mensagem: `❌ Erro: ${error.message}` };
  }
}
