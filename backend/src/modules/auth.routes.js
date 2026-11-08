const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { query } = require('../db/pool');
const { emitirToken, limparToken, autenticar } = require('../core/auth');
const { validar } = require('../core/validar');
const { ErroHttp, rota } = require('../core/erros');
const { registrar } = require('../core/auditoria');

const router = express.Router();

// Limita tentativas de login/cadastro por IP (contra força bruta).
const limiteAcesso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LIMITE_TENTATIVAS || 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos.' },
});

const cadastroSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  senha: z.string().min(8, 'Mínimo de 8 caracteres.').max(128),
  curso: z.string().trim().max(160).optional(),
  papel: z.enum(['aluno', 'professor']).default('aluno'),
  cref: z.string().trim().toUpperCase().regex(/^\d{3,6}-[A-Z]\/[A-Z]{2}$/, 'Use o formato 000000-G/UF.').optional(),
}).refine((v) => v.papel !== 'professor' || v.cref, { message: 'Professor precisa informar o nº do CREF.', path: ['cref'] });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(1).max(128),
});

const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, plano: u.plano, curso: u.curso, cref: u.cref });

// Hash fixo para comparar quando o e-mail não existe, evitando revelar pelo tempo de resposta.
const HASH_FALSO = bcrypt.hashSync('senha-que-nao-existe', 12);

router.post('/cadastro', limiteAcesso, validar(cadastroSchema), rota(async (req, res) => {
  const { nome, email, senha, curso, papel, cref } = req.body;
  const hash = await bcrypt.hash(senha, 12);
  try {
    // O papel só pode ser aluno ou professor: nunca admin pelo cadastro público.
    const { rows: [u] } = await query(
      `INSERT INTO usuarios (nome, email, senha_hash, curso, papel, cref) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, papel, plano, curso, cref`,
      [nome, email, hash, curso ?? null, papel, papel === 'professor' ? cref : null]
    );
    req.usuario = { id: u.id };
    await registrar(req, 'cadastro', 'usuario', u.id);
    emitirToken(res, u);
    res.status(201).json({ usuario: publico(u) });
  } catch (err) {
    if (err.code === '23505') throw new ErroHttp(409, 'Já existe uma conta com este e-mail.', 'email_em_uso');
    throw err;
  }
}));

router.post('/login', limiteAcesso, validar(loginSchema), rota(async (req, res) => {
  const { email, senha } = req.body;
  const { rows: [u] } = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const ok = await bcrypt.compare(senha, u ? u.senha_hash : HASH_FALSO);
  if (!u || !ok) throw new ErroHttp(401, 'E-mail ou senha incorretos.', 'credenciais');
  req.usuario = { id: u.id };
  await registrar(req, 'login', 'usuario', u.id);
  emitirToken(res, u);
  res.json({ usuario: publico(u) });
}));

router.post('/logout', (req, res) => {
  limparToken(res);
  res.status(204).end();
});

router.get('/eu', autenticar, rota(async (req, res) => {
  const { rows: [u] } = await query(
    'SELECT id, nome, email, papel, plano, curso, cref FROM usuarios WHERE id = $1', [req.usuario.id]
  );
  if (!u) throw new ErroHttp(401, 'Sessão inválida.', 'nao_autenticado');
  res.json({ usuario: publico(u) });
}));

module.exports = router;
