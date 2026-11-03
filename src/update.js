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
    log('Fazendo backup das configurações...');
    deletar(tempBackup);
    for (const arq of arquivosProtegidos) {
      if (fs.existsSync(arq)) copiar(arq, path.join(tempBackup, arq));
    }

    log('Baixando arquivos do GitHub...');
    if (fs.existsSync('./.git')) {
       try {
         await execAsync(`GIT_TERMINAL_PROMPT=0 git fetch ${repoUrl} ${branch}`);
         await execAsync('git reset --hard FETCH_HEAD');
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

    // 📝 AQUI ELE PEGA AS NOVIDADES
    log('Buscando o que mudou...');
    let novidades = "Nenhuma alteração recente encontrada.";
    try {
      const { stdout } = await execAsync('git log -n 5 --pretty=format:"- %s"');
      if (stdout.trim()) novidades = stdout.trim();
    } catch (e) {
      log('Não foi possível ler o histórico.');
    }

    log('Restaurando suas configurações...');
    for (const arq of arquivosProtegidos) {
      const backupPath = path.join(tempBackup, arq);
      if (fs.existsSync(backupPath)) copiar(backupPath, arq);
    }
    deletar(tempBackup);

    log('Verificando dependências...');
    await execAsync('npm install');

    log('Atualização concluída!');
    
    // Retorna a mensagem com as novidades formatadas
    return { 
      sucesso: true, 
      mensagem: `✅ *BOT ATUALIZADO COM SUCESSO!*\n\n📝 *O que há de novo (Últimos commits):*\n\n${novidades}\n\n♻️ Reiniciando para aplicar...` 
    };
  } catch (error) {
    log(`Erro na atualização: ${error.message}`);
    deletar(tempBackup);
    return { sucesso: false, mensagem: `❌ Erro: ${error.message}` };
  }
}
