# Pratik Mov · fases 2, 3 e 4

> **Publicar para teste:** veja [PUBLICAR.md](PUBLICAR.md) (Render + Neon, gratuitos).

App para estudantes de Educação Física registrarem atendimentos de estágio e projetos e gerarem o relatório.

- **backend/**: Node.js + Express + PostgreSQL (API em `/api`)
- **frontend/**: React + Vite, pensado para celular

## O que já funciona

- Cadastro, login e logout (sessão em cookie httpOnly)
- Pessoas atendidas: lista, busca, filtros e exclusão com todos os dados (LGPD)
- Nova pessoa com triagem de prontidão e termo de consentimento obrigatório
- Triagem com restrição bloqueia o plano até o encaminhamento médico
- Avaliação física com IMC calculado e comparação com a avaliação anterior
- Plano de atividades com biblioteca de sugestões
- Registro de sessão: atividades feitas, esforço de 0 a 10 e observações
- Ficha da pessoa com gráfico de evolução e variação das medidas
- Relatório simples por período, com nomes anonimizados, pronto para salvar em PDF
- Limite de 10 pessoas no plano gratuito

### Plano Pro (fase 3)

- Pessoas sem limite
- Projetos em grupo (extensão, pesquisa, estágio): participantes com termo de consentimento, encontros e presença de todos de uma vez
- Relatório final completo: identificação com disciplina, local, supervisor e nº do CREF, avaliações inicial e final, atividades, projetos em grupo e espaço para assinaturas, pronto para PDF
- Rascunho de termos de uso e privacidade em `/termos` (revisar com advogado antes de publicar)

O plano é conferido no banco a cada requisição: se a assinatura cair, o acesso aos recursos Pro fecha na hora.

**Ativar o Pro em testes** (até a cobrança ser integrada):

```powershell
cd pratik-mov\backend
npm run plano -- julia@demo.com pro
npm run plano -- julia@demo.com gratuito
```

A conta de demonstração já vem com o projeto "Caminhada Ativa" para ver o Pro funcionando.

### Professor, pesquisa e portfólio (fase 4)

- **Conta de professor** com nº do CREF (cadastro: "Sou professor")
- **Vínculo:** o aluno Pro convida o professor pelo e-mail (Perfil › Supervisores) e o professor aceita. Só então ele vê os atendimentos e projetos daquele aluno, **só leitura**, e pode comentar
- O acesso fecha sozinho se o aluno remover o vínculo ou sair do Pro
- **Comentários** do professor aparecem na ficha da pessoa e no projeto, com nome e CREF
- O relatório final usa o professor vinculado como supervisor, com o CREF do cadastro dele
- **Pesquisa:** cada projeto escolhe medidas de um catálogo fixo (pressão, frequência cardíaca, caminhada de 6 min, TUG...), registra coletas em tabela e exporta **CSV anonimizado**: participantes viram P01, P02..., nascimento vira idade, nenhum nome sai no arquivo
- **Portfólio do aluno:** números da trajetória, áreas, protocolos, projetos e supervisão, sem dados das pessoas atendidas

Contas de demonstração (senha `demo12345`): aluna **julia@demo.com** e professor **ricardo@demo.com**, já vinculados. Ative o Pro da Júlia para o professor enxergar os dados.

Ainda não existe: cobrança da assinatura (depende da escolha do intermediador de pagamento) e o modelo de relatório do curso (o atual é o modelo padrão Pratik).

### Categorias e tipos de treino

- Cada pessoa tem uma **categoria** (idoso, adulto, atleta, criança ou adolescente, gestante, reabilitação) e um **tipo de treino** (fortalecimento, hipertrofia, emagrecimento, equilíbrio, mobilidade, condicionamento, desempenho), cada um com cor e ícone próprios
- A lista de pessoas é agrupada por treino e filtrável por treino e categoria
- **Modelos de plano sugeridos** para cada combinação: a intensidade se ajusta à categoria (leve, moderada ou alta), com avisos de segurança para idosos, gestantes e reabilitação
- **Relatórios escritos em primeira pessoa**, como o próprio estagiário escreveria: as frases variam de uma pessoa para outra e explicam o que cada resultado significa (ex.: "sinal de mais força nas pernas"). O simples traz visão geral e um parágrafo por pessoa; o final (Pro) traz apresentação, perfil, acompanhamento individual com tabela, atividades em grupo e considerações finais
- **Texto editável antes de salvar:** é só clicar em qualquer parágrafo do relatório, ajustar e depois salvar em PDF

## Como rodar no Windows (PowerShell, VS Code)

Pré-requisitos: Node.js 20 ou mais novo e o seu PostgreSQL (porta padrão 5432).

### 1. Criar o banco

```powershell
psql -U postgres -p 5432 -c "CREATE DATABASE pratik_mov;"
```

### 2. Backend

```powershell
cd pratik-mov\backend
npm install
Copy-Item .env.example .env
```

Abra o `.env` e ajuste:

- `DATABASE_URL`: troque `SUA_SENHA` pela senha do seu Postgres.
- `JWT_SECRET`: gere um segredo e cole o resultado:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Depois crie as tabelas e os dados de demonstração:

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

A API sobe em http://localhost:3001.

### 3. Frontend (outro terminal)

```powershell
cd pratik-mov\frontend
npm install
npm run dev
```

Abra http://localhost:5173 e entre com **julia@demo.com** / **demo12345**.

Dica: confira no terminal se você está dentro de `pratik-mov\backend` ou `pratik-mov\frontend` antes de rodar `npm run dev`, para evitar pastas aninhadas.

### Testar no celular

Com o celular na mesma rede Wi-Fi, rode `npm run dev -- --host` no frontend e abra no celular o endereço "Network" que aparecer.

### Testes automáticos

```powershell
cd pratik-mov\backend
npm test
```

Use um banco de teste separado: os testes criam e apagam usuários.

### Trocar a senha de alguém

```powershell
npm run senha -- email@exemplo.com NovaSenha123
```

### Versão de produção

```powershell
cd pratik-mov\frontend; npm run build
cd ..\backend; $env:NODE_ENV="production"; npm start
```

O backend passa a servir o frontend em http://localhost:3001. Em produção é obrigatório HTTPS (o cookie fica `secure`).

## Segurança aplicada

| Proteção | Onde |
| --- | --- |
| Senhas com bcrypt (custo 12) | `modules/auth.routes.js` |
| Token JWT em cookie httpOnly + SameSite=Strict (contra XSS e CSRF) | `core/auth.js` |
| Só aceita JSON em POST/PUT/PATCH (defesa extra contra CSRF) | `app.js` |
| Limite de tentativas de login e cadastro | `modules/auth.routes.js` |
| Mensagem genérica e tempo constante no login (não revela se o e-mail existe) | `modules/auth.routes.js` |
| Validação de toda entrada com zod | `core/validar.js` |
| Consultas parametrizadas (contra SQL injection) | todo o backend |
| Aluno só acessa as próprias pessoas; recurso de outro responde 404 | `modules/acesso.js` |
| Limite do plano com trava de linha (contra condição de corrida) | `modules/pessoas.routes.js` |
| Cabeçalhos de segurança com helmet | `app.js` |
| Erros sem stack trace nem detalhes do banco | `core/erros.js` |
| Auditoria de ações sem guardar dados de saúde | `core/auditoria.js` |
| Recursos Pro conferidos no banco a cada requisição | `modules/plano.js` |
| Presença só aceita participantes do próprio projeto | `modules/projetos.routes.js` |
| Professor só vê aluno com vínculo aceito e no Pro; tudo só leitura | `modules/professor.routes.js` |
| Cadastro público nunca cria administrador | `modules/auth.routes.js` |
| Medidas de pesquisa de um catálogo fechado, com faixas válidas | `modules/medidas.js` |
| CSV sem nomes e protegido contra fórmulas maliciosas (CSV injection) | `modules/projetos.routes.js` |
| Servidor não sobe sem `JWT_SECRET` forte | `config.js` |

## Estrutura

```
backend/src/
  core/        auth, erros, validação e auditoria (núcleo reaproveitável na linha Pratik)
  modules/     rotas do Pratik Mov
  db/          schema, migração e dados de demonstração
frontend/src/
  paginas/     uma tela por arquivo
  componentes/ layout, ícones e gráfico
```

A pasta `core/` é a base do núcleo compartilhado: quando o Pratik Jus migrar, ela vira um pacote comum aos dois apps.
