const { query } = require('../db/pool');

// Registra a ação sem guardar dados pessoais ou de saúde no log.
async function registrar(req, acao, entidade, entidadeId = null, executor = null) {
  const sql = `INSERT INTO auditoria (usuario_id, acao, entidade, entidade_id, ip)
               VALUES ($1, $2, $3, $4, $5)`;
  const params = [req.usuario?.id ?? null, acao, entidade, entidadeId, req.ip];
  try {
    await (executor ? executor.query(sql, params) : query(sql, params));
  } catch (err) {
    console.error('Falha ao registrar auditoria:', err.message);
  }
}

module.exports = { registrar };
