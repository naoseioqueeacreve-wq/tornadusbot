import { API_KEY } from '../config.js';

// Endpoint base da API da Bronxys
const API_BASE = 'https://api.bronxyshost.com.br/api-bronxys';

// Função genérica para chamar qualquer endpoint da Bronxys
export async function chamarAPI(endpoint, parametros = {}) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  url.searchParams.set('apikey', API_KEY);

  for (const [chave, valor] of Object.entries(parametros)) {
    url.searchParams.set(chave, valor);
  }

  try {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    return { ok: true, data: dados };
  } catch (error) {
    console.error(`[API] Erro em ${endpoint}:`, error.message);
    return { ok: false, error: error.message };
  }
}
