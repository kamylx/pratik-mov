-- Pratik Mov · schema do MVP (fase 2)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  papel       TEXT NOT NULL DEFAULT 'aluno' CHECK (papel IN ('aluno', 'professor', 'admin')),
  plano       TEXT NOT NULL DEFAULT 'gratuito' CHECK (plano IN ('gratuito', 'pro')),
  curso       TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pessoas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id          UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  nascimento        DATE,
  objetivo          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  consentimento_em  TIMESTAMPTZ NOT NULL,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pessoas_aluno_idx ON pessoas(aluno_id);

CREATE TABLE IF NOT EXISTS triagens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id             UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  restricao_medica      BOOLEAN NOT NULL,
  sintomas_esforco      BOOLEAN NOT NULL,
  problema_articular    BOOLEAN NOT NULL,
  liberada              BOOLEAN NOT NULL,
  observacoes           TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  protocolo         TEXT NOT NULL,
  peso_kg           NUMERIC(5,1),
  altura_cm         NUMERIC(5,1),
  cintura_cm        NUMERIC(5,1),
  pressao           TEXT,
  sentar_levantar   INTEGER,
  sentar_alcancar   NUMERIC(5,1),
  caminhada_6min_m  INTEGER,
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS avaliacoes_pessoa_idx ON avaliacoes(pessoa_id, data);

CREATE TABLE IF NOT EXISTS planos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id     UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  objetivo      TEXT NOT NULL,
  frequencia    TEXT NOT NULL,
  duracao_min   INTEGER,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atividades (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id  UUID NOT NULL REFERENCES planos(id) ON DELETE CASCADE,
  ordem     INTEGER NOT NULL,
  nome      TEXT NOT NULL,
  detalhe   TEXT
);

CREATE TABLE IF NOT EXISTS sessoes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id          UUID NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  plano_id           UUID REFERENCES planos(id) ON DELETE SET NULL,
  data               TIMESTAMPTZ NOT NULL DEFAULT now(),
  esforco            INTEGER CHECK (esforco BETWEEN 0 AND 10),
  atividades_feitas  UUID[] NOT NULL DEFAULT '{}',
  observacoes        TEXT
);
CREATE INDEX IF NOT EXISTS sessoes_pessoa_idx ON sessoes(pessoa_id, data);

-- Registro de quem fez o quê (sem guardar dados de saúde no log)
CREATE TABLE IF NOT EXISTS auditoria (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  acao        TEXT NOT NULL,
  entidade    TEXT NOT NULL,
  entidade_id UUID,
  ip          TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== Fase 3 · Pro: projetos em grupo =====
CREATE TABLE IF NOT EXISTS projetos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('extensao', 'pesquisa', 'estagio')),
  local       TEXT,
  horario     TEXT,
  total_encontros INTEGER,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projetos_aluno_idx ON projetos(aluno_id);

CREATE TABLE IF NOT EXISTS participantes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id        UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  nascimento        DATE,
  consentimento_em  TIMESTAMPTZ NOT NULL,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS encontros (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id   UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  atividade    TEXT,
  observacoes  TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS presencas (
  encontro_id     UUID NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  participante_id UUID NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  PRIMARY KEY (encontro_id, participante_id)
);

-- ===== Fase 4 · professor, comentários e pesquisa =====
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cref TEXT;

-- O aluno convida; o professor aceita. Só depois disso o professor enxerga os dados.
CREATE TABLE IF NOT EXISTS vinculos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  professor_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, professor_id)
);

CREATE TABLE IF NOT EXISTS comentarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pessoa_id   UUID REFERENCES pessoas(id) ON DELETE CASCADE,
  projeto_id  UUID REFERENCES projetos(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((pessoa_id IS NULL) <> (projeto_id IS NULL))
);

ALTER TABLE projetos ADD COLUMN IF NOT EXISTS medidas TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS coletas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id       UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  participante_id  UUID NOT NULL REFERENCES participantes(id) ON DELETE CASCADE,
  data             DATE NOT NULL,
  medida           TEXT NOT NULL,
  valor            NUMERIC(7,1) NOT NULL,
  UNIQUE (participante_id, data, medida)
);

-- ===== Categorias de pessoa =====
ALTER TABLE pessoas ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'adulto';
DO $$ BEGIN
  ALTER TABLE pessoas ADD CONSTRAINT pessoas_categoria_check
    CHECK (categoria IN ('idoso', 'adulto', 'atleta', 'crianca', 'gestante', 'reabilitacao'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
