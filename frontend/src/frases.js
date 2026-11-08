// Monta o texto do relatório em primeira pessoa, como o estagiário escreveria.
// As frases variam entre as pessoas e os números até dez saem por extenso.

const num = (v) => String(Math.round(Number(v) * 10) / 10).replace('.', ',');
const escolher = (opcoes, i) => opcoes[((i % opcoes.length) + opcoes.length) % opcoes.length];
const juntar = (itens) => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}`);

const EXTENSO_M = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
const EXTENSO_F = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
// "cinco sessões", "uma sessão", "12 sessões"
export const qtd = (q, um, varios, feminino = false) =>
  `${q <= 10 ? (feminino ? EXTENSO_F : EXTENSO_M)[q] : q} ${q === 1 ? um : varios}`;

// Nomes neutros de cada público (evita "acompanhado(a)").
const PUBLICO = {
  idoso: { um: 'pessoa idosa', varios: 'pessoas idosas', f: true },
  adulto: { um: 'adulto', varios: 'adultos', f: false },
  atleta: { um: 'atleta', varios: 'atletas', f: false },
  crianca: { um: 'jovem', varios: 'jovens', f: false },
  gestante: { um: 'gestante', varios: 'gestantes', f: true },
  reabilitacao: { um: 'pessoa em reabilitação', varios: 'pessoas em reabilitação', f: true },
};
const publico = (c) => PUBLICO[c] ?? PUBLICO.adulto;

// [campo, nome do teste, unidade, o que a melhora mostra]
const TESTES = [
  ['sentar_levantar', 'sentar e levantar', 'repetições', 'mais força nas pernas'],
  ['caminhada_6min_m', 'caminhada de 6 minutos', 'metros', 'um condicionamento melhor'],
  ['sentar_alcancar', 'sentar e alcançar', 'cm', 'mais flexibilidade'],
];
// esforço como substantivo: "o esforço foi moderado"
const esforcoTexto = (m) => { const v = Number(m); return v <= 2 ? 'muito leve' : v <= 4 ? 'leve' : v <= 6 ? 'moderado' : v <= 8 ? 'intenso' : 'muito intenso'; };
const LIGACOES = ['sinal de', 'o que mostra', 'indicando', 'o que reflete'];

export function agrupar(pessoas, campo) {
  const m = new Map();
  for (const p of pessoas) m.set(p[campo], (m.get(p[campo]) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function nivelEsforco(m, singular = false) {
  const v = Number(m);
  const [s, p] = v <= 2 ? ['muito leve', 'muito leves'] : v <= 4 ? ['leve', 'leves'] : v <= 6 ? ['moderada', 'moderadas'] : v <= 8 ? ['intensa', 'intensas'] : ['muito intensa', 'muito intensas'];
  return singular ? s : p;
}

const sessoesTexto = (q) => (q === 1 ? 'uma sessão' : qtd(q, 'sessão', 'sessões', true));

// ---------- Visão geral ----------
export function frasesResumo(pessoas, totalSessoes) {
  if (!pessoas.length) return ['Não houve atendimentos individuais registrados neste período.'];
  const frases = [`Neste período, acompanhei ${qtd(pessoas.length, 'pessoa', 'pessoas', true)} em atendimentos individuais, ao longo de ${sessoesTexto(totalSessoes)}.`];

  const grupos = agrupar(pessoas, 'categoria');
  if (grupos.length > 1) {
    const partes = grupos.map(([c, q]) => qtd(q, publico(c).um, publico(c).varios, publico(c).f));
    frases.push(`O grupo foi bem variado: ${juntar(partes)}, o que me fez adaptar os treinos a cada perfil.`);
  } else {
    frases.push(`Todas eram ${publico(grupos[0][0]).varios}.`);
  }

  const treinos = agrupar(pessoas, 'objetivo').map(([o]) => o.toLowerCase());
  frases.push(treinos.length > 1
    ? `Os treinos tiveram objetivos diferentes, como ${juntar(treinos.slice(0, 3))}${treinos.length > 3 ? ', entre outros' : ''}.`
    : `O foco dos treinos foi ${treinos[0]}.`);
  return frases;
}

// ---------- Evolução ----------
function comparar(ini, fim) {
  const resultados = [];
  for (const [campo, nome, unidade, significado] of TESTES) {
    if (ini?.[campo] == null || fim?.[campo] == null) continue;
    const a = Number(ini[campo]), b = Number(fim[campo]);
    resultados.push({ nome, unidade, significado, a, b, sentido: Math.sign(b - a) });
  }
  return resultados;
}

function textoEvolucao(r, i, completo) {
  const melhoras = r.filter((x) => x.sentido > 0);
  const quedas = r.filter((x) => x.sentido < 0);
  const frases = [];
  if (melhoras.length) {
    const [m, ...resto] = melhoras;
    const abertura = escolher(['Da primeira para a última avaliação', 'Comparando as avaliações', 'Ao longo do acompanhamento'], i);
    frases.push(`${abertura}, o resultado no teste de ${m.nome} passou de ${num(m.a)} para ${num(m.b)} ${m.unidade}, ${escolher(LIGACOES, i)} ${m.significado}.`);
    if (completo && resto.length) {
      frases.push(`Também houve avanço ${juntar(resto.map((x) => `no teste de ${x.nome} (de ${num(x.a)} para ${num(x.b)} ${x.unidade})`))}.`);
    }
  } else if (r.length && !quedas.length) {
    frases.push('Os resultados dos testes se mantiveram estáveis entre as avaliações.');
  }
  if (completo && quedas.length) {
    frases.push(`Por outro lado, ${juntar(quedas.map((x) => `o teste de ${x.nome} caiu de ${num(x.a)} para ${num(x.b)} ${x.unidade}`))}, um ponto que vou acompanhar de perto.`);
  }
  return frases;
}

function textoMedidas(ini, fim) {
  const partes = [];
  if (ini.peso_kg != null && fim.peso_kg != null && Number(ini.peso_kg) !== Number(fim.peso_kg)) {
    partes.push(`o peso foi de ${num(ini.peso_kg)} para ${num(fim.peso_kg)} kg`);
  }
  if (ini.cintura_cm != null && fim.cintura_cm != null && Number(ini.cintura_cm) !== Number(fim.cintura_cm)) {
    partes.push(`a cintura, de ${num(ini.cintura_cm)} para ${num(fim.cintura_cm)} cm`);
  }
  if (!partes.length) return null;
  const t = juntar(partes);
  return `Nas medidas, ${t}.`;
}

// ---------- Relatório simples: um parágrafo curto por pessoa ----------
export function frasePessoaSimples(p, i = 0) {
  const pub = publico(p.categoria).um;
  const treino = p.objetivo.toLowerCase();
  const sess = sessoesTexto(p.sessoes);
  const frases = [escolher([
    `Acompanhei ${p.iniciais}, ${pub}, em ${sess} de ${treino}.`,
    `Com ${p.iniciais} (${pub}), trabalhei ${treino} em ${sess}.`,
    `${p.iniciais}, ${pub}, fez ${sess} comigo, com foco em ${treino}.`,
  ], i)];
  if (p.esforco_medio != null && p.sessoes > 0) {
    frases.push(p.sessoes === 1
      ? `O esforço percebido foi ${esforcoTexto(p.esforco_medio)}.`
      : `No geral, o esforço percebido foi ${esforcoTexto(p.esforco_medio)}.`);
  }
  if (p.primeira && p.ultima && p.primeira.data !== p.ultima.data) {
    frases.push(...textoEvolucao(comparar(p.primeira, p.ultima), i, false));
  }
  return frases.join(' ');
}

// ---------- Relatório final: parágrafo completo por pessoa ----------
export function frasesPessoaFinal(p, i = 0) {
  const pub = publico(p.categoria).um;
  const treino = p.objetivo.toLowerCase();
  const idade = p.idade ? `${p.idade} anos` : null;
  const frases = [escolher([
    `Acompanhei ${p.iniciais}${idade ? `, ${pub} de ${idade},` : `, ${pub},`} com foco em ${treino}.`,
    `O trabalho com ${p.iniciais} (${[pub, idade].filter(Boolean).join(', ')}) teve como objetivo principal ${treino}.`,
    `Com ${p.iniciais}${idade ? `, de ${idade},` : ''} o foco foi ${treino}.`,
  ], i)];

  const sess = p.sessoes === 1 ? 'Fizemos uma sessão' : `Fizemos ${sessoesTexto(p.sessoes)}`;
  const aval = qtd(p.avaliacoes, 'avaliação', 'avaliações', true);
  const esforco = p.esforco_medio != null && p.sessoes > 0
    ? (p.sessoes === 1
      ? `, com esforço ${esforcoTexto(p.esforco_medio)} (${num(p.esforco_medio)} na escala de 0 a 10)`
      : `, com esforço em geral ${esforcoTexto(p.esforco_medio)} (média de ${num(p.esforco_medio)} na escala de 0 a 10)`)
    : '';
  frases.push(`${sess} no período${esforco}, e ${aval}.`);

  if (p.inicial && p.final && p.inicial.data !== p.final.data) {
    frases.push(...textoEvolucao(comparar(p.inicial, p.final), i, true));
    const medidas = textoMedidas(p.inicial, p.final);
    if (medidas) frases.push(medidas);
  } else if (p.inicial) {
    frases.push('Como houve só uma avaliação no período, ainda não deu para comparar a evolução.');
  }
  if (!p.liberada) frases.push('Na triagem inicial apareceu uma restrição, então encaminhei para avaliação médica antes de seguir com o treino.');
  return frases;
}

export function fraseAtividades(atividades) {
  return `O plano de treino incluiu ${juntar(atividades.map((a) => a.nome.toLowerCase()))}.`;
}

export function fraseObservacoes(obs) {
  const limpas = obs.map((o) => o.trim().replace(/\.$/, ''));
  return `Nas minhas anotações, registrei: ${limpas.map((o) => `“${o}”`).join(' e ')}.`;
}

export function fraseProjeto(pr) {
  const tipo = { extensao: 'extensão', pesquisa: 'pesquisa', estagio: 'estágio' }[pr.tipo] ?? pr.tipo;
  const local = pr.local ? ` (${pr.local})` : '';
  const frases = [`Também conduzi o projeto de ${tipo} “${pr.nome}”${local}, com ${qtd(pr.participantes, 'participante', 'participantes')} e ${qtd(pr.encontros, 'encontro', 'encontros')} no período.`];
  if (pr.media_presentes != null && pr.encontros > 0) {
    const media = Math.round(Number(pr.media_presentes));
    frases.push(`A frequência foi boa: em média, ${qtd(media, 'pessoa', 'pessoas', true)} por encontro.`.replace('foi boa: ', media / Math.max(pr.participantes, 1) >= 0.7 ? 'foi boa: ' : 'ficou abaixo do esperado: '));
  }
  if (pr.atividades?.length) {
    const unicas = [...new Set(pr.atividades)].map((a) => a.replace(/\s*\+\s*/g, ' com ').toLowerCase());
    frases.push(`Nos encontros, fizemos ${juntar(unicas)}.`);
  }
  return frases.join(' ');
}
