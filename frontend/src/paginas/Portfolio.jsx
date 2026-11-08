import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatarData } from '../api.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';
import { TIPOS } from './Projetos.jsx';

export default function Portfolio() {
  const [p, setP] = useState(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/portfolio').then((r) => setP(r.portfolio)).catch((e) => {
      if (e.codigo === 'recurso_pro') setBloqueado(true); else setErro(e.message);
    });
  }, []);

  if (bloqueado) {
    return (
      <div className="pilha">
        <Cabecalho titulo="Portfólio" voltar="/perfil" />
        <section className="cartao pilha-pequena">
          <p><strong>O portfólio faz parte do Pro.</strong></p>
          <p className="sutil">Reúne tudo o que você fez no curso para mostrar em estágios e entrevistas.</p>
          <Link to="/pro" className="botao">Conhecer o Pro</Link>
        </section>
      </div>
    );
  }
  if (!p) return <div className="pilha"><Cabecalho titulo="Portfólio" voltar="/perfil" /><Aviso>{erro}</Aviso></div>;

  const numeros = [
    ['pessoas atendidas', p.pessoas], ['sessões', p.sessoes], ['avaliações', p.avaliacoes],
    ['projetos em grupo', p.projetos], ['encontros', p.encontros], ['participantes', p.participantes],
  ];

  return (
    <div className="pilha">
      <div className="nao-imprimir"><Cabecalho titulo="Portfólio" voltar="/perfil" /></div>
      <article className="relatorio">
        <p className="sutil">Portfólio de prática · Pratik Mov</p>
        <h2>{p.nome}</h2>
        <p>{p.curso || 'Educação Física'} · registros desde {formatarData(p.desde)}</p>
        <div className="grade-numeros">
          {numeros.map(([r, n]) => <div key={r}><strong>{n}</strong><span>{r}</span></div>)}
        </div>
        {p.objetivos.length > 0 && <section><h3>Áreas de atuação</h3><p>{p.objetivos.join(', ')}.</p></section>}
        {p.protocolos.length > 0 && <section><h3>Protocolos de avaliação aplicados</h3><p>{p.protocolos.join(', ')}.</p></section>}
        {p.lista_projetos.length > 0 && (
          <section><h3>Projetos</h3>
            <ul>{p.lista_projetos.map((pr) => <li key={pr.nome}>{pr.nome} · {TIPOS[pr.tipo]}{pr.local ? ` · ${pr.local}` : ''}</li>)}</ul>
          </section>
        )}
        {p.supervisores.length > 0 && (
          <section><h3>Supervisão</h3><p>{p.supervisores.map((s) => `${s.nome}${s.cref ? ` (CREF ${s.cref})` : ''}`).join(', ')}.</p></section>
        )}
        <p className="sutil">Sem dados pessoais das pessoas atendidas.</p>
      </article>
      <button type="button" className="botao nao-imprimir" onClick={() => window.print()}>Salvar em PDF / imprimir</button>
    </div>
  );
}
