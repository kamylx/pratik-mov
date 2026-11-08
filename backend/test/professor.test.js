// Testes da fase 4: professor vinculado, comentários, pesquisa e portfólio.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const s = Date.now();
const emails = {
  aluna: `aluna.${s}@teste.com`,
  prof: `prof.${s}@teste.com`,
  intruso: `intruso.${s}@teste.com`,
};
const aluna = request.agent(app);
const prof = request.agent(app);
const intruso = request.agent(app);
const triagemOk = { restricao_medica: false, sintomas_esforco: false, problema_articular: false };
let alunaId; let vinculoId; let pessoaId; let projetoId; let participantes = [];

after(async () => {
  await pool.query('DELETE FROM usuarios WHERE email = ANY($1)', [Object.values(emails)]);
  await pool.end();
});

test('cadastro de professor exige CREF e não aceita papel admin', async () => {
  const semCref = await request(app).post('/api/auth/cadastro')
    .send({ nome: 'Prof Sem', email: `sem.${s}@teste.com`, senha: 'senhaForte123', papel: 'professor' });
  assert.equal(semCref.status, 400);
  const admin = await request(app).post('/api/auth/cadastro')
    .send({ nome: 'Hacker', email: `adm.${s}@teste.com`, senha: 'senhaForte123', papel: 'admin' });
  assert.equal(admin.status, 400);

  const p = await prof.post('/api/auth/cadastro')
    .send({ nome: 'Ricardo Souza', email: emails.prof, senha: 'senhaForte123', papel: 'professor', cref: '012345-g/pa' });
  assert.equal(p.status, 201);
  assert.equal(p.body.usuario.cref, '012345-G/PA');
  await intruso.post('/api/auth/cadastro')
    .send({ nome: 'Outro Prof', email: emails.intruso, senha: 'senhaForte123', papel: 'professor', cref: '999999-G/SP' });

  const a = await aluna.post('/api/auth/cadastro').send({ nome: 'Júlia Santos', email: emails.aluna, senha: 'senhaForte123' });
  alunaId = a.body.usuario.id;
});

test('professor não usa rotas de aluno e aluno não usa rotas de professor', async () => {
  assert.equal((await prof.get('/api/pessoas')).status, 403);
  assert.equal((await aluna.get('/api/professor/vinculos')).status, 403);
});

test('no gratuito, a aluna não convida supervisor', async () => {
  const r = await aluna.post('/api/vinculos').send({ email: emails.prof });
  assert.equal(r.status, 402);
});

test('no Pro, convida só quem é professor', async () => {
  await pool.query("UPDATE usuarios SET plano = 'pro' WHERE id = $1", [alunaId]);
  const naoProf = await aluna.post('/api/vinculos').send({ email: emails.aluna });
  assert.equal(naoProf.status, 404);
  const r = await aluna.post('/api/vinculos').send({ email: emails.prof });
  assert.equal(r.status, 201);
  assert.equal(r.body.vinculo.status, 'pendente');
  vinculoId = r.body.vinculo.id;
  const dup = await aluna.post('/api/vinculos').send({ email: emails.prof });
  assert.equal(dup.status, 409);

  const pes = await aluna.post('/api/pessoas').send({ nome: 'Antônio Ribeiro', objetivo: 'Fortalecimento', consentimento: true, triagem: triagemOk });
  pessoaId = pes.body.pessoa.id;
});

test('convite pendente: professor vê só o nome e não acessa dados', async () => {
  const lista = await prof.get('/api/professor/vinculos');
  assert.equal(lista.body.vinculos[0].status, 'pendente');
  assert.equal(lista.body.vinculos[0].pessoas, undefined);
  assert.equal((await prof.get(`/api/professor/alunos/${alunaId}`)).status, 404);
});

test('aceito o convite, professor lê a ficha e comenta', async () => {
  assert.equal((await intruso.post(`/api/professor/vinculos/${vinculoId}/aceitar`).send({})).status, 404);
  assert.equal((await prof.post(`/api/professor/vinculos/${vinculoId}/aceitar`).send({})).status, 200);

  const al = await prof.get(`/api/professor/alunos/${alunaId}`);
  assert.equal(al.status, 200);
  assert.equal(al.body.pessoas.length, 1);
  const ficha = await prof.get(`/api/professor/alunos/${alunaId}/pessoas/${pessoaId}`);
  assert.equal(ficha.status, 200);

  const c = await prof.post('/api/professor/comentarios')
    .send({ aluno_id: alunaId, pessoa_id: pessoaId, texto: 'Boa triagem. Reavalie em 30 dias.' });
  assert.equal(c.status, 201);
  const vistaAluna = await aluna.get(`/api/pessoas/${pessoaId}`);
  assert.equal(vistaAluna.body.comentarios[0].autor, 'Ricardo Souza');
  assert.equal(vistaAluna.body.comentarios[0].autor_cref, '012345-G/PA');
});

test('professor sem vínculo não lê nem comenta', async () => {
  assert.equal((await intruso.get(`/api/professor/alunos/${alunaId}`)).status, 404);
  assert.equal((await intruso.get(`/api/professor/alunos/${alunaId}/pessoas/${pessoaId}`)).status, 404);
  const c = await intruso.post('/api/professor/comentarios').send({ aluno_id: alunaId, pessoa_id: pessoaId, texto: 'Invadindo' });
  assert.equal(c.status, 404);
});

test('relatório final usa o professor vinculado como supervisor', async () => {
  const r = await aluna.get('/api/relatorio/final?inicio=2026-01-01&fim=2026-12-31');
  assert.equal(r.body.identificacao.supervisor, 'Ricardo Souza');
  assert.equal(r.body.identificacao.cref, '012345-G/PA');
});

test('pesquisa: medidas do catálogo, faixas válidas e exportação sem nomes', async () => {
  const pr = await aluna.post('/api/projetos').send({ nome: 'Pressão em idosos', tipo: 'pesquisa' });
  projetoId = pr.body.projeto.id;
  for (const [nome, nasc] of [['=HYPERLINK("http://x")', '1955-01-10'], ['Francisco Lopes', '1950-06-20']]) {
    const r = await aluna.post(`/api/projetos/${projetoId}/participantes`).send({ nome, nascimento: nasc, consentimento: true });
    participantes.push(r.body.participante.id);
  }
  const medidaLivre = await aluna.patch(`/api/projetos/${projetoId}`).send({ medidas: ['qualquer_coisa'] });
  assert.equal(medidaLivre.status, 400);
  assert.equal((await aluna.patch(`/api/projetos/${projetoId}`).send({ medidas: ['pressao_sistolica', 'tug_s'] })).status, 200);

  const naoConfig = await aluna.post(`/api/projetos/${projetoId}/coletas`)
    .send({ valores: [{ participante_id: participantes[0], medida: 'peso_kg', valor: 70 }] });
  assert.equal(naoConfig.status, 400);
  const foraFaixa = await aluna.post(`/api/projetos/${projetoId}/coletas`)
    .send({ valores: [{ participante_id: participantes[0], medida: 'pressao_sistolica', valor: 900 }] });
  assert.equal(foraFaixa.status, 400);

  const ok = await aluna.post(`/api/projetos/${projetoId}/coletas`).send({
    data: '2026-11-04',
    valores: [
      { participante_id: participantes[0], medida: 'pressao_sistolica', valor: 138 },
      { participante_id: participantes[1], medida: 'pressao_sistolica', valor: 126 },
      { participante_id: participantes[1], medida: 'tug_s', valor: 9.4 },
    ],
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.salvos, 3);

  const csv = await aluna.get(`/api/projetos/${projetoId}/exportar`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers['content-type'], /text\/csv/);
  assert.match(csv.text, /participante,idade_anos,data,medida,valor,unidade/);
  assert.match(csv.text, /P01,71,2026-11-04,pressao_sistolica,138,mmHg/);
  assert.match(csv.text, /P02,76,2026-11-04,tug_s,9\.4,s/);
  assert.doesNotMatch(csv.text, /Francisco|HYPERLINK|1950-06-20/);

  assert.equal((await prof.get(`/api/professor/alunos/${alunaId}/projetos/${projetoId}`)).status, 200);
  assert.equal((await intruso.get(`/api/projetos/${projetoId}/exportar`)).status, 403);
});

test('portfólio resume a trajetória sem dados das pessoas', async () => {
  const r = await aluna.get('/api/portfolio');
  assert.equal(r.status, 200);
  assert.equal(r.body.portfolio.pessoas, 1);
  assert.equal(r.body.portfolio.projetos, 1);
  assert.equal(r.body.portfolio.supervisores[0].cref, '012345-G/PA');
  assert.doesNotMatch(JSON.stringify(r.body), /Antônio/);
});

test('aluna volta ao gratuito ou remove o vínculo: professor perde o acesso', async () => {
  await pool.query("UPDATE usuarios SET plano = 'gratuito' WHERE id = $1", [alunaId]);
  assert.equal((await prof.get(`/api/professor/alunos/${alunaId}`)).status, 404);
  await pool.query("UPDATE usuarios SET plano = 'pro' WHERE id = $1", [alunaId]);
  assert.equal((await prof.get(`/api/professor/alunos/${alunaId}`)).status, 200);
  assert.equal((await aluna.delete(`/api/vinculos/${vinculoId}`)).status, 204);
  assert.equal((await prof.get(`/api/professor/alunos/${alunaId}`)).status, 404);
});
