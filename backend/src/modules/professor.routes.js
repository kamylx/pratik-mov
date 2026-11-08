// Área do professor: aceita convites, acompanha os alunos vinculados (só leitura) e comenta.
const express = require('express');
const { z } = require('zod');
const { query } = require('../db/pool');
const { validar } = require('../core/validar');
const { naoEncontrado, rota } = require('../core/erros');
const { registrar } = require('../core/auditoria');
const { fichaPessoa, fichaProjeto } = require('./fichas');

const router = express.Router();

// Regra central de acesso: vínculo aceito E aluno no Pro. Sem isso, o aluno "não existe" para o professor.
async function alunoAcessivel(professorId, alunoId) {
  const { rows: [a] } = await query(
    `SELECT u.id, u.nome, u.curso FROM vinculos v JOIN usuarios u ON u.id = v.aluno_id
     WHERE v.professor_id = $1 AND v.aluno_id = $2 AND v.status = 'ativo' AND u.plano = 'pro'`,
    [professorId, alunoId]
  );
  if (!a) throw naoEncontrado('Aluno');
  return a;
}

async function pessoaAcessivel(professorId, alunoId, pessoaId) {
  await alunoAcessivel(professorId, alunoId);
  const { rows: [p] } = await query('SELECT * FROM pessoas WHERE id = $1 AND aluno_id = $2', [pessoaId, alunoId]);
  if (!p) throw naoEncontrado('Pessoa');
  return p;
}

async function projetoAcessivel(professorId, alunoId, projetoId) {
  await alunoAcessivel(professorId, alunoId);
  const { rows: [p] } = await query('SELECT * FROM projetos WHERE id = $1 AND aluno_id = $2', [projetoId, alunoId]);
  if (!p) throw naoEncontrado('Projeto');
  return p;
}

router.get('/vinculos', rota(async (req, res) => {
  const { rows } = await query(
    `SELECT v.id, v.status, v.criado_em, u.id AS aluno_id, u.nome, u.curso, u.plano,
       (SELECT count(*)::int FROM pessoas p WHERE p.aluno_id = u.id) AS pessoas,
       (SELECT count(*)::int FROM projetos pr WHERE pr.aluno_id = u.id) AS projetos
     FROM vinculos v JOIN usuarios u ON u.id = v.aluno_id
     WHERE v.professor_id = $1 ORDER BY v.status DESC, u.nome`, [req.usuario.id]
  );
  // Quem está pendente ou sem Pro aparece só com o nome, sem números.
  res.json({
    vinculos: rows.map((v) => (v.status === 'ativo' && v.plano === 'pro'
      ? v : { id: v.id, status: v.status, aluno_id: v.aluno_id, nome: v.nome, curso: v.curso, inativo: v.status === 'ativo' })),
  });
}));

router.post('/vinculos/:id/aceitar', rota(async (req, res) => {
  const { rows: [v] } = await query(
    "UPDATE vinculos SET status = 'ativo' WHERE id = $1 AND professor_id = $2 RETURNING id, status",
    [req.params.id, req.usuario.id]
  );
  if (!v) throw naoEncontrado('Convite');
  await registrar(req, 'aceitar', 'vinculo', v.id);
  res.json({ vinculo: v });
}));

router.delete('/vinculos/:id', rota(async (req, res) => {
  const { rowCount } = await query('DELETE FROM vinculos WHERE id = $1 AND professor_id = $2', [req.params.id, req.usuario.id]);
  if (!rowCount) throw naoEncontrado('Convite');
  await registrar(req, 'remover', 'vinculo', req.params.id);
  res.status(204).end();
}));

router.get('/alunos/:alunoId', rota(async (req, res) => {
  const aluno = await alunoAcessivel(req.usuario.id, req.params.alunoId);
  const [pessoas, projetos] = await Promise.all([
    query(
      `SELECT p.id, p.nome, p.objetivo, p.status,
         (SELECT t.liberada FROM triagens t WHERE t.pessoa_id = p.id ORDER BY t.criado_em DESC LIMIT 1) AS liberada,
         (SELECT max(s.data) FROM sessoes s WHERE s.pessoa_id = p.id) AS ultima_sessao,
         (SELECT count(*)::int FROM comentarios c WHERE c.pessoa_id = p.id) AS comentarios
       FROM pessoas p WHERE p.aluno_id = $1 ORDER BY p.nome`, [aluno.id]
    ),
    query(
      `SELECT pr.id, pr.nome, pr.tipo,
         (SELECT count(*)::int FROM participantes pa WHERE pa.projeto_id = pr.id AND pa.ativo) AS participantes,
         (SELECT count(*)::int FROM encontros e WHERE e.projeto_id = pr.id) AS encontros
       FROM projetos pr WHERE pr.aluno_id = $1 ORDER BY pr.nome`, [aluno.id]
    ),
  ]);
  await registrar(req, 'ver', 'aluno', aluno.id);
  res.json({ aluno, pessoas: pessoas.rows, projetos: projetos.rows });
}));

router.get('/alunos/:alunoId/pessoas/:pessoaId', rota(async (req, res) => {
  const pessoa = await pessoaAcessivel(req.usuario.id, req.params.alunoId, req.params.pessoaId);
  await registrar(req, 'ver', 'pessoa', pessoa.id);
  res.json(await fichaPessoa(pessoa));
}));

router.get('/alunos/:alunoId/projetos/:projetoId', rota(async (req, res) => {
  const projeto = await projetoAcessivel(req.usuario.id, req.params.alunoId, req.params.projetoId);
  await registrar(req, 'ver', 'projeto', projeto.id);
  res.json(await fichaProjeto(projeto));
}));

const comentarioSchema = z.object({
  aluno_id: z.string().uuid(),
  pessoa_id: z.string().uuid().optional(),
  projeto_id: z.string().uuid().optional(),
  texto: z.string().trim().min(2).max(2000),
}).refine((v) => Boolean(v.pessoa_id) !== Boolean(v.projeto_id), 'Comente uma pessoa ou um projeto.');

router.post('/comentarios', validar(comentarioSchema), rota(async (req, res) => {
  const { aluno_id: alunoId, pessoa_id: pessoaId, projeto_id: projetoId, texto } = req.body;
  if (pessoaId) await pessoaAcessivel(req.usuario.id, alunoId, pessoaId);
  else await projetoAcessivel(req.usuario.id, alunoId, projetoId);
  const { rows: [c] } = await query(
    `INSERT INTO comentarios (autor_id, pessoa_id, projeto_id, texto) VALUES ($1, $2, $3, $4)
     RETURNING id, texto, criado_em`, [req.usuario.id, pessoaId ?? null, projetoId ?? null, texto]
  );
  await registrar(req, 'comentar', pessoaId ? 'pessoa' : 'projeto', pessoaId ?? projetoId);
  res.status(201).json({ comentario: c });
}));

module.exports = { router, alunoAcessivel };
