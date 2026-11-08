// Catálogo fechado de medidas de pesquisa: o nome da medida nunca vem livre do usuário.
const MEDIDAS = {
  pressao_sistolica: { rotulo: 'Pressão sistólica', unidade: 'mmHg', min: 60, max: 260 },
  pressao_diastolica: { rotulo: 'Pressão diastólica', unidade: 'mmHg', min: 30, max: 160 },
  frequencia_cardiaca: { rotulo: 'Frequência cardíaca de repouso', unidade: 'bpm', min: 30, max: 220 },
  peso_kg: { rotulo: 'Peso', unidade: 'kg', min: 20, max: 350 },
  caminhada_6min_m: { rotulo: 'Caminhada de 6 minutos', unidade: 'm', min: 0, max: 1500 },
  sentar_levantar: { rotulo: 'Sentar e levantar 30 s', unidade: 'rep.', min: 0, max: 100 },
  sentar_alcancar: { rotulo: 'Sentar e alcançar', unidade: 'cm', min: -50, max: 60 },
  tug_s: { rotulo: 'Timed Up and Go', unidade: 's', min: 1, max: 120 },
};

module.exports = { MEDIDAS, CHAVES_MEDIDAS: Object.keys(MEDIDAS) };
