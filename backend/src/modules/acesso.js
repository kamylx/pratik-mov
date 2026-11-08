// Controle de propriedade: um aluno só enxerga as pessoas que ele atende.
// Recursos de outro aluno respondem 404 (não 403), para não revelar que existem.
const { query } = require('../db/pool');
const { naoEncontrado } = require('../core/erros');

async function pessoaDoAluno(alunoId, pessoaId, executor = { query }) {
  const { rows: [p] } = await executor.query(
    'SELECT * FROM pessoas WHERE id = $1 AND aluno_id = $2', [pessoaId, alunoId]
  );
  if (!p) throw naoEncontrado('Pessoa');
  return p;
}

module.exports = { pessoaDoAluno };
