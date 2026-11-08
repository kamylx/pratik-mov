import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatarData, iniciaisDe } from '../../api.js';
import Icone from '../../componentes/Icone.jsx';
import { Aviso, Cabecalho } from '../../componentes/Layout.jsx';
import { TIPOS } from '../Projetos.jsx';

export default function ProfAluno() {
  const { alunoId } = useParams();
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => { api.get(`/professor/alunos/${alunoId}`).then(setD).catch((e) => setErro(e.message)); }, [alunoId]);

  if (!d) return <div className="pilha"><Cabecalho titulo="Aluno" voltar="/" /><Aviso>{erro}</Aviso></div>;

  return (
    <div className="pilha">
      <Cabecalho titulo="" voltar="/" />
      <header className="perfil">
        <span className="avatar grande">{iniciaisDe(d.aluno.nome)}</span>
        <div><h1 className="titulo-tela">{d.aluno.nome}</h1><p className="sutil">{d.aluno.curso || 'Educação Física'}</p></div>
      </header>

      <section className="pilha-pequena">
        <h2 className="rotulo">Atendimentos individuais</h2>
        {d.pessoas.length === 0 && <p className="sutil">Nenhuma pessoa cadastrada.</p>}
        {d.pessoas.length > 0 && (
          <ul className="lista">
            {d.pessoas.map((p) => (
              <li key={p.id}><Link to={`/alunos/${alunoId}/pessoas/${p.id}`} className="item">
                <span className="item-texto"><strong>{p.nome}</strong>
                  <span className="sutil">{p.objetivo} · {p.ultima_sessao ? `última sessão ${formatarData(p.ultima_sessao)}` : 'sem sessões'}{p.comentarios ? ` · ${p.comentarios} comentários` : ''}</span></span>
                {p.liberada === false && <span className="selo selo-alerta">Restrição</span>}
                <Icone nome="seta" tamanho={18} />
              </Link></li>
            ))}
          </ul>
        )}
      </section>

      <section className="pilha-pequena">
        <h2 className="rotulo">Projetos</h2>
        {d.projetos.length === 0 && <p className="sutil">Nenhum projeto.</p>}
        {d.projetos.length > 0 && (
          <ul className="lista">
            {d.projetos.map((p) => (
              <li key={p.id}><Link to={`/alunos/${alunoId}/projetos/${p.id}`} className="item">
                <span className="item-texto"><strong>{p.nome}</strong><span className="sutil">{TIPOS[p.tipo]} · {p.participantes} participantes · {p.encontros} encontros</span></span>
                <Icone nome="seta" tamanho={18} />
              </Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
