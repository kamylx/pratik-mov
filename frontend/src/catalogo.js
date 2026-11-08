// Identidade visual de cada tipo de treino e categoria de pessoa.
export const OBJETIVOS = {
  Fortalecimento: { cor: '#A78BFA', icone: 'forca', descricao: 'Força para o dia a dia' },
  Hipertrofia: { cor: '#F472B6', icone: 'musculo', descricao: 'Ganho de massa muscular' },
  Emagrecimento: { cor: '#FB923C', icone: 'fogo', descricao: 'Gasto calórico e composição' },
  Equilíbrio: { cor: '#2DD4BF', icone: 'equilibrio', descricao: 'Estabilidade e prevenção de quedas' },
  Mobilidade: { cor: '#60A5FA', icone: 'mobilidade', descricao: 'Amplitude e flexibilidade' },
  Condicionamento: { cor: '#FACC15', icone: 'coracao', descricao: 'Fôlego e resistência' },
  Desempenho: { cor: '#F87171', icone: 'raio', descricao: 'Potência e rendimento esportivo' },
};
export const LISTA_OBJETIVOS = Object.keys(OBJETIVOS);

export const CATEGORIAS = {
  idoso: { rotulo: 'Idoso', icone: 'idoso', descricao: '60 anos ou mais' },
  adulto: { rotulo: 'Adulto', icone: 'adulto', descricao: 'Público geral' },
  atleta: { rotulo: 'Atleta', icone: 'atleta', descricao: 'Treino esportivo' },
  crianca: { rotulo: 'Criança ou adolescente', curto: 'Jovem', icone: 'crianca', descricao: 'Até 17 anos' },
  gestante: { rotulo: 'Gestante', icone: 'gestante', descricao: 'Com liberação médica' },
  reabilitacao: { rotulo: 'Reabilitação', icone: 'reabilitacao', descricao: 'Pós-lesão ou cirurgia' },
};
export const LISTA_CATEGORIAS = Object.keys(CATEGORIAS);

export const corDe = (objetivo) => OBJETIVOS[objetivo]?.cor ?? '#A78BFA';

// Estilo de fundo/borda de um elemento tingido pela cor do treino.
export const tinta = (objetivo, intensidade = 0.14) => {
  const hex = corDe(objetivo).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return { '--cor': corDe(objetivo), '--cor-fundo': `rgba(${r}, ${g}, ${b}, ${intensidade})`, '--cor-borda': `rgba(${r}, ${g}, ${b}, 0.35)` };
};
