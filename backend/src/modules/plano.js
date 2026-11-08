// Libera a rota só para quem está no plano Pro.
// O plano é lido do banco a cada requisição: se a assinatura vencer, o acesso cai na hora.
const { query } = require('../db/pool');
const { ErroHttp, rota } = require('../core/erros');

const exigirPro = rota(async (req, _res, next) => {
  const { rows: [u] } = await query('SELECT plano FROM usuarios WHERE id = $1', [req.usuario.id]);
  if (u?.plano !== 'pro') {
    throw new ErroHttp(402, 'Este recurso faz parte do Pratik Mov Pro.', 'recurso_pro');
  }
  next();
});

module.exports = { exigirPro };
