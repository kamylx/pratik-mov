const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { autenticar, exigirPapel } = require('./core/auth');
const { tratarErros } = require('./core/erros');
const authRoutes = require('./modules/auth.routes');
const { router: pessoasRoutes } = require('./modules/pessoas.routes');
const atendimentoRoutes = require('./modules/atendimento.routes');
const relatorioRoutes = require('./modules/relatorio.routes');
const projetosRoutes = require('./modules/projetos.routes');
const { exigirPro } = require('./modules/plano');
const vinculosRoutes = require('./modules/vinculos.routes');
const { router: professorRoutes } = require('./modules/professor.routes');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Requisições que mudam dados precisam ser JSON: bloqueia formulários de outros sites (defesa extra contra CSRF).
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ erro: 'Envie os dados como JSON.' });
  }
  return next();
});

app.get('/api/saude', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

// Daqui para baixo, só aluno logado.
const aluno = [autenticar, exigirPapel('aluno')];
app.use('/api/pessoas', aluno, pessoasRoutes);
app.use('/api/pessoas/:pessoaId', aluno, atendimentoRoutes);
app.use('/api/projetos', aluno, exigirPro, projetosRoutes);
app.use('/api/vinculos', aluno, vinculosRoutes);
app.use('/api/professor', autenticar, exigirPapel('professor'), professorRoutes);
app.use('/api', aluno, relatorioRoutes);

app.use('/api', (_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Em produção, o backend também entrega o frontend já compilado.
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(tratarErros);

module.exports = app;
