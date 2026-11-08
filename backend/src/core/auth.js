// Núcleo de autenticação e autorização, pensado para ser compartilhado
// com outros apps da linha Pratik (ex.: Pratik Jus).
const jwt = require('jsonwebtoken');
const config = require('../config');
const { ErroHttp } = require('./erros');

const COOKIE = 'pratik_token';

function emitirToken(res, usuario) {
  const token = jwt.sign(
    { sub: usuario.id, papel: usuario.papel },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn, algorithm: 'HS256' }
  );
  // Cookie httpOnly: JavaScript da página não consegue ler o token (protege contra XSS).
  // SameSite=strict: o navegador não envia o cookie em requisições de outros sites (protege contra CSRF).
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.isProduction,
    maxAge: 2 * 60 * 60 * 1000,
    path: '/api',
  });
}

function limparToken(res) {
  res.clearCookie(COOKIE, { path: '/api' });
}

function autenticar(req, _res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next(new ErroHttp(401, 'Faça login para continuar.', 'nao_autenticado'));
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.usuario = { id: payload.sub, papel: payload.papel };
    return next();
  } catch {
    return next(new ErroHttp(401, 'Sessão expirada. Entre novamente.', 'nao_autenticado'));
  }
}

// RBAC: libera a rota só para os papéis informados.
const exigirPapel = (...papeis) => (req, _res, next) => {
  if (!papeis.includes(req.usuario?.papel)) {
    return next(new ErroHttp(403, 'Você não tem permissão para isso.', 'proibido'));
  }
  return next();
};

module.exports = { emitirToken, limparToken, autenticar, exigirPapel };
