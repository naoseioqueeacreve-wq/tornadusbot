import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = './src/database/antiflood.json';

// Configurações padrão
const PADRAO = {
  ativo: true,
  delay: 5,      // segundos
  limite: 3,     // comandos por minuto
  janela: 60     // segundos (fixo)
};

// Garante que o arquivo existe
function garantir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(PADRAO, null, 2));
  }
}

// Lê as configurações
export function lerConfig() {
  garantir();
  try {
    const dados = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return {
      ativo: dados.ativo !== false,
      delay: typeof dados.delay === 'number' ? dados.delay : PADRAO.delay,
      limite: typeof dados.limite === 'number' ? dados.limite : PADRAO.limite,
      janela: PADRAO.janela
    };
  } catch {
    return { ...PADRAO };
  }
}

// Salva as configurações
export function salvarConfig(novas) {
  garantir();
  const atual = lerConfig();
  const final = { ...atual, ...novas };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(final, null, 2));
  return final;
}

// Atalhos
export function getDelay() { return lerConfig().delay; }
export function getLimite() { return lerConfig().limite; }
export function isAtivo() { return lerConfig().ativo; }

export function setDelay(valor) { return salvarConfig({ delay: valor }); }
export function setLimite(valor) { return salvarConfig({ limite: valor }); }
export function setAtivo(valor) { return salvarConfig({ ativo: valor === true }); }
