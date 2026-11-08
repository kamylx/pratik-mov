const express = require('express');
const { z } = require('zod');
const config = require('../config');
const { query, transacao } = require('../db/pool');
const { validar } = require('../core/validar');
const { ErroHttp, rota } = require('../core/erros');
const { registrar } = require('../core/auditoria');
const { pessoaDoAluno } = require('./acesso');
const { fichaPessoa } = require('./fichas');
const { CHAVES_CATEGORIAS, OBJETIVOS, CATEGORIAS, modelo } = require('./treinos');

const router = express.Router();

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.');

const novaPessoaSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  nascimento: data.optional(),
  objetivo: z.enum(OBJETIVOS),
  categoria: z.enum(CHAVES_CATEGORIAS).default('adulto'),
  consentimento: z.literal(true, { error: 'O termo de consentimento é obrigatório.' }),
  triagem: z.object({
    restricao_medica: z.boolean(),
    sintomas_esforco: z.boolean(),
    problema_articular: z.boolean(),
    observacoes: z.string().trim().max(1000).optional(),
  }),
});

const editarPessoaSchema = z.object({
  nome: z.string().trim().min(2).max(120).optional(),
  objetivo: z.enum(OBJETIVOS).optional(),
  categoria: z.enum(CHAVES_CATEGORIAS).optional(),
  status: z.enum(['ativa', 'inativa']).optional(),
}).refine((v) => Object.keys(v).length > 0, 'Envie ao menos um campo.');

async function usoDoPlano(alunoId, executor = { query }) {
  const { rows: [u] } = await executor.query(
    `SELECT u.plano, (SELECT count(*)::int FROM pessoas p WHERE p.aluno_id = u.id) AS total
     FROM usuarios u WHERE u.id = $1`, [alunoId]
  );
  return { plano: u.plano, total: u.total, limite: u.plano === 'gratuito' ? config.limiteGratuito : null };
}

router.get('/', rota(async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.nome, p.objetivo, p.categoria, p.status, p.criado_em,
       (SELECT t.liberada FROM triagens t WHERE t.pessoa_id = p.id ORDER BY t.criado_em DESC LIMIT 1) AS liberada,
       (SELECT max(s.data) FROM sessoes s WHERE s.pessoa_id = p.id) AS ultima_sessao,
       (SELECT max(a.data) FROM avaliacoes a WHERE a.pessoa_id = p.id) AS ultima_avaliacao
     FROM pessoas p WHERE p.aluno_id = $1 ORDER BY p.nome`, [req.usuario.id]
  );
  res.json({ pessoas: rows, uso: await usoDoPlano(req.usuario.id) });
}));

router.post('/', validar(novaPessoaSchema), rota(async (req, res) => {
  const { nome, nascimento, objetivo, categoria, triagem } = req.body;
  const resultado = await transacao(async (c) => {
    // Trava a linha do aluno para que duas requisições simultâneas não passem do limite.
    await c.query('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [req.usuario.id]);
    const uso = await usoDoPlano(req.usuario.id, c);
    if (uso.limite !== null && uso.total >= uso.limite) {
      throw new ErroHttp(402, `O plano gratuito permite até ${uso.limite} pessoas. Assine o Pro para continuar.`, 'limite_plano');
    }
    const { rows: [p] } = await c.query(
      `INSERT INTO pessoas (aluno_id, nome, nascimento, objetivo, categoria, consentimento_em)
       VALUES ($1, $2, $3, $4, $5, now()) RETURNING *`,
      [req.usuario.id, nome, nascimento ?? null, objetivo, categoria]
    );
    const liberada = !(triagem.restricao_medica || triagem.sintomas_esforco || triagem.problema_articular);
    const { rows: [t] } = await c.query(
      `INSERT INTO triagens (pessoa_id, restricao_medica, sintomas_esforco, problema_articular, liberada, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [p.id, triagem.restricao_medica, triagem.sintomas_esforco, triagem.problema_articular, liberada, triagem.observacoes ?? null]
    );
    await registrar(req, 'criar', 'pessoa', p.id, c);
    return { pessoa: p, triagem: t };
  });
  res.status(201).json(resultado);
}));

// Catálogo e modelos de treino (antes de '/:id' para não confundir com um id).
router.get('/catalogo/treinos', (_req, res) => res.json({ categorias: CATEGORIAS, objetivos: OBJETIVOS }));

router.get('/:id/modelo', rota(async (req, res) => {
  const pessoa = await pessoaDoAluno(req.usuario.id, req.params.id);
  const objetivo = OBJETIVOS.includes(req.query.objetivo) ? req.query.objetivo : pessoa.objetivo;
  res.json({ modelo: modelo(pessoa.categoria, objetivo) });
}));

router.get('/:id', rota(async (req, res) => {
  const pessoa = await pessoaDoAluno(req.usuario.id, req.params.id);
  await registrar(req, 'ver', 'pessoa', pessoa.id);
  res.json(await fichaPessoa(pessoa));
}));

router.patch('/:id', validar(editarPessoaSchema), rota(async (req, res) => {
  await pessoaDoAluno(req.usuario.id, req.params.id);
  const campos = Object.entries(req.body);
  // Nomes de coluna vêm de uma lista fixa validada pelo schema, nunca do usuário.
  const sets = campos.map(([k], i) => `${k} = $${i + 3}`).join(', ');
  const { rows: [p] } = await query(
    `UPDATE pessoas SET ${sets} WHERE id = $1 AND aluno_id = $2 RETURNING *`,
    [req.params.id, req.usuario.id, ...campos.map(([, v]) => v)]
  );
  await registrar(req, 'editar', 'pessoa', p.id);
  res.json({ pessoa: p });
}));

// LGPD: exclui a pessoa e todos os dados dela (avaliações, planos, sessões).
router.delete('/:id', rota(async (req, res) => {
  await pessoaDoAluno(req.usuario.id, req.params.id);
  await query('DELETE FROM pessoas WHERE id = $1 AND aluno_id = $2', [req.params.id, req.usuario.id]);
  await registrar(req, 'excluir', 'pessoa', req.params.id);
  res.status(204).end();
}));

module.exports = { router, usoDoPlano };
