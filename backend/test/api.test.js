// Testes de API: fluxo completo e as principais proteções de segurança.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const sufixo = Date.now();
const emailA = `aluno.a.${sufixo}@teste.com`;
const emailB = `aluno.b.${sufixo}@teste.com`;
const triagemOk = { restricao_medica: false, sintomas_esforco: false, problema_articular: false };

const agenteA = request.agent(app);
const agenteB = request.agent(app);
let pessoaId;
let planoAtividades;

after(async () => {
  await pool.query('DELETE FROM usuarios WHERE email = ANY($1)', [[emailA, emailB]]);
  await pool.end();
});

test('cadastro, login e sessão via cookie httpOnly', async () => {
  const cad = await agenteA.post('/api/auth/cadastro')
    .send({ nome: 'Aluna A', email: emailA, senha: 'senhaForte123' });
  assert.equal(cad.status, 201);
  const cookie = cad.headers['set-cookie'][0];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(cad.body.usuario.senha_hash, undefined);

  await agenteB.post('/api/auth/cadastro').send({ nome: 'Aluno B', email: emailB, senha: 'outraSenha123' });

  const eu = await agenteA.get('/api/auth/eu');
  assert.equal(eu.status, 200);
  assert.equal(eu.body.usuario.plano, 'gratuito');
});

test('login errado responde mensagem genérica', async () => {
  const r1 = await request(app).post('/api/auth/login').send({ email: emailA, senha: 'errada' });
  const r2 = await request(app).post('/api/auth/login').send({ email: 'nao.existe@teste.com', senha: 'errada' });
  assert.equal(r1.status, 401);
  assert.equal(r2.status, 401);
  assert.equal(r1.body.erro, r2.body.erro);
});

test('rotas protegidas exigem login', async () => {
  const r = await request(app).get('/api/pessoas');
  assert.equal(r.status, 401);
});

test('não cria pessoa sem termo de consentimento', async () => {
  const r = await agenteA.post('/api/pessoas')
    .send({ nome: 'Sem Termo', objetivo: 'Mobilidade', consentimento: false, triagem: triagemOk });
  assert.equal(r.status, 400);
});

test('cria pessoa com triagem liberada', async () => {
  const r = await agenteA.post('/api/pessoas')
    .send({ nome: 'Antônio Ribeiro', objetivo: 'Fortalecimento', consentimento: true, triagem: triagemOk });
  assert.equal(r.status, 201);
  assert.equal(r.body.triagem.liberada, true);
  pessoaId = r.body.pessoa.id;
});

test('outro aluno não enxerga a pessoa (404, não 403)', async () => {
  const ver = await agenteB.get(`/api/pessoas/${pessoaId}`);
  assert.equal(ver.status, 404);
  const avaliar = await agenteB.post(`/api/pessoas/${pessoaId}/avaliacoes`).send({ protocolo: 'Bateria' });
  assert.equal(avaliar.status, 404);
  const apagar = await agenteB.delete(`/api/pessoas/${pessoaId}`);
  assert.equal(apagar.status, 404);
});

test('triagem com restrição bloqueia o plano', async () => {
  const r = await agenteA.post('/api/pessoas').send({
    nome: 'Com Restrição', objetivo: 'Condicionamento', consentimento: true,
    triagem: { ...triagemOk, sintomas_esforco: true },
  });
  assert.equal(r.body.triagem.liberada, false);
  const plano = await agenteA.put(`/api/pessoas/${r.body.pessoa.id}/plano`)
    .send({ objetivo: 'Condicionamento', frequencia: '2x semana', atividades: [{ nome: 'Caminhada' }] });
  assert.equal(plano.status, 409);
});

test('avaliação, plano e sessão', async () => {
  const av = await agenteA.post(`/api/pessoas/${pessoaId}/avaliacoes`)
    .send({ protocolo: 'Bateria para idosos', peso_kg: 78.4, altura_cm: 172, sentar_levantar: 14, pressao: '120/80' });
  assert.equal(av.status, 201);

  const ruim = await agenteA.post(`/api/pessoas/${pessoaId}/avaliacoes`)
    .send({ protocolo: 'X', peso_kg: 9999 });
  assert.equal(ruim.status, 400);

  const plano = await agenteA.put(`/api/pessoas/${pessoaId}/plano`).send({
    objetivo: 'Fortalecimento', frequencia: '3x por semana', duracao_min: 40,
    atividades: [{ nome: 'Caminhada', detalhe: '10 min' }, { nome: 'Remada com elástico', detalhe: '3x12' }],
  });
  assert.equal(plano.status, 201);
  planoAtividades = plano.body.plano.atividades.map((a) => a.id);

  const sessao = await agenteA.post(`/api/pessoas/${pessoaId}/sessoes`)
    .send({ esforco: 6, atividades_feitas: planoAtividades });
  assert.equal(sessao.status, 201);

  const estranha = await agenteA.post(`/api/pessoas/${pessoaId}/sessoes`)
    .send({ esforco: 6, atividades_feitas: ['00000000-0000-4000-8000-000000000000'] });
  assert.equal(estranha.status, 400);

  const ficha = await agenteA.get(`/api/pessoas/${pessoaId}`);
  assert.equal(ficha.body.avaliacoes.length, 1);
  assert.equal(ficha.body.plano.atividades.length, 2);
  assert.equal(ficha.body.sessoes.length, 1);
});

test('plano gratuito trava na 11ª pessoa', async () => {
  const { body } = await agenteA.get('/api/pessoas');
  for (let i = body.uso.total; i < 10; i += 1) {
    const r = await agenteA.post('/api/pessoas')
      .send({ nome: `Pessoa ${i}`, objetivo: 'Mobilidade', consentimento: true, triagem: triagemOk });
    assert.equal(r.status, 201);
  }
  const extra = await agenteA.post('/api/pessoas')
    .send({ nome: 'Pessoa Extra', objetivo: 'Mobilidade', consentimento: true, triagem: triagemOk });
  assert.equal(extra.status, 402);
  assert.equal(extra.body.codigo, 'limite_plano');
});

test('relatório simples anonimiza e o final é do Pro', async () => {
  const hoje = new Date().toISOString().slice(0, 10);
  const r = await agenteA.get(`/api/relatorio/simples?inicio=2026-01-01&fim=${hoje}`);
  assert.equal(r.status, 200);
  const antonio = r.body.pessoas.find((p) => p.iniciais === 'A. R.');
  assert.ok(antonio);
  assert.equal(antonio.nome, undefined);
  assert.equal(antonio.sessoes, 1);

  const final = await agenteA.get('/api/relatorio/final');
  assert.equal(final.status, 402);
});

test('entradas malformadas não quebram o servidor', async () => {
  const uuidRuim = await agenteA.get('/api/pessoas/nao-e-um-uuid');
  assert.equal(uuidRuim.status, 404);
  const form = await agenteA.post('/api/pessoas').type('form').send('nome=x');
  assert.equal(form.status, 415);
  const injecao = await agenteA.get(`/api/pessoas/${pessoaId}'%20OR%20'1'='1`);
  assert.equal(injecao.status, 404);
});

test('exclusão de pessoa (LGPD) apaga os dados', async () => {
  const del = await agenteA.delete(`/api/pessoas/${pessoaId}`);
  assert.equal(del.status, 204);
  const ver = await agenteA.get(`/api/pessoas/${pessoaId}`);
  assert.equal(ver.status, 404);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM sessoes WHERE pessoa_id = $1', [pessoaId]);
  assert.equal(rows[0].n, 0);
});

test('categoria, catálogo e modelo de treino por categoria', async () => {
  const cat = await agenteB.get('/api/pessoas/catalogo/treinos');
  assert.equal(cat.status, 200);
  assert.ok(cat.body.objetivos.includes('Equilíbrio'));
  assert.equal(cat.body.categorias.atleta.intensidade, 'alta');

  const objetivoInvalido = await agenteB.post('/api/pessoas').send({
    nome: 'Teste', objetivo: 'Qualquer', categoria: 'idoso', consentimento: true, triagem: triagemOk,
  });
  assert.equal(objetivoInvalido.status, 400);

  const idosa = await agenteB.post('/api/pessoas').send({
    nome: 'Rosa Lima', objetivo: 'Equilíbrio', categoria: 'idoso', consentimento: true, triagem: triagemOk,
  });
  assert.equal(idosa.body.pessoa.categoria, 'idoso');
  const atleta = await agenteB.post('/api/pessoas').send({
    nome: 'Marcos Santos', objetivo: 'Equilíbrio', categoria: 'atleta', consentimento: true, triagem: triagemOk,
  });

  const mIdosa = await agenteB.get(`/api/pessoas/${idosa.body.pessoa.id}/modelo`);
  const mAtleta = await agenteB.get(`/api/pessoas/${atleta.body.pessoa.id}/modelo`);
  assert.equal(mIdosa.body.modelo.intensidade, 'leve');
  assert.equal(mAtleta.body.modelo.intensidade, 'alta');
  assert.notEqual(mIdosa.body.modelo.atividades[1].detalhe, mAtleta.body.modelo.atividades[1].detalhe);
  assert.ok(mIdosa.body.modelo.aviso);

  const outroObjetivo = await agenteB.get(`/api/pessoas/${idosa.body.pessoa.id}/modelo?objetivo=Mobilidade`);
  assert.equal(outroObjetivo.body.modelo.objetivo, 'Mobilidade');
  assert.equal((await agenteA.get(`/api/pessoas/${idosa.body.pessoa.id}/modelo`)).status, 404);
});
