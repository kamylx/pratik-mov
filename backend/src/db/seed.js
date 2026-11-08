// Cria uma aluna de demonstração com uma pessoa atendida.
const bcrypt = require('bcryptjs');
const { pool, transacao } = require('./pool');

async function seed() {
  await transacao(async (c) => {
    const senha = await bcrypt.hash('demo12345', 12);
    const { rows: [aluna] } = await c.query(
      `INSERT INTO usuarios (nome, email, senha_hash, curso)
       VALUES ('Júlia Santos', 'julia@demo.com', $1, 'Educação Física – Bacharelado')
       ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
      [senha]
    );
    const { rows: [pessoa] } = await c.query(
      `INSERT INTO pessoas (aluno_id, nome, nascimento, objetivo, categoria, consentimento_em)
       VALUES ($1, 'Antônio Ribeiro', '1959-03-12', 'Fortalecimento', 'idoso', now()) RETURNING id`,
      [aluna.id]
    );
    await c.query(
      `INSERT INTO triagens (pessoa_id, restricao_medica, sintomas_esforco, problema_articular, liberada)
       VALUES ($1, false, false, false, true)`, [pessoa.id]
    );
    const avaliacoes = [
      ['2026-09-02', 80.0, 99, 9, -9, 395],
      ['2026-10-01', 79.2, 97.5, 11, -6, 410],
      ['2026-11-03', 78.4, 96, 14, -4, 430],
    ];
    for (const [data, peso, cintura, sl, sa, cam] of avaliacoes) {
      await c.query(
        `INSERT INTO avaliacoes (pessoa_id, data, protocolo, peso_kg, altura_cm, cintura_cm,
           sentar_levantar, sentar_alcancar, caminhada_6min_m)
         VALUES ($1, $2, 'Bateria para idosos', $3, 172, $4, $5, $6, $7)`,
        [pessoa.id, data, peso, cintura, sl, sa, cam]
      );
    }
    const { rows: [plano] } = await c.query(
      `INSERT INTO planos (pessoa_id, objetivo, frequencia, duracao_min)
       VALUES ($1, 'Fortalecimento', '3x por semana', 40) RETURNING id`, [pessoa.id]
    );
    const atividades = [
      ['Caminhada de aquecimento', '10 min · ritmo leve'],
      ['Sentar e levantar da cadeira', '3 séries de 10'],
      ['Remada com elástico', '3 séries de 12'],
      ['Elevação de calcanhar', '3 séries de 15 · com apoio'],
      ['Alongamento final', '5 min'],
    ];
    for (const [i, [nome, detalhe]] of atividades.entries()) {
      await c.query(
        'INSERT INTO atividades (plano_id, ordem, nome, detalhe) VALUES ($1, $2, $3, $4)',
        [plano.id, i + 1, nome, detalhe]
      );
    }

    // Sessões do Antônio.
    const { rows: ats } = await c.query('SELECT id FROM atividades WHERE plano_id = $1 ORDER BY ordem', [plano.id]);
    for (const [data, esforco, obs] of [
      ['2026-10-20', 5, null], ['2026-10-22', 5, null], ['2026-10-27', 6, 'Sentiu leve cansaço na remada.'],
      ['2026-10-29', 6, null], ['2026-11-03', 6, 'Boa disposição, aumentar o elástico na próxima.'],
    ]) {
      await c.query(
        `INSERT INTO sessoes (pessoa_id, plano_id, data, esforco, atividades_feitas, observacoes)
         VALUES ($1, $2, $3, $4, $5, $6)`, [pessoa.id, plano.id, `${data}T08:00:00-03:00`, esforco, ats.map((a) => a.id), obs]
      );
    }

    // Outras pessoas, de categorias e treinos diferentes.
    const outras = [
      ['Carla Mendes', '1984-07-21', 'Emagrecimento', 'adulto', [[82.0, 94, 410], [80.1, 91, 445]]],
      ['Marcos Santos', '2002-02-14', 'Desempenho', 'atleta', [[74.5, 80, 640], [75.2, 79, 672]]],
      ['Rosa Lima', '1951-11-05', 'Equilíbrio', 'idoso', [[61.0, 88, 330], [60.6, 87, 352]]],
      ['Tereza Farias', '1968-09-30', 'Mobilidade', 'reabilitacao', [[70.2, 90, 380]]],
      ['Lucas Oliveira', '2011-05-03', 'Condicionamento', 'crianca', [[42.0, 66, 520], [43.1, 66, 548]]],
    ];
    for (const [nome, nasc, objetivo, categoria, avs] of outras) {
      const { rows: [p] } = await c.query(
        `INSERT INTO pessoas (aluno_id, nome, nascimento, objetivo, categoria, consentimento_em)
         VALUES ($1, $2, $3, $4, $5, now()) RETURNING id`, [aluna.id, nome, nasc, objetivo, categoria]
      );
      await c.query(
        `INSERT INTO triagens (pessoa_id, restricao_medica, sintomas_esforco, problema_articular, liberada)
         VALUES ($1, false, false, false, true)`, [p.id]
      );
      for (const [i, [peso, cintura, cam]] of avs.entries()) {
        await c.query(
          `INSERT INTO avaliacoes (pessoa_id, data, protocolo, peso_kg, cintura_cm, caminhada_6min_m)
           VALUES ($1, $2, 'Avaliação de academia', $3, $4, $5)`, [p.id, i ? '2026-10-30' : '2026-09-25', peso, cintura, cam]
        );
      }
      await c.query(
        `INSERT INTO sessoes (pessoa_id, data, esforco) VALUES ($1, '2026-11-02T10:00:00-03:00', $2)`,
        [p.id, categoria === 'atleta' ? 8 : 5]
      );
    }

    // Projeto em grupo (aparece quando a conta estiver no Pro).
    const { rows: [projeto] } = await c.query(
      `INSERT INTO projetos (aluno_id, nome, tipo, local, horario, total_encontros)
       VALUES ($1, 'Caminhada Ativa', 'extensao', 'Praça da República', 'ter e qui, 7h', 24) RETURNING id`,
      [aluna.id]
    );
    const nomes = ['Benedita Costa', 'Francisco Lopes', 'Helena Martins', 'José Almeida', 'Lúcia Pereira', 'Raimundo Silva'];
    const ids = [];
    for (const nome of nomes) {
      const { rows: [pa] } = await c.query(
        `INSERT INTO participantes (projeto_id, nome, consentimento_em) VALUES ($1, $2, now()) RETURNING id`,
        [projeto.id, nome]
      );
      ids.push(pa.id);
    }
    for (const [data, atividade, faltas] of [
      ['2026-10-27', 'Caminhada 30 min + alongamento', [2]],
      ['2026-10-29', 'Caminhada 30 min + mobilidade', [2, 5]],
      ['2026-11-03', 'Caminhada 35 min + equilíbrio', [2]],
    ]) {
      const { rows: [e] } = await c.query(
        'INSERT INTO encontros (projeto_id, data, atividade) VALUES ($1, $2, $3) RETURNING id', [projeto.id, data, atividade]
      );
      const presentes = ids.filter((_, i) => !faltas.includes(i));
      await c.query('INSERT INTO presencas (encontro_id, participante_id) SELECT $1, unnest($2::uuid[])', [e.id, presentes]);
    }

    // Medidas de pesquisa do projeto e uma coleta inicial.
    await c.query("UPDATE projetos SET medidas = '{pressao_sistolica,caminhada_6min_m}' WHERE id = $1", [projeto.id]);
    for (const [i, pid] of ids.entries()) {
      await c.query(
        `INSERT INTO coletas (projeto_id, participante_id, data, medida, valor) VALUES
         ($1, $2, '2026-10-27', 'pressao_sistolica', $3), ($1, $2, '2026-10-27', 'caminhada_6min_m', $4)`,
        [projeto.id, pid, 128 + i * 3, 380 + i * 12]
      );
    }
    await c.query("UPDATE participantes SET nascimento = '1956-04-02' WHERE projeto_id = $1", [projeto.id]);

    // Professor supervisor já vinculado à aluna.
    const { rows: [prof] } = await c.query(
      `INSERT INTO usuarios (nome, email, senha_hash, papel, cref)
       VALUES ('Ricardo Souza', 'ricardo@demo.com', $1, 'professor', '012345-G/PA')
       ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`, [senha]
    );
    await c.query(
      `INSERT INTO vinculos (aluno_id, professor_id, status) VALUES ($1, $2, 'ativo')
       ON CONFLICT (aluno_id, professor_id) DO UPDATE SET status = 'ativo'`, [aluna.id, prof.id]
    );
    await c.query(
      'INSERT INTO comentarios (autor_id, pessoa_id, texto) VALUES ($1, $2, $3)',
      [prof.id, pessoa.id, 'Boa progressão no sentar e levantar. Na próxima semana, tente a remada com elástico mais forte.']
    );
  });
  console.log('Demo criada: aluna julia@demo.com e professor ricardo@demo.com (senha demo12345)');
}

seed().then(() => pool.end()).catch((err) => { console.error(err.message); process.exit(1); });
