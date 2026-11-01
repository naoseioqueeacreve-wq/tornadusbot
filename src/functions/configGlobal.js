import fs from 'node:fs';
import path from 'node:path';

const CONFIG_PATH = './src/database/config_global.json';

const PADRAO = {
  canal: null,
  fotosComandos: {}  // Ex: { "menu": "./src/assets/cmdfotos/menu.jpg" }
};

function garantir() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(PADRAO, null, 2));
  }
}

export function lerConfigGlobal() {
  garantir();
  try {
    const dados = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return {
      canal: dados.canal || null,
      fotosComandos: dados.fotosComandos || {}
    };
  } catch {
    return { canal: null, fotosComandos: {} };
  }
}

export function salvarConfigGlobal(novas) {
  garantir();
  const atual = lerConfigGlobal();
  const final = { ...atual, ...novas };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(final, null, 2));
  return final;
}

// =========================================
// CANAL
// =========================================
export function getCanal() {
  return lerConfigGlobal().canal;
}

export function setCanal(canal) {
  return salvarConfigGlobal({ canal });
}

export function removerCanal() {
  return salvarConfigGlobal({ canal: null });
}

// =========================================
// FOTOS POR COMANDO
// =========================================
export function getFotoComando(comando) {
  const config = lerConfigGlobal();
  return config.fotosComandos[comando] || null;
}

export function setFotoComando(comando, caminho) {
  const config = lerConfigGlobal();
  config.fotosComandos[comando] = caminho;
  salvarConfigGlobal({ fotosComandos: config.fotosComandos });
  return config.fotosComandos;
}

export function removerFotoComando(comando) {
  const config = lerConfigGlobal();
  delete config.fotosComandos[comando];
  salvarConfigGlobal({ fotosComandos: config.fotosComandos });
  return config.fotosComandos;
}
