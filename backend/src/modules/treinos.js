// Catálogo de categorias de pessoa, tipos de treino e modelos de plano sugeridos.
// Os modelos são pontos de partida: o aluno ajusta com o supervisor.

const CATEGORIAS = {
  idoso: { rotulo: 'Idoso', intensidade: 'leve' },
  adulto: { rotulo: 'Adulto', intensidade: 'moderada' },
  atleta: { rotulo: 'Atleta', intensidade: 'alta' },
  crianca: { rotulo: 'Criança ou adolescente', intensidade: 'leve' },
  gestante: { rotulo: 'Gestante', intensidade: 'leve' },
  reabilitacao: { rotulo: 'Reabilitação', intensidade: 'leve' },
};

const OBJETIVOS = [
  'Fortalecimento', 'Hipertrofia', 'Emagrecimento', 'Equilíbrio',
  'Mobilidade', 'Condicionamento', 'Desempenho',
];

// Cada atividade tem o detalhe por intensidade: [leve, moderada, alta].
const BASE = {
  Fortalecimento: {
    frequencia: '3x por semana',
    atividades: [
      ['Aquecimento articular', ['8 min', '6 min', '5 min']],
      ['Sentar e levantar da cadeira', ['3x10 com apoio', '3x15', '4x20 com carga']],
      ['Remada com elástico', ['3x12 elástico leve', '3x15 elástico médio', '4x12 elástico forte']],
      ['Elevação de calcanhar', ['3x12 com apoio', '3x15', '4x20 unilateral']],
      ['Prancha', ['3x15 s apoiada nos joelhos', '3x30 s', '4x45 s']],
      ['Alongamento final', ['5 min', '5 min', '5 min']],
    ],
  },
  Hipertrofia: {
    frequencia: '4x por semana',
    atividades: [
      ['Aquecimento', ['8 min', '8 min', '8 min']],
      ['Agachamento', ['3x12 com peso corporal', '4x10', '4x8 carga alta']],
      ['Supino ou flexão de braço', ['3x10 flexão inclinada', '4x10', '4x8 carga alta']],
      ['Remada curvada', ['3x12', '4x10', '4x8 carga alta']],
      ['Levantamento terra romeno', ['3x12 leve', '4x10', '4x8']],
      ['Desenvolvimento de ombros', ['3x12 leve', '3x12', '4x10']],
    ],
  },
  Emagrecimento: {
    frequencia: '4x por semana',
    atividades: [
      ['Caminhada', ['20 min ritmo leve', '25 min ritmo moderado', '30 min com tiros']],
      ['Circuito de corpo inteiro', ['2 voltas, 30 s cada', '3 voltas, 40 s cada', '4 voltas, 45 s cada']],
      ['Agachamento', ['2x12', '3x15', '4x20']],
      ['Polichinelo ou marcha', ['2x30 s marcha', '3x40 s', '4x45 s']],
      ['Volta à calma', ['5 min', '5 min', '5 min']],
    ],
  },
  Equilíbrio: {
    frequencia: '3x por semana',
    atividades: [
      ['Marcha estacionária', ['2 min com apoio', '2 min', '3 min olhos fechados']],
      ['Apoio unipodal', ['3x15 s com apoio', '3x30 s', '3x45 s em superfície instável']],
      ['Caminhada em linha reta', ['3x5 m com apoio', '3x10 m', '3x10 m de costas']],
      ['Transferência de peso', ['2x10', '3x12', '3x15 com alcance']],
      ['Sentar e levantar', ['2x8 com apoio', '3x12', '3x15 sem as mãos']],
    ],
  },
  Mobilidade: {
    frequencia: '3x por semana',
    atividades: [
      ['Mobilidade de coluna', ['2x8 sentado', '3x10', '3x12']],
      ['Rotação de ombros', ['2x10', '3x12', '3x15 com bastão']],
      ['Mobilidade de quadril', ['2x8', '3x10', '3x12']],
      ['Alongamento de posteriores', ['2x20 s', '3x30 s', '3x45 s']],
      ['Respiração e relaxamento', ['5 min', '5 min', '5 min']],
    ],
  },
  Condicionamento: {
    frequencia: '3x por semana',
    atividades: [
      ['Caminhada ou bicicleta', ['15 min leve', '25 min moderado', '35 min com intervalos']],
      ['Circuito funcional', ['2 voltas', '3 voltas', '4 voltas']],
      ['Subida de degrau', ['2x10 com apoio', '3x15', '4x20']],
      ['Volta à calma', ['5 min', '5 min', '5 min']],
    ],
  },
  Desempenho: {
    frequencia: '5x por semana',
    atividades: [
      ['Aquecimento específico', ['10 min', '10 min', '12 min']],
      ['Pliometria', ['2x6 saltos baixos', '3x8', '4x10']],
      ['Sprints', ['4x20 m', '6x30 m', '8x40 m']],
      ['Força de membros inferiores', ['3x10', '4x8', '5x5 carga alta']],
      ['Core', ['3x20 s', '3x40 s', '4x60 s']],
      ['Recuperação ativa', ['8 min', '8 min', '10 min']],
    ],
  },
};

const NIVEL = { leve: 0, moderada: 1, alta: 2 };

const AVISOS = {
  idoso: 'Priorize segurança: apoio por perto, progressão lenta e atenção a tontura.',
  gestante: 'Evite exercícios deitada de barriga para cima após o 1º trimestre e impacto alto; siga a liberação médica.',
  reabilitacao: 'Respeite a liberação do fisioterapeuta ou médico e a dor como limite.',
  crianca: 'Use atividades lúdicas e evite cargas máximas.',
  atleta: 'Ajuste volume e intensidade ao calendário de competições.',
};

function modelo(categoria, objetivo) {
  const base = BASE[objetivo];
  const cat = CATEGORIAS[categoria];
  if (!base || !cat) return null;
  const n = NIVEL[cat.intensidade];
  return {
    categoria, objetivo,
    intensidade: cat.intensidade,
    frequencia: base.frequencia,
    aviso: AVISOS[categoria] ?? null,
    atividades: base.atividades.map(([nome, detalhes]) => ({ nome, detalhe: detalhes[n] })),
  };
}

module.exports = { CATEGORIAS, CHAVES_CATEGORIAS: Object.keys(CATEGORIAS), OBJETIVOS, modelo };
