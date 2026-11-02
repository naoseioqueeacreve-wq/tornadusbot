import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// =========================================
// PASTA DAS INTERAÇÕES
// =========================================
const PASTA_INTERACOES = './src/assets/interacoes';
const PASTA_TEMP = './src/assets/temp';

// Extensões suportadas
const EXTENSOES = ['.gif', '.jpg', '.jpeg', '.png', '.webp'];

// =========================================
// GARANTE QUE A PASTA TEMP EXISTE
// =========================================
function garantirTemp() {
  if (!fs.existsSync(PASTA_TEMP)) {
    fs.mkdirSync(PASTA_TEMP, { recursive: true });
  }
}

// =========================================
// BUSCA O ARQUIVO DE MÍDIA
// =========================================
export function buscarMidia(nome) {
  if (!fs.existsSync(PASTA_INTERACOES)) return null;

  for (const ext of EXTENSOES) {
    const caminho = path.join(PASTA_INTERACOES, `${nome}${ext}`);
    if (fs.existsSync(caminho)) {
      return {
        caminho,
        buffer: fs.readFileSync(caminho),
        ehGif: ext === '.gif',
        ext
      };
    }
  }
  return null;
}

// =========================================
// CONVERTE GIF PARA MP4 (usando ffmpeg)
// =========================================
async function converterGifParaMp4(caminhoGif) {
  garantirTemp();

  const nomeBase = path.basename(caminhoGif, '.gif');
  const caminhoMp4 = path.join(PASTA_TEMP, `${nomeBase}_${Date.now()}.mp4`);

  try {
    // Comando ffmpeg para converter GIF em MP4
    const cmd = `ffmpeg -i "${caminhoGif}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${caminhoMp4}" -y -loglevel quiet`;

    await execAsync(cmd, { timeout: 60000 });

    if (fs.existsSync(caminhoMp4)) {
      return caminhoMp4;
    }
    return null;

  } catch (error) {
    console.error('[MIDIA] Erro ao converter GIF:', error.message);
    return null;
  }
}

// =========================================
// ENVIA A MÍDIA (imagem ou gif convertido)
// =========================================
export async function enviarMidia(client, jid, nome, legenda, mentions = [], quoted = null) {
  const midia = buscarMidia(nome);

  // Se encontrou a mídia local
  if (midia) {
    // Se for GIF, converte para MP4
    if (midia.ehGif) {
      try {
        const caminhoMp4 = await converterGifParaMp4(midia.caminho);

        if (caminhoMp4) {
          const bufferMp4 = fs.readFileSync(caminhoMp4);

          await client.sendMessage(jid, {
            video: bufferMp4,
            gifPlayback: true,
            caption: legenda,
            mentions
          }, { quoted });

          // Remove o arquivo temporário
          try { fs.unlinkSync(caminhoMp4); } catch (e) {}

          return;
        }
      } catch (error) {
        console.error('[MIDIA] Erro no envio do GIF:', error.message);
      }
    } else {
      // Imagem → envia como foto
      return client.sendMessage(jid, {
        image: midia.buffer,
        caption: legenda,
        mentions
      }, { quoted });
    }
  }

  // Sem mídia local OU conversão falhou → envia só texto
  return client.sendMessage(jid, {
    text: legenda,
    mentions
  }, { quoted });
}

// =========================================
// LISTA AS MÍDIAS DISPONÍVEIS
// =========================================
export function listarMidias() {
  if (!fs.existsSync(PASTA_INTERACOES)) return [];

  const arquivos = fs.readdirSync(PASTA_INTERACOES);
  return arquivos.filter(a => EXTENSOES.some(e => a.endsWith(e)));
}
