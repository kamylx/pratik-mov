const express = require('express');
const { z } = require('zod');
const { query } = require('../db/pool');
const { ErroHttp, rota } = require('../core/erros');
const { registrar } = require('../core/auditoria');
const { usoDoPlano } = require('./pessoas.routes');
const { exigirPro } = require('./plano');

const router = express.Router();

const periodo = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Anonimiza para o relatório: "Antônio Ribeiro" -> "A. R."
const iniciais = (nome) => nome.split(/\s+/).filter(Boolean).map((p) => `${p[0].toUpperCase()}.`).join(' ');

router.get('/inicio', rota(async (req, res) => {
  const id = req.usuario.id;
  const [uso, recentes, reavaliar, distribuicao] = await Promise.all([
    usoDoPlano(id),
    query(
      `SELECT s.id, s.data, s.esforco, p.id AS pessoa_id, p.nome, p.objetivo, p.categoria
       FROM sessoes s JOIN pessoas p ON p.id = s.pessoa_id
       WHERE p.aluno_id = $1 ORDER BY s.data DESC LIMIT 5`, [id]
    ),
    query(
      `SELECT p.id, p.nome, max(a.data) AS ultima_avaliacao
       FROM pessoas p LEFT JOIN avaliacoes a ON a.pessoa_id = p.id
       WHERE p.aluno_id = $1 AND p.status = 'ativa'
       GROUP BY p.id HAVING max(a.data) IS NULL OR max(a.data) < CURRENT_DATE - 30
       ORDER BY ultima_avaliacao NULLS FIRST LIMIT 5`, [id]
    ),
    query(
      `SELECT objetivo, categoria, count(*)::int AS total FROM pessoas
       WHERE aluno_id = $1 AND status = 'ativa' GROUP BY objetivo, categoria`, [id]
    ),
  ]);
  res.json({ uso, sessoesRecentes: recentes.rows, paraReavaliar: reavaliar.rows, distribuicao: distribuicao.rows });
}));

router.get('/relatorio/simples', rota(async (req, res) => {
  const r = periodo.safeParse(req.query);
  if (!r.success) throw new ErroHttp(400, 'Informe início e fim no formato AAAA-MM-DD.', 'invalido');
  const { inicio, fim } = r.data;
  if (inicio > fim) throw new ErroHttp(400, 'A data de início deve ser antes do fim.', 'invalido');

  const { rows: [aluno] } = await query('SELECT nome, curso FROM usuarios WHERE id = $1', [req.usuario.id]);
  const { rows } = await query(
    `SELECT p.id, p.nome, p.objetivo, p.categoria,
       (SELECT count(*)::int FROM sessoes s WHERE s.pessoa_id = p.id AND s.data::date BETWEEN $2 AND $3) AS sessoes,
       (SELECT round(avg(s.esforco), 1) FROM sessoes s WHERE s.pessoa_id = p.id AND s.data::date BETWEEN $2 AND $3) AS esforco_medio,
       (SELECT row_to_json(a) FROM (SELECT data, peso_kg, cintura_cm, sentar_levantar, sentar_alcancar, caminhada_6min_m
          FROM avaliacoes WHERE pessoa_id = p.id AND data BETWEEN $2 AND $3 ORDER BY data ASC LIMIT 1) a) AS primeira,
       (SELECT row_to_json(a) FROM (SELECT data, peso_kg, cintura_cm, sentar_levantar, sentar_alcancar, caminhada_6min_m
          FROM avaliacoes WHERE pessoa_id = p.id AND data BETWEEN $2 AND $3 ORDER BY data DESC LIMIT 1) a) AS ultima
     FROM pessoas p WHERE p.aluno_id = $1 ORDER BY p.nome`,
    [req.usuario.id, inicio, fim]
  );
  await registrar(req, 'gerar', 'relatorio_simples');
  res.json({
    tipo: 'simples',
    aluno: { nome: aluno.nome, curso: aluno.curso },
    periodo: { inicio, fim },
    totais: {
      pessoas: rows.length,
      sessoes: rows.reduce((t, p) => t + p.sessoes, 0),
    },
    pessoas: rows.map(({ id, nome, ...resto }) => ({ id, iniciais: iniciais(nome), ...resto })),
  });
}));

const finalSchema = periodo.extend({
  disciplina: z.string().trim().max(120).optional(),
  local: z.string().trim().max(160).optional(),
  supervisor: z.string().trim().max(120).optional(),
  cref: z.string().trim().max(40).optional(),
});

const CAMPOS_AVALIACAO = `data, protocolo, peso_kg, altura_cm, cintura_cm, pressao,
  sentar_levantar, sentar_alcancar, caminhada_6min_m`;

// Relatório final completo (Pro): atendimentos individuais e projetos em grupo do período.
router.get('/relatorio/final', exigirPro, rota(async (req, res) => {
  const r = finalSchema.safeParse(req.query);
  if (!r.success) throw new ErroHttp(400, 'Informe início e fim no formato AAAA-MM-DD.', 'invalido');
  const { inicio, fim, ...identificacao } = r.data;
  if (inicio > fim) throw new ErroHttp(400, 'A data de início deve ser antes do fim.', 'invalido');
  const id = req.usuario.id;

  const { rows: [aluno] } = await query('SELECT nome, curso FROM usuarios WHERE id = $1', [id]);
  // Sem supervisor informado, usa o professor vinculado (com o CREF do cadastro dele).
  if (!identificacao.supervisor) {
    const { rows: [prof] } = await query(
      `SELECT u.nome, u.cref FROM vinculos v JOIN usuarios u ON u.id = v.professor_id
       WHERE v.aluno_id = $1 AND v.status = 'ativo' ORDER BY v.criado_em LIMIT 1`, [id]
    );
    if (prof) Object.assign(identificacao, { supervisor: prof.nome, cref: identificacao.cref || prof.cref });
  }
  const { rows: pessoas } = await query(
    `SELECT p.id, p.nome, p.objetivo, p.categoria, p.nascimento,
       (SELECT liberada FROM triagens t WHERE t.pessoa_id = p.id ORDER BY criado_em DESC LIMIT 1) AS liberada,
       (SELECT count(*)::int FROM sessoes s WHERE s.pessoa_id = p.id AND s.data::date BETWEEN $2 AND $3) AS sessoes,
       (SELECT round(avg(s.esforco), 1) FROM sessoes s WHERE s.pessoa_id = p.id AND s.data::date BETWEEN $2 AND $3) AS esforco_medio,
       (SELECT count(*)::int FROM avaliacoes a WHERE a.pessoa_id = p.id AND a.data BETWEEN $2 AND $3) AS avaliacoes,
       (SELECT row_to_json(a) FROM (SELECT ${CAMPOS_AVALIACAO} FROM avaliacoes
          WHERE pessoa_id = p.id AND data BETWEEN $2 AND $3 ORDER BY data ASC LIMIT 1) a) AS inicial,
       (SELECT row_to_json(a) FROM (SELECT ${CAMPOS_AVALIACAO} FROM avaliacoes
          WHERE pessoa_id = p.id AND data BETWEEN $2 AND $3 ORDER BY data DESC LIMIT 1) a) AS final,
       (SELECT json_agg(json_build_object('nome', at.nome, 'detalhe', at.detalhe) ORDER BY at.ordem)
          FROM planos pl JOIN atividades at ON at.plano_id = pl.id
          WHERE pl.pessoa_id = p.id AND pl.ativo) AS atividades,
       (SELECT json_agg(s.observacoes ORDER BY s.data) FROM sessoes s
          WHERE s.pessoa_id = p.id AND s.data::date BETWEEN $2 AND $3 AND s.observacoes IS NOT NULL) AS observacoes
     FROM pessoas p WHERE p.aluno_id = $1 ORDER BY p.nome`, [id, inicio, fim]
  );
  const { rows: projetos } = await query(
    `SELECT pr.id, pr.nome, pr.tipo, pr.local, pr.horario,
       (SELECT count(*)::int FROM participantes pa WHERE pa.projeto_id = pr.id AND pa.ativo) AS participantes,
       (SELECT count(*)::int FROM encontros e WHERE e.projeto_id = pr.id AND e.data BETWEEN $2 AND $3) AS encontros,
       (SELECT round(avg(n), 1) FROM (SELECT count(pres.participante_id) AS n FROM encontros e
          LEFT JOIN presencas pres ON pres.encontro_id = e.id
          WHERE e.projeto_id = pr.id AND e.data BETWEEN $2 AND $3 GROUP BY e.id) x) AS media_presentes,
       (SELECT json_agg(e.atividade ORDER BY e.data) FROM encontros e
          WHERE e.projeto_id = pr.id AND e.data BETWEEN $2 AND $3 AND e.atividade IS NOT NULL) AS atividades
     FROM projetos pr WHERE pr.aluno_id = $1 ORDER BY pr.nome`, [id, inicio, fim]
  );
  await registrar(req, 'gerar', 'relatorio_final');
  res.json({
    tipo: 'final',
    modelo: 'Modelo padrão Pratik',
    identificacao: { aluno: aluno.nome, curso: aluno.curso, ...identificacao },
    periodo: { inicio, fim },
    totais: {
      pessoas: pessoas.length,
      sessoes: pessoas.reduce((t, p) => t + p.sessoes, 0),
      projetos: projetos.length,
      encontros: projetos.reduce((t, p) => t + p.encontros, 0),
    },
    pessoas: pessoas.map(({ id: pid, nome, nascimento, ...resto }) => ({
      id: pid,
      iniciais: iniciais(nome),
      idade: nascimento ? Math.floor((new Date(fim) - new Date(nascimento)) / 31557600000) : null,
      ...resto,
    })),
    projetos,
  });
}));

// Portfólio do aluno (Pro): o que ele fez ao longo do curso, sem dados das pessoas atendidas.
router.get('/portfolio', exigirPro, rota(async (req, res) => {
  const id = req.usuario.id;
  const { rows: [r] } = await query(
    `SELECT u.nome, u.curso, u.criado_em AS desde,
       (SELECT count(*)::int FROM pessoas p WHERE p.aluno_id = u.id) AS pessoas,
       (SELECT count(*)::int FROM sessoes s JOIN pessoas p ON p.id = s.pessoa_id WHERE p.aluno_id = u.id) AS sessoes,
       (SELECT count(*)::int FROM avaliacoes a JOIN pessoas p ON p.id = a.pessoa_id WHERE p.aluno_id = u.id) AS avaliacoes,
       (SELECT count(*)::int FROM projetos pr WHERE pr.aluno_id = u.id) AS projetos,
       (SELECT count(*)::int FROM encontros e JOIN projetos pr ON pr.id = e.projeto_id WHERE pr.aluno_id = u.id) AS encontros,
       (SELECT count(*)::int FROM participantes pa JOIN projetos pr ON pr.id = pa.projeto_id WHERE pr.aluno_id = u.id) AS participantes,
       (SELECT coalesce(json_agg(DISTINCT a.protocolo), '[]') FROM avaliacoes a JOIN pessoas p ON p.id = a.pessoa_id WHERE p.aluno_id = u.id) AS protocolos,
       (SELECT coalesce(json_agg(DISTINCT p.objetivo), '[]') FROM pessoas p WHERE p.aluno_id = u.id) AS objetivos,
       (SELECT coalesce(json_agg(json_build_object('nome', pr.nome, 'tipo', pr.tipo, 'local', pr.local) ORDER BY pr.criado_em), '[]')
          FROM projetos pr WHERE pr.aluno_id = u.id) AS lista_projetos,
       (SELECT coalesce(json_agg(json_build_object('nome', pu.nome, 'cref', pu.cref)), '[]')
          FROM vinculos v JOIN usuarios pu ON pu.id = v.professor_id WHERE v.aluno_id = u.id AND v.status = 'ativo') AS supervisores
     FROM usuarios u WHERE u.id = $1`, [id]
  );
  await registrar(req, 'gerar', 'portfolio');
  res.json({ portfolio: r });
}));

module.exports = router;
