# Publicar o Pratik Mov para teste (beta)

O app vai ficar assim:

- **Render** (gratuito) roda o app e entrega um endereço `https://...onrender.com`.
- **Neon** (gratuito) guarda o banco PostgreSQL. Os dados não expiram, ao contrário do banco gratuito do Render, que é apagado depois de 30 dias.
- **GitHub** guarda o código. O Render publica a partir dele, e cada `git push` atualiza o app sozinho.

Tempo estimado: 30 a 40 minutos na primeira vez.

## 0. Antes de começar

Crie as três contas (pode entrar no Render e no Neon com a conta do GitHub):

- https://github.com
- https://neon.com
- https://render.com

Confira se o Git está instalado:

```powershell
git --version
```

Se não estiver, instale em https://git-scm.com/download/win e abra um PowerShell novo. Na primeira vez, configure seu nome e e-mail:

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "seu@email.com"
```

## 1. Banco no Neon

1. No Neon, clique em **New Project**.
2. Nome: `pratik-mov`. Região: **AWS US East 1 (N. Virginia)**, a mesma do servidor no Render, para o app ficar rápido.
3. Depois de criado, clique em **Connect** e copie a **connection string**. Ela começa com `postgresql://` e termina com `?sslmode=require`.
4. Guarde essa linha: ela é a senha do banco. Não coloque no GitHub nem mande por mensagem.

As tabelas são criadas sozinhas quando o app sobe, então não precisa rodar nada no banco.

## 2. Código no GitHub

1. No GitHub, clique em **New repository**. Nome: `pratik-mov`. Marque **Private**. Não marque README nem .gitignore.
2. No PowerShell, entre na pasta que tem o `render.yaml` e as pastas `backend` e `frontend`:

```powershell
cd C:\Users\usuario\Desktop\pratik-mov-v2\pratik-mov
git init
git add .
git status
```

3. **Confira a lista do `git status`:** não pode aparecer `.env` nem `node_modules`. O arquivo `.gitignore` já cuida disso, mas confira, porque o `.env` tem a sua senha.
4. Envie (troque `SEU_USUARIO` pelo seu usuário do GitHub):

```powershell
git commit -m "Pratik Mov beta"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/pratik-mov.git
git push -u origin main
```

Na primeira vez, o Windows abre uma janela para você entrar no GitHub.

## 3. App no Render

1. No Render, clique em **New** › **Blueprint**.
2. Conecte o GitHub e escolha o repositório `pratik-mov`. O Render lê o arquivo `render.yaml` e já preenche tudo.
3. Ele pede o valor de **DATABASE_URL**: cole a connection string do Neon.
4. Clique em **Deploy Blueprint** (ou **Apply**).
5. Espere de 3 a 5 minutos. Quando aparecer **Live**, o endereço fica no topo da página, algo como `https://pratik-mov.onrender.com`.

O `JWT_SECRET` é gerado automaticamente pelo Render, e o `BETA_PRO=true` faz toda conta nova de aluno já nascer no Pro.

## 4. Testar

1. Abra `https://SEU-ENDERECO.onrender.com/api/saude`. Tem que aparecer `{"ok":true}`.
2. Abra o endereço principal no celular, crie uma conta de aluno e veja se o menu **Projetos** e o **Relatório final** estão liberados.
3. Cole o endereço no manual da sua colega, no lugar de `[COLE AQUI O ENDEREÇO DO APP]`, e mande o link do manual para ela.

## 5. Atualizar o app depois

Sempre que eu mandar uma versão nova, extraia por cima da pasta e rode:

```powershell
git add .
git commit -m "Descreva a mudança"
git push
```

O Render publica sozinho em poucos minutos.

## 6. Comandos úteis no banco de produção

Rode do seu computador, na pasta `backend`, apontando para o Neon só naquele terminal:

```powershell
$env:DATABASE_URL = "COLE_A_CONNECTION_STRING_DO_NEON"
npm run senha -- email@dela.com NovaSenha123   # quando alguém esquecer a senha
npm run plano -- email@dela.com pro            # mudar o plano de alguém
Remove-Item Env:DATABASE_URL                   # volta a usar o banco local
```

**Nunca rode `npm run db:seed` no banco do Neon.** Ele cria as contas de demonstração com a senha `demo12345`, que qualquer pessoa conseguiria usar no app publicado.

## 7. Limites do plano gratuito

- **Render:** o app "dorme" depois de 15 minutos sem uso e leva cerca de 1 minuto para acordar no próximo acesso. São 750 horas por mês, o suficiente para um app só.
- **Neon:** 1 GB de dados e o banco também dorme quando ninguém usa (acorda em menos de 1 segundo). Para o teste, sobra.

Quando o teste acabar e a cobrança entrar, mude `BETA_PRO` para `false` no Render (**Environment**) para as contas novas voltarem a nascer no plano gratuito.
