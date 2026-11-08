// Projetos em grupo (extensão, pesquisa, estágio): participantes, encontros e presença em lote. Plano Pro.
const express = require('express');
const { z } = require('zod');
const { query, transacao } = require('../db/pool');
const { validar } = require('../core/validar');
const { ErroHttp, naoEncontrado, rota } = require('../core/erros');
const { registrar } = require('../core/auditoria');
const { fichaProjeto } = require('./fichas');
const { MEDIDAS, CHAVES_MEDIDAS } = require('./medidas');

const router = express.Router();
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.');

const projetoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  tipo: z.enum(['extensao', 'pesquisa', 'estagio']),
  local: z.string().trim().max(160).optional(),
  horario: z.string().trim().max(80).optional(),
  total_encontros: z.number().int().min(1).max(500).optional(),
});

const participanteSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  nascimento: data.optional(),
  consentimento: z.literal(true, { error: 'O termo de consentimento é obrigatório.' }),
});

const encontroSchema = z.object({
  data: data.optional(),
  atividade: z.string().trim().max(200).optional(),
  observacoes: z.string().trim().max(2000).optional(),
  presentes: z.array(z.string().uuid()).max(500),
});

async function projetoDoAluno(alunoId, projetoId) {
  const { rows: [p] } = await query('SELECT * FROM projetos WHERE id = $1 AND aluno_id = $2', [projetoId, alunoId]);
  if (!p) throw naoEncontrado('Projeto');
  return p;
}

router.get('/', rota(async (req, res) => {
  const { rows } = await query(
    `SELECT pr.*,
       (SELECT count(*)::int FROM participantes pa WHERE pa.projeto_id = pr.id AND pa.ativo) AS participantes,
       (SELECT count(*)::int FROM encontros e WHERE e.projeto_id = pr.id) AS encontros
     FROM projetos pr WHERE pr.aluno_id = $1 ORDER BY pr.ativo DESC, pr.criado_em DESC`, [req.usuario.id]
  );
  res.json({ projetos: rows });
}));

router.post('/', validar(projetoSchema), rota(async (req, res) => {
  const b = req.body;
  const { rows: [p] } = await query(
    `INSERT INTO projetos (aluno_id, nome, tipo, local, horario, total_encontros)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.usuario.id, b.nome, b.tipo, b.local ?? null, b.horario ?? null, b.total_encontros ?? null]
  );
  await registrar(req, 'criar', 'projeto', p.id);
  res.status(201).json({ projeto: p });
}));

router.get('/:id', rota(async (req, res) => {
  const projeto = await projetoDoAluno(req.usuario.id, req.params.id);
  res.json(await fichaProjeto(projeto));
}));

router.post('/:id/participantes', validar(participanteSchema), rota(async (req, res) => {
  const projeto = await projetoDoAluno(req.usuario.id, req.params.id);
  const { rows: [pa] } = await query(
    `INSERT INTO participantes (projeto_id, nome, nascimento, consentimento_em)
     VALUES ($1, $2, $3, now()) RETURNING id, nome, nascimento, ativo`,
    [projeto.id, req.body.nome, req.body.nascimento ?? null]
  );
  await registrar(req, 'criar', 'participante', pa.id);
  res.status(201).json({ participante: pa });
}));

router.patch('/:id/participantes/:pid', validar(z.object({ ativo: z.boolean() })), rota(async (req, res) => {
  const projeto = await projetoDoAluno(req.usuario.id, req.params.id);
  const { rows: [pa] } = await query(
    'UPDATE participantes SET ativo = $1 WHERE id = $2 AND projeto_id = $3 RETURNING id, nome, ativo',
    [req.body.ativo, req.params.pid, projeto.id]
  );
  if (!pa) throw naoEncontrado('Participante');
  await registrar(req, 'editar', 'participante', pa.id);
  res.json({ participante: pa });
}));

// Registra um encontro e a presença de todos de uma vez.
router.post('/:id/encontros', validar(encontroSchema), rota(async (req, res) => {
  const projeto = await projetoDoAluno(req.usuario.id, req.params.id);
  const presentes = [...new Set(req.body.presentes)];
  if (presentes.length) {
    const { rows } = await query(
      'SELECT id FROM participantes WHERE projeto_id = $1 AND id = ANY($2::uuid[])', [projeto.id, presentes]
    );
    if (rows.length !== presentes.length) throw new ErroHttp(400, 'Participante fora deste projeto.', 'invalido');
  }
  const encontro = await transacao(async (c) => {
    const { rows: [e] } = await c.query(
      `INSERT INTO encontros (projeto_id, data, atividade, observacoes)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4) RETURNING *`,
      [projeto.id, req.body.data ?? null, req.body.atividade ?? null, req.body.observacoes ?? null]
    );
    if (presentes.length) {
      await c.query(
        'INSERT INTO presencas (encontro_id, participante_id) SELECT $1, unnest($2::uuid[])', [e.id, presentes]
      );
    }
    await registrar(req, 'criar', 'encontro', e.id, c);
    return { ...e, presentes: presentes.length };
  });
  res.status(201).json({ encontro });
}));

router.delete('/:id', rota(async (req, res) => {
  await projetoDoAluno(req.usuario.id, req.params.id);
  await query('DELETE FROM projetos WHERE id = $1 AND aluno_id = $2', [req.params.id, req.usuario.id]);
  await registrar(req, 'excluir', 'projeto', req.params.id);
  res.status(204).end();
}));

// ===== Pesquisa: medidas padronizadas, coletas e exportação anonimizada =====

const medidasSchema = z.object({
  medidas: z.array(z.enum(CHAVES_MEDIDAS)).max(CHAVES_MEDIDAS.length),
});

const coletaSchema = z.object({
  data: data.optional(),
  valores: z.array(z.object({
    participante_id: z.string().uuid(),
    medida: z.enum(CHAVES_MEDIDAS),
    valor: z.number(),
  })).min(1).max(2000),
});

router.get('/catalogo/medidas', (_req, res) => res.json({ medidas: MEDIDAS }));

router.patch('/:id', validar(medidasSchema), rota(async (req, res) => {
  const projeto = await projetoDoAluno(req.usuario.id, req.params.id);
  const { rows: [p] } = await query(
    'UPDATE projetos SET medidas = $1 WHERE id = $2 RETURNING *', [[...new Set(req.body.medidas)], projeto.id]
  );
  await registrar(req, 'editar', 'projeto', p.id);
  res.json({ projeto: p });
}));

router.post('/:id/coletas', validar(coletaSchema), rota(async (req, res) => {
  const projeto = await projetoDoAluno(req.usuario.id, req.params.id);
  const { valores } = req.body;
  for (const v of valores) {
    if (!projeto.medidas.includes(v.medida)) throw new ErroHttp(400, 'Medida não configurada neste projeto.', 'invalido');
    const { min, max, rotulo } = MEDIDAS[v.medida];
    if (v.valor < min || v.valor > max) throw new ErroHttp(400, `${rotulo}: valor fora da faixa (${min} a ${max}).`, 'invalido');
  }
  const ids = [...new Set(valores.map((v) => v.participante_id))];
  const { rows } = await query(
    'SELECT id FROM participantes WHERE projeto_id = $1 AND id = ANY($2::uuid[])', [projeto.id, ids]
  );
  if (rows.length !== ids.length) throw new ErroHttp(400, 'Participante fora deste projeto.', 'invalido');

  const salvos = await transacao(async (c) => {
    for (const v of valores) {
      // Regravar a mesma medida no mesmo dia corrige o valor anterior.
      await c.query(
        `INSERT INTO coletas (projeto_id, participante_id, data, medida, valor)
         VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5)
         ON CONFLICT (participante_id, data, medida) DO UPDATE SET valor = EXCLUDED.valor`,
        [projeto.id, v.participante_id, req.body.data ?? null, v.medida, v.valor]
      );
    }
    await registrar(req, 'criar', 'coleta', projeto.id, c);
    return valores.length;
  });
  res.status(201).json({ salvos });
}));

// Neutraliza fórmulas em planilhas (CSV injection) e escapa aspas.
function celula(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Exporta as coletas sem nomes: cada participante vira um código (P01, P02...) e a data de nascimento vira idade.
router.get('/:id/exportar', rota(async (req, res) => {
  const projeto = await projetoDoAluno(req.usuario.id, req.params.id);
  const { rows: participantes } = await query(
    'SELECT id, nascimento FROM participantes WHERE projeto_id = $1 ORDER BY criado_em, id', [projeto.id]
  );
  const codigo = new Map(participantes.map((p, i) => [p.id, `P${String(i + 1).padStart(2, '0')}`]));
  const nascimento = new Map(participantes.map((p) => [p.id, p.nascimento]));
  const { rows: coletas } = await query(
    'SELECT participante_id, data, medida, valor FROM coletas WHERE projeto_id = $1 ORDER BY data, medida', [projeto.id]
  );
  const idade = (pid, dataColeta) => {
    const n = nascimento.get(pid);
    return n ? Math.floor((new Date(dataColeta) - new Date(n)) / 31557600000) : null;
  };
  const corpo = coletas.map((c) => {
    const d = c.data instanceof Date ? c.data.toISOString().slice(0, 10) : String(c.data);
    return [codigo.get(c.participante_id), idade(c.participante_id, d), d, c.medida, Number(c.valor), MEDIDAS[c.medida]?.unidade];
  }).sort((a, b) => a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]) || a[3].localeCompare(b[3]));
  const linhas = [['participante', 'idade_anos', 'data', 'medida', 'valor', 'unidade'], ...corpo];
  await registrar(req, 'exportar', 'projeto', projeto.id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pesquisa-${projeto.id.slice(0, 8)}.csv"`);
  res.send(`﻿${linhas.map((l) => l.map(celula).join(',')).join('\r\n')}\r\n`);
}));

module.exports = router;
