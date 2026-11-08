// Lado do aluno: convidar, listar e remover supervisores. Convidar exige o Pro.
const express = require('express');
const { z } = require('zod');
const { query } = require('../db/pool');
const { validar } = require('../core/validar');
const { ErroHttp, naoEncontrado, rota } = require('../core/erros');
const { registrar } = require('../core/auditoria');
const { exigirPro } = require('./plano');

const router = express.Router();

router.get('/', rota(async (req, res) => {
  const { rows } = await query(
    `SELECT v.id, v.status, v.criado_em, u.nome, u.email, u.cref
     FROM vinculos v JOIN usuarios u ON u.id = v.professor_id
     WHERE v.aluno_id = $1 ORDER BY v.criado_em`, [req.usuario.id]
  );
  res.json({ vinculos: rows });
}));

router.post('/', exigirPro, validar(z.object({ email: z.string().trim().toLowerCase().email() })), rota(async (req, res) => {
  const { rows: [prof] } = await query(
    "SELECT id, nome, email, cref FROM usuarios WHERE email = $1 AND papel = 'professor'", [req.body.email]
  );
  if (!prof) throw new ErroHttp(404, 'Nenhum professor cadastrado com este e-mail. Peça para ele criar uma conta de professor.', 'nao_encontrado');
  const { rows: [v] } = await query(
    `INSERT INTO vinculos (aluno_id, professor_id) VALUES ($1, $2)
     ON CONFLICT (aluno_id, professor_id) DO NOTHING RETURNING id, status`, [req.usuario.id, prof.id]
  );
  if (!v) throw new ErroHttp(409, 'Este professor já está na sua lista.', 'duplicado');
  await registrar(req, 'convidar', 'vinculo', v.id);
  res.status(201).json({ vinculo: { ...v, nome: prof.nome, email: prof.email, cref: prof.cref } });
}));

// O aluno pode retirar o acesso a qualquer momento.
router.delete('/:id', rota(async (req, res) => {
  const { rowCount } = await query('DELETE FROM vinculos WHERE id = $1 AND aluno_id = $2', [req.params.id, req.usuario.id]);
  if (!rowCount) throw naoEncontrado('Vínculo');
  await registrar(req, 'remover', 'vinculo', req.params.id);
  res.status(204).end();
}));

module.exports = router;
