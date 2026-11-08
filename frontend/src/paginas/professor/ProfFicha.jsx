import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatarData, iniciaisDe } from '../../api.js';
import Comentarios from '../../componentes/Comentarios.jsx';
import Grafico from '../../componentes/Grafico.jsx';
import Icone from '../../componentes/Icone.jsx';
import { Aviso, Cabecalho } from '../../componentes/Layout.jsx';
import { TIPOS } from '../Projetos.jsx';

const mes = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

// Ficha só de leitura para o professor: pessoa ou projeto, com campo para comentar.
export default function ProfFicha({ tipo }) {
  const { alunoId, itemId } = useParams();
  const [f, setF] = useState(null);
  const [erro, setErro] = useState('');
  const caminho = `/professor/alunos/${alunoId}/${tipo === 'pessoa' ? 'pessoas' : 'projetos'}/${itemId}`;

  const carregar = useCallback(() => api.get(caminho).then(setF).catch((e) => setErro(e.message)), [caminho]);
  useEffect(() => { carregar(); }, [carregar]);

  const comentar = async (texto) => {
    await api.post('/professor/comentarios', { aluno_id: alunoId, [tipo === 'pessoa' ? 'pessoa_id' : 'projeto_id']: itemId, texto });
    await carregar();
  };

  if (!f) return <div className="pilha"><Cabecalho titulo="" voltar={`/alunos/${alunoId}`} /><Aviso>{erro}</Aviso></div>;

  if (tipo === 'projeto') {
    const { projeto, participantes, encontros, coletas, comentarios } = f;
    return (
      <div className="pilha">
        <Cabecalho titulo={projeto.nome} subtitulo={[TIPOS[projeto.tipo], projeto.local].filter(Boolean).join(' · ')} voltar={`/alunos/${alunoId}`} />
        <div className="grade-3">
          <div className="medida"><strong>{participantes.filter((p) => p.ativo).length}</strong><span className="sutil">participantes</span></div>
          <div className="medida"><strong>{encontros.length}</strong><span className="sutil">encontros</span></div>
          <div className="medida"><strong>{coletas.length}</strong><span className="sutil">coletas</span></div>
        </div>
        <section className="cartao pilha-pequena">
          <h2 className="rotulo">Encontros</h2>
          {encontros.length === 0 && <p className="sutil">Nenhum encontro.</p>}
          {encontros.slice(0, 8).map((e) => (
            <div key={e.id} className="linha-entre linha-divisoria"><span>{formatarData(e.data)} · {e.atividade || 'sem descrição'}</span><span className="sutil">{e.presentes} presentes</span></div>
          ))}
        </section>
        <Comentarios itens={comentarios} onEnviar={comentar} />
      </div>
    );
  }

  const { pessoa, triagem, avaliacoes, plano, sessoes, comentarios } = f;
  const pontos = avaliacoes.filter((a) => a.sentar_levantar != null).map((a) => ({ valor: a.sentar_levantar, legenda: mes(a.data) }));
  return (
    <div className="pilha">
      <Cabecalho titulo="" voltar={`/alunos/${alunoId}`} />
      <header className="perfil">
        <span className="avatar grande">{iniciaisDe(pessoa.nome)}</span>
        <div><h1 className="titulo-tela">{pessoa.nome}</h1><p className="sutil">{pessoa.objetivo} · desde {formatarData(pessoa.criado_em)}</p></div>
      </header>
      {triagem?.liberada ? (
        <p className="aviso aviso-ok"><Icone nome="check" tamanho={16} /> Triagem liberada</p>
      ) : (
        <p className="aviso aviso-alerta"><Icone nome="alerta" tamanho={16} /> Triagem com restrição</p>
      )}
      <section className="cartao pilha-pequena">
        <div className="linha-entre"><h2 className="rotulo">Sentar e levantar 30 s</h2><span className="sutil">{avaliacoes.length} avaliações</span></div>
        <Grafico pontos={pontos} rotulo="Sentar e levantar (repetições)" />
      </section>
      <section className="cartao pilha-pequena">
        <h2 className="rotulo">Plano atual</h2>
        {!plano && <p className="sutil">Sem plano.</p>}
        {plano && <p><strong>{plano.objetivo}</strong> · {plano.frequencia}</p>}
        {plano?.atividades.map((a, i) => <div key={a.id} className="linha-entre linha-divisoria"><span>{i + 1}. {a.nome}</span><span className="sutil">{a.detalhe}</span></div>)}
      </section>
      <section className="cartao pilha-pequena">
        <h2 className="rotulo">Sessões</h2>
        {sessoes.length === 0 && <p className="sutil">Nenhuma sessão.</p>}
        {sessoes.slice(0, 6).map((s) => (
          <div key={s.id} className="linha-entre linha-divisoria"><span>{formatarData(s.data)}{s.observacoes ? ` · ${s.observacoes}` : ''}</span><span className="sutil">esforço {s.esforco}/10</span></div>
        ))}
      </section>
      <Comentarios itens={comentarios} onEnviar={comentar} />
    </div>
  );
}
