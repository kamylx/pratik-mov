// Testes da fase 3: recursos do Pro, projetos em grupo e relatório final.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const sufixo = Date.now();
const emailPro = `pro.${sufixo}@teste.com`;
const emailOutro = `outro.${sufixo}@teste.com`;
const pro = request.agent(app);
const outro = request.agent(app);
let projetoId;
let participantes = [];

after(async () => {
  await pool.query('DELETE FROM usuarios WHERE email = ANY($1)', [[emailPro, emailOutro]]);
  await pool.end();
});

test('no gratuito, projetos e relatório final são bloqueados (402)', async () => {
  await pro.post('/api/auth/cadastro').send({ nome: 'Aluna Pro', email: emailPro, senha: 'senhaForte123' });
  await outro.post('/api/auth/cadastro').send({ nome: 'Outro Aluno', email: emailOutro, senha: 'senhaForte123' });
  const lista = await pro.get('/api/projetos');
  assert.equal(lista.status, 402);
  assert.equal(lista.body.codigo, 'recurso_pro');
  const final = await pro.get('/api/relatorio/final?inicio=2026-01-01&fim=2026-12-31');
  assert.equal(final.status, 402);
});

test('o plano é lido do banco: ao virar Pro, o acesso abre sem novo login', async () => {
  await pool.query("UPDATE usuarios SET plano = 'pro' WHERE email = ANY($1)", [[emailPro, emailOutro]]);
  const lista = await pro.get('/api/projetos');
  assert.equal(lista.status, 200);
  assert.deepEqual(lista.body.projetos, []);
});

test('cria projeto, participantes e encontro com presença em lote', async () => {
  const p = await pro.post('/api/projetos').send({ nome: 'Caminhada Ativa', tipo: 'extensao', total_encontros: 24 });
  assert.equal(p.status, 201);
  projetoId = p.body.projeto.id;

  const semTermo = await pro.post(`/api/projetos/${projetoId}/participantes`).send({ nome: 'Sem Termo', consentimento: false });
  assert.equal(semTermo.status, 400);

  for (const nome of ['Benedita Costa', 'Francisco Lopes', 'Helena Martins']) {
    const r = await pro.post(`/api/projetos/${projetoId}/participantes`).send({ nome, consentimento: true });
    assert.equal(r.status, 201);
    participantes.push(r.body.participante.id);
  }

  const e = await pro.post(`/api/projetos/${projetoId}/encontros`)
    .send({ data: '2026-11-03', atividade: 'Caminhada 30 min', presentes: participantes.slice(0, 2) });
  assert.equal(e.status, 201);
  assert.equal(e.body.encontro.presentes, 2);

  const ficha = await pro.get(`/api/projetos/${projetoId}`);
  assert.equal(ficha.body.participantes.length, 3);
  assert.equal(ficha.body.encontros[0].presentes, 2);
});

test('presença só aceita participantes do próprio projeto', async () => {
  const outroProjeto = await outro.post('/api/projetos').send({ nome: 'Grupo de idosos', tipo: 'extensao' });
  const estranho = await outro.post(`/api/projetos/${outroProjeto.body.projeto.id}/participantes`)
    .send({ nome: 'Pessoa de Fora', consentimento: true });
  const r = await pro.post(`/api/projetos/${projetoId}/encontros`)
    .send({ presentes: [estranho.body.participante.id] });
  assert.equal(r.status, 400);
});

test('outro aluno não acessa o projeto (404)', async () => {
  assert.equal((await outro.get(`/api/projetos/${projetoId}`)).status, 404);
  assert.equal((await outro.post(`/api/projetos/${projetoId}/encontros`).send({ presentes: [] })).status, 404);
  assert.equal((await outro.patch(`/api/projetos/${projetoId}/participantes/${participantes[0]}`).send({ ativo: false })).status, 404);
  assert.equal((await outro.delete(`/api/projetos/${projetoId}`)).status, 404);
});

test('no Pro não há limite de 10 pessoas', async () => {
  const { body } = await pro.get('/api/pessoas');
  assert.equal(body.uso.limite, null);
});

test('relatório final traz identificação, pessoas anonimizadas e projetos', async () => {
  await pro.post('/api/pessoas').send({
    nome: 'Carla Mendes', objetivo: 'Condicionamento', nascimento: '1970-05-10', consentimento: true,
    triagem: { restricao_medica: false, sintomas_esforco: false, problema_articular: false },
  });
  const r = await pro.get('/api/relatorio/final?inicio=2026-01-01&fim=2026-12-31&disciplina=Estágio II&supervisor=Ricardo Souza&cref=000000-G/PA');
  assert.equal(r.status, 200);
  assert.equal(r.body.identificacao.cref, '000000-G/PA');
  assert.equal(r.body.pessoas[0].iniciais, 'C. M.');
  assert.equal(r.body.pessoas[0].nome, undefined);
  assert.equal(r.body.projetos[0].encontros, 1);
  assert.equal(Number(r.body.projetos[0].media_presentes), 2);
  assert.equal(r.body.totais.projetos, 1);
});

test('modo beta: conta nova de aluno já nasce no Pro; professor não', async () => {
  const config = require('../src/config');
  config.betaPro = true;
  const emailBeta = `beta.${sufixo}@teste.com`;
  const emailProf = `prof.beta.${sufixo}@teste.com`;
  try {
    const a = await request(app).post('/api/auth/cadastro').send({ nome: 'Aluna Beta', email: emailBeta, senha: 'senhaForte123' });
    assert.equal(a.status, 201);
    assert.equal(a.body.usuario.plano, 'pro');
    const p = await request(app).post('/api/auth/cadastro').send({ nome: 'Prof Beta', email: emailProf, senha: 'senhaForte123', papel: 'professor', cref: '012345-G/PA' });
    assert.equal(p.status, 201);
    assert.equal(p.body.usuario.plano, 'gratuito');
  } finally {
    config.betaPro = false;
    await pool.query('DELETE FROM usuarios WHERE email = ANY($1)', [[emailBeta, emailProf]]);
  }
});
