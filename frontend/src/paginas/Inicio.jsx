import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatarData, iniciaisDe } from '../api.js';
import { useSessao } from '../App.jsx';
import { LISTA_OBJETIVOS, OBJETIVOS, tinta } from '../catalogo.js';
import Icone from '../componentes/Icone.jsx';
import { Aviso } from '../componentes/Layout.jsx';
import { AvatarTreino, TagTreino } from '../componentes/Tags.jsx';

export default function Inicio() {
  const { usuario } = useSessao();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => { api.get('/inicio').then(setDados).catch((e) => setErro(e.message)); }, []);

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const uso = dados?.uso;
  const porTreino = new Map();
  for (const d of dados?.distribuicao ?? []) porTreino.set(d.objetivo, (porTreino.get(d.objetivo) ?? 0) + d.total);
  const treinos = LISTA_OBJETIVOS.filter((o) => porTreino.has(o));

  return (
    <div className="pilha">
      <header className="topo">
        <div className="marca-pequena"><span className="marca-icone pequena"><Icone nome="marca" tamanho={18} espessura={2.4} /></span>Pratik <span className="destaque">Mov</span></div>
        <Link to="/perfil" className="avatar pequeno-link" aria-label="Perfil">{iniciaisDe(usuario.nome)}</Link>
      </header>

      <section className="boas-vindas">
        <p className="sutil primeira-maiuscula">{hoje}</p>
        <h1 className="titulo-grande">Olá, {usuario.nome.split(' ')[0]}</h1>
        {uso && (
          <div className="boas-vindas-numeros">
            <div><strong>{uso.total}</strong><span>pessoas</span></div>
            <div><strong>{treinos.length}</strong><span>tipos de treino</span></div>
            <div><strong>{dados.sessoesRecentes.length}</strong><span>sessões recentes</span></div>
          </div>
        )}
      </section>
      <Aviso>{erro}</Aviso>

      <div className="grade-2">
        <Link to="/pessoas/nova" className="atalho atalho-forte"><Icone nome="novaPessoa" tamanho={22} /><span>Nova pessoa</span></Link>
        <Link to="/relatorio" className="atalho"><Icone nome="relatorio" tamanho={22} /><span>Relatório</span></Link>
      </div>

      {treinos.length > 0 && (
        <section className="pilha-pequena">
          <h2 className="rotulo">Seus treinos</h2>
          <div className="grade-treinos">
            {treinos.map((o) => (
              <Link key={o} to={`/pessoas?treino=${encodeURIComponent(o)}`} className="cartao-treino" style={tinta(o)}>
                <span className="cartao-treino-icone"><Icone nome={OBJETIVOS[o].icone} tamanho={20} espessura={2.2} /></span>
                <strong>{o}</strong>
                <span className="sutil">{porTreino.get(o)} {porTreino.get(o) === 1 ? 'pessoa' : 'pessoas'}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {uso && uso.limite !== null && (
        <section className="cartao plano-uso">
          <div className="linha-entre">
            <span className="rotulo">Plano gratuito</span>
            <Link to="/pro" className="link-forte">Ver o Pro</Link>
          </div>
          <p><strong>{uso.total} de {uso.limite}</strong> <span className="sutil">pessoas atendidas</span></p>
          <div className="progresso"><div style={{ width: `${Math.min(100, (uso.total / uso.limite) * 100)}%` }} /></div>
        </section>
      )}

      {dados?.paraReavaliar?.length > 0 && (
        <section className="pilha-pequena">
          <h2 className="rotulo">Reavaliar</h2>
          <ul className="lista">
            {dados.paraReavaliar.map((p) => (
              <li key={p.id}><Link to={`/pessoas/${p.id}/avaliacao`} className="item">
                <span className="item-texto"><strong>{p.nome}</strong>
                  <span className="sutil">{p.ultima_avaliacao ? `Última avaliação em ${formatarData(p.ultima_avaliacao)}` : 'Sem avaliação ainda'}</span></span>
                <span className="selo selo-alerta">Reavaliar</span>
              </Link></li>
            ))}
          </ul>
        </section>
      )}

      <section className="pilha-pequena">
        <h2 className="rotulo">Últimas sessões</h2>
        {dados && dados.sessoesRecentes.length === 0 && <p className="sutil">Nenhuma sessão registrada ainda.</p>}
        {dados?.sessoesRecentes?.length > 0 && (
          <ul className="lista">
            {dados.sessoesRecentes.map((s) => (
              <li key={s.id}><Link to={`/pessoas/${s.pessoa_id}`} className="item">
                <AvatarTreino nome={s.nome} objetivo={s.objetivo} />
                <span className="item-texto"><strong>{s.nome}</strong>
                  <span className="sutil">{formatarData(s.data)} · esforço {s.esforco}/10</span></span>
                <TagTreino objetivo={s.objetivo} />
              </Link></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
