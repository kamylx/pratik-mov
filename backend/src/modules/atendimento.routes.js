// Avaliações, plano de atividades e sessões de uma pessoa atendida.
const express = require('express');
const { z } = require('zod');
const { query, transacao } = require('../db/pool');
const { validar } = require('../core/validar');
const { ErroHttp, rota } = require('../core/erros');
const { registrar } = require('../core/auditoria');
const { pessoaDoAluno } = require('./acesso');

const router = express.Router({ mergeParams: true });

const num = (min, max) => z.number().min(min).max(max).optional();

const avaliacaoSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  protocolo: z.string().trim().min(2).max(80),
  peso_kg: num(20, 350),
  altura_cm: num(80, 250),
  cintura_cm: num(30, 250),
  pressao: z.string().trim().regex(/^\d{2,3}\/\d{2,3}$/, 'Use o formato 120/80.').optional(),
  sentar_levantar: z.number().int().min(0).max(100).optional(),
  sentar_alcancar: num(-50, 60),
  caminhada_6min_m: z.number().int().min(0).max(1500).optional(),
  observacoes: z.string().trim().max(2000).optional(),
});

const planoSchema = z.object({
  objetivo: z.string().trim().min(2).max(80),
  frequencia: z.string().trim().min(2).max(60),
  duracao_min: z.number().int().min(5).max(300).optional(),
  atividades: z.array(z.object({
    nome: z.string().trim().min(2).max(120),
    detalhe: z.string().trim().max(200).optional(),
  })).min(1).max(30),
});

const sessaoSchema = z.object({
  esforco: z.number().int().min(0).max(10),
  atividades_feitas: z.array(z.string().uuid()).max(30).default([]),
  observacoes: z.string().trim().max(2000).optional(),
});

router.post('/avaliacoes', validar(avaliacaoSchema), rota(async (req, res) => {
  const pessoa = await pessoaDoAluno(req.usuario.id, req.params.pessoaId);
  const a = req.body;
  const { rows: [av] } = await query(
    `INSERT INTO avaliacoes (pessoa_id, data, protocolo, peso_kg, altura_cm, cintura_cm, pressao,
       sentar_levantar, sentar_alcancar, caminhada_6min_m, observacoes)
     VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [pessoa.id, a.data ?? null, a.protocolo, a.peso_kg ?? null, a.altura_cm ?? null, a.cintura_cm ?? null,
      a.pressao ?? null, a.sentar_levantar ?? null, a.sentar_alcancar ?? null, a.caminhada_6min_m ?? null,
      a.observacoes ?? null]
  );
  await registrar(req, 'criar', 'avaliacao', av.id);
  res.status(201).json({ avaliacao: av });
}));

// Substitui o plano ativo por um novo (o anterior fica no histórico).
router.put('/plano', validar(planoSchema), rota(async (req, res) => {
  const pessoa = await pessoaDoAluno(req.usuario.id, req.params.pessoaId);
  const { rows: [t] } = await query(
    'SELECT liberada FROM triagens WHERE pessoa_id = $1 ORDER BY criado_em DESC LIMIT 1', [pessoa.id]
  );
  if (!t || !t.liberada) {
    throw new ErroHttp(409, 'A triagem indicou restrição. Encaminhe para avaliação médica antes de montar o plano.', 'triagem_bloqueada');
  }
  const plano = await transacao(async (c) => {
    await c.query('UPDATE planos SET ativo = false WHERE pessoa_id = $1 AND ativo', [pessoa.id]);
    const { objetivo, frequencia, duracao_min, atividades } = req.body;
    const { rows: [p] } = await c.query(
      `INSERT INTO planos (pessoa_id, objetivo, frequencia, duracao_min) VALUES ($1, $2, $3, $4) RETURNING *`,
      [pessoa.id, objetivo, frequencia, duracao_min ?? null]
    );
    const criadas = [];
    for (const [i, at] of atividades.entries()) {
      const { rows: [r] } = await c.query(
        'INSERT INTO atividades (plano_id, ordem, nome, detalhe) VALUES ($1, $2, $3, $4) RETURNING *',
        [p.id, i + 1, at.nome, at.detalhe ?? null]
      );
      criadas.push(r);
    }
    await registrar(req, 'criar', 'plano', p.id, c);
    return { ...p, atividades: criadas };
  });
  res.status(201).json({ plano });
}));

router.post('/sessoes', validar(sessaoSchema), rota(async (req, res) => {
  const pessoa = await pessoaDoAluno(req.usuario.id, req.params.pessoaId);
  const { rows: [plano] } = await query(
    'SELECT id FROM planos WHERE pessoa_id = $1 AND ativo ORDER BY criado_em DESC LIMIT 1', [pessoa.id]
  );
  const feitas = [...new Set(req.body.atividades_feitas)];
  if (feitas.length) {
    // Só aceita atividades que pertencem ao plano ativo desta pessoa.
    const { rows } = await query(
      'SELECT id FROM atividades WHERE plano_id = $1 AND id = ANY($2::uuid[])', [plano?.id ?? null, feitas]
    );
    if (rows.length !== feitas.length) throw new ErroHttp(400, 'Atividade fora do plano atual.', 'invalido');
  }
  const { rows: [s] } = await query(
    `INSERT INTO sessoes (pessoa_id, plano_id, esforco, atividades_feitas, observacoes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [pessoa.id, plano?.id ?? null, req.body.esforco, feitas, req.body.observacoes ?? null]
  );
  await registrar(req, 'criar', 'sessao', s.id);
  res.status(201).json({ sessao: s });
}));

module.exports = router;
