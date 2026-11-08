// Erros de negócio com status HTTP e mensagem segura para o usuário.
class ErroHttp extends Error {
  constructor(status, mensagem, codigo) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

const naoEncontrado = (o = 'Registro') => new ErroHttp(404, `${o} não encontrado.`, 'nao_encontrado');

// Envolve handlers async para que erros caiam no middleware de erro.
const rota = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Middleware final: nunca vaza stack trace ou detalhes do banco.
function tratarErros(err, req, res, _next) {
  if (err instanceof ErroHttp) {
    return res.status(err.status).json({ erro: err.message, codigo: err.codigo });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Requisição grande demais.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }
  if (err.code === '22P02') {
    // UUID malformado na URL: trata como inexistente.
    return res.status(404).json({ erro: 'Registro não encontrado.', codigo: 'nao_encontrado' });
  }
  console.error(err);
  return res.status(500).json({ erro: 'Erro interno. Tente novamente.' });
}

module.exports = { ErroHttp, naoEncontrado, rota, tratarErros };
