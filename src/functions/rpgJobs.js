// =========================================
// EMPREGOS COM PROGRESSÃO
// =========================================
// Cada usuário começa no nível 1 (Estagiário)
// e vai subindo conforme trabalha.

export const CARGOS = [
  { nivel: 1,  nome: 'Estagiário',       salario: 50,    trabalhosNecessarios: 5 },
  { nivel: 2,  nome: 'Atendente',        salario: 120,   trabalhosNecessarios: 10 },
  { nivel: 3,  nome: 'Auxiliar',         salario: 250,   trabalhosNecessarios: 15 },
  { nivel: 4,  nome: 'Assistente',       salario: 400,   trabalhosNecessarios: 20 },
  { nivel: 5,  nome: 'Analista',         salario: 600,   trabalhosNecessarios: 25 },
  { nivel: 6,  nome: 'Coordenador',      salario: 900,   trabalhosNecessarios: 30 },
  { nivel: 7,  nome: 'Supervisor',       salario: 1200,  trabalhosNecessarios: 40 },
  { nivel: 8,  nome: 'Gerente',          salario: 1600,  trabalhosNecessarios: 50 },
  { nivel: 9,  nome: 'Diretor',          salario: 2200,  trabalhosNecessarios: 60 },
  { nivel: 10, nome: 'Vice-Presidente',  salario: 3000,  trabalhosNecessarios: 80 },
  { nivel: 11, nome: 'Presidente',       salario: 4500,  trabalhosNecessarios: 100 },
  { nivel: 12, nome: 'CEO',              salario: 7000,  trabalhosNecessarios: 999 },
  { nivel: 13, nome: 'Magnata',          salario: 10000, trabalhosNecessarios: 999 },
  { nivel: 14, nome: 'Bilionário',       salario: 15000, trabalhosNecessarios: 999 },
  { nivel: 15, nome: 'Lendário',         salario: 25000, trabalhosNecessarios: 999 }
];

// =========================================
// FOTOS POR CARGO (usadas no !trabalhar)
// =========================================
export const FOTOS_CARGOS = {
  1:  'https://i.imgur.com/0kGR8km.jpeg',
  2:  'https://i.imgur.com/X3oVvBp.jpeg',
  3:  'https://i.imgur.com/q8zHt7M.jpeg',
  4:  'https://i.imgur.com/xJd7GkL.jpeg',
  5:  'https://i.imgur.com/2mR1w8z.jpeg',
  6:  'https://i.imgur.com/YbH5Q8r.jpeg',
  7:  'https://i.imgur.com/0kGR8km.jpeg',
  8:  'https://i.imgur.com/X3oVvBp.jpeg',
  9:  'https://i.imgur.com/q8zHt7M.jpeg',
  10: 'https://i.imgur.com/xJd7GkL.jpeg',
  11: 'https://i.imgur.com/2mR1w8z.jpeg',
  12: 'https://i.imgur.com/YbH5Q8r.jpeg',
  13: 'https://i.imgur.com/0kGR8km.jpeg',
  14: 'https://i.imgur.com/X3oVvBp.jpeg',
  15: 'https://i.imgur.com/q8zHt7M.jpeg'
};

// =========================================
// RETORNA O CARGO PELO NÍVEL
// =========================================
export function getCargo(nivel) {
  return CARGOS.find(c => c.nivel === nivel) || CARGOS[0];
}

// =========================================
// RETORNA O PRÓXIMO CARGO
// =========================================
export function getProximoCargo(nivel) {
  return CARGOS.find(c => c.nivel === nivel + 1) || null;
}

// =========================================
// CASAS
// =========================================
export const CASAS = {
  barraco: { nome: 'Barraco',  preco: 0,     bonusPets: 1, foto: 'https://i.imgur.com/0kGR8km.jpeg' },
  kitnet:  { nome: 'Kitnet',   preco: 2000,  bonusPets: 2, foto: 'https://i.imgur.com/X3oVvBp.jpeg' },
  casa:    { nome: 'Casa',     preco: 8000,  bonusPets: 3, foto: 'https://i.imgur.com/q8zHt7M.jpeg' },
  mansao:  { nome: 'Mansão',   preco: 25000, bonusPets: 4, foto: 'https://i.imgur.com/xJd7GkL.jpeg' },
  castelo: { nome: 'Castelo',  preco: 80000, bonusPets: 5, foto: 'https://i.imgur.com/2mR1w8z.jpeg' }
};

// =========================================
// PETS
// =========================================
export const PETS = {
  cachorro:  { nome: 'Cachorro',  emoji: '🐶', preco: 500, hp: 100, atk: 15, def: 10, foto: 'https://i.imgur.com/YbH5Q8r.jpeg' },
  gato:      { nome: 'Gato',      emoji: '🐱', preco: 500, hp: 90,  atk: 18, def: 8,  foto: 'https://i.imgur.com/0kGR8km.jpeg' },
  coelho:    { nome: 'Coelho',    emoji: '🐰', preco: 400, hp: 80,  atk: 12, def: 12, foto: 'https://i.imgur.com/X3oVvBp.jpeg' },
  passaro:   { nome: 'Pássaro',   emoji: '🐦', preco: 600, hp: 70,  atk: 22, def: 6,  foto: 'https://i.imgur.com/q8zHt7M.jpeg' },
  peixe:     { nome: 'Peixe',     emoji: '🐟', preco: 300, hp: 60,  atk: 8,  def: 20, foto: 'https://i.imgur.com/xJd7GkL.jpeg' },
  hamster:   { nome: 'Hamster',   emoji: '🐹', preco: 450, hp: 85,  atk: 14, def: 10, foto: 'https://i.imgur.com/2mR1w8z.jpeg' },
  tartaruga: { nome: 'Tartaruga', emoji: '🐢', preco: 700, hp: 120, atk: 10, def: 25, foto: 'https://i.imgur.com/YbH5Q8r.jpeg' },
  papagaio:  { nome: 'Papagaio',  emoji: '🦜', preco: 800, hp: 75,  atk: 25, def: 8,  foto: 'https://i.imgur.com/0kGR8km.jpeg' }
};
