// Monta a ficha completa de uma pessoa ou de um projeto.
// Usada pelo aluno (dono) e pelo professor vinculado (só leitura).
const { query } = require('../db/pool');

const COMENTARIOS = `SELECT c.id, c.texto, c.criado_em, u.nome AS autor, u.cref AS autor_cref
  FROM comentarios c JOIN usuarios u ON u.id = c.autor_id`;

async function fichaPessoa(pessoa) {
  const [triagem, avaliacoes, plano, sessoes, comentarios] = await Promise.all([
    query('SELECT * FROM triagens WHERE pessoa_id = $1 ORDER BY criado_em DESC LIMIT 1', [pessoa.id]),
    query('SELECT * FROM avaliacoes WHERE pessoa_id = $1 ORDER BY data, criado_em', [pessoa.id]),
    query('SELECT * FROM planos WHERE pessoa_id = $1 AND ativo ORDER BY criado_em DESC LIMIT 1', [pessoa.id]),
    query('SELECT * FROM sessoes WHERE pessoa_id = $1 ORDER BY data DESC LIMIT 20', [pessoa.id]),
    query(`${COMENTARIOS} WHERE c.pessoa_id = $1 ORDER BY c.criado_em DESC`, [pessoa.id]),
  ]);
  let planoAtual = plano.rows[0] ?? null;
  if (planoAtual) {
    const { rows } = await query('SELECT * FROM atividades WHERE plano_id = $1 ORDER BY ordem', [planoAtual.id]);
    planoAtual = { ...planoAtual, atividades: rows };
  }
  return {
    pessoa,
    triagem: triagem.rows[0] ?? null,
    avaliacoes: avaliacoes.rows,
    plano: planoAtual,
    sessoes: sessoes.rows,
    comentarios: comentarios.rows,
  };
}

async function fichaProjeto(projeto) {
  const [participantes, encontros, coletas, comentarios] = await Promise.all([
    query(
      `SELECT pa.id, pa.nome, pa.nascimento, pa.ativo,
         (SELECT count(*)::int FROM presencas pr WHERE pr.participante_id = pa.id) AS presencas
       FROM participantes pa WHERE pa.projeto_id = $1 ORDER BY pa.ativo DESC, pa.nome`, [projeto.id]
    ),
    query(
      `SELECT e.*, (SELECT count(*)::int FROM presencas pr WHERE pr.encontro_id = e.id) AS presentes
       FROM encontros e WHERE e.projeto_id = $1 ORDER BY e.data DESC, e.criado_em DESC`, [projeto.id]
    ),
    query(
      `SELECT data, count(DISTINCT participante_id)::int AS participantes, count(*)::int AS valores
       FROM coletas WHERE projeto_id = $1 GROUP BY data ORDER BY data DESC`, [projeto.id]
    ),
    query(`${COMENTARIOS} WHERE c.projeto_id = $1 ORDER BY c.criado_em DESC`, [projeto.id]),
  ]);
  return {
    projeto,
    participantes: participantes.rows,
    encontros: encontros.rows,
    coletas: coletas.rows,
    comentarios: comentarios.rows,
  };
}

module.exports = { fichaPessoa, fichaProjeto };
