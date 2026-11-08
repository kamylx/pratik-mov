const { ErroHttp } = require('./erros');

// Valida req.body com um schema zod e substitui pelo valor já limpo.
const validar = (schema) => (req, _res, next) => {
  const r = schema.safeParse(req.body);
  if (!r.success) {
    const primeiro = r.error.issues[0];
    const campo = primeiro.path.join('.') || 'dados';
    return next(new ErroHttp(400, `Campo inválido: ${campo}. ${primeiro.message}`, 'invalido'));
  }
  req.body = r.data;
  return next();
};

module.exports = { validar };
