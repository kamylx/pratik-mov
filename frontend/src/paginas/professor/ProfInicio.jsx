import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, iniciaisDe } from '../../api.js';
import { useSessao } from '../../App.jsx';
import Icone from '../../componentes/Icone.jsx';
import { Aviso } from '../../componentes/Layout.jsx';

export default function ProfInicio() {
  const { usuario, sair } = useSessao();
  const [vinculos, setVinculos] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = () => api.get('/professor/vinculos').then((r) => setVinculos(r.vinculos)).catch((e) => setErro(e.message));
  useEffect(() => { carregar(); }, []);

  async function aceitar(v) {
    try { await api.post(`/professor/vinculos/${v.id}/aceitar`, {}); carregar(); } catch (e) { setErro(e.message); }
  }
  async function recusar(v) {
    if (!window.confirm(`Remover ${v.nome} da sua lista?`)) return;
    try { await api.del(`/professor/vinculos/${v.id}`); carregar(); } catch (e) { setErro(e.message); }
  }

  const pendentes = vinculos?.filter((v) => v.status === 'pendente') ?? [];
  const ativos = vinculos?.filter((v) => v.status === 'ativo') ?? [];

  return (
    <div className="pilha">
      <header className="topo">
        <div className="marca-pequena"><span className="marca-icone pequena"><Icone nome="marca" tamanho={18} espessura={2.4} /></span>Pratik <span className="destaque">Mov</span></div>
        <button className="botao-icone" onClick={sair} aria-label="Sair"><Icone nome="sair" /></button>
      </header>
      <div>
        <p className="sutil">Professor · CREF {usuario.cref}</p>
        <h1 className="titulo-grande">Olá, {usuario.nome.split(' ')[0]}</h1>
      </div>
      <Aviso>{erro}</Aviso>

      {pendentes.length > 0 && (
        <section className="pilha-pequena">
          <h2 className="rotulo">Convites</h2>
          <ul className="lista">
            {pendentes.map((v) => (
              <li key={v.id} className="item">
                <span className="avatar">{iniciaisDe(v.nome)}</span>
                <span className="item-texto"><strong>{v.nome}</strong><span className="sutil">{v.curso || 'quer que você acompanhe os atendimentos'}</span></span>
                <button type="button" className="chip" aria-pressed="true" onClick={() => aceitar(v)}>Aceitar</button>
                <button type="button" className="botao-icone" aria-label={`Recusar ${v.nome}`} onClick={() => recusar(v)}>×</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pilha-pequena">
        <h2 className="rotulo">Alunos que você acompanha</h2>
        {vinculos && ativos.length === 0 && <p className="sutil">Quando um aluno te convidar pelo e-mail {usuario.email}, o convite aparece aqui.</p>}
        {ativos.length > 0 && (
          <ul className="lista">
            {ativos.map((v) => (
              <li key={v.id}>{v.inativo ? (
                <div className="item"><span className="avatar">{iniciaisDe(v.nome)}</span>
                  <span className="item-texto"><strong>{v.nome}</strong><span className="sutil">Acesso pausado: o aluno não está no Pro</span></span></div>
              ) : (
                <Link to={`/alunos/${v.aluno_id}`} className="item"><span className="avatar">{iniciaisDe(v.nome)}</span>
                  <span className="item-texto"><strong>{v.nome}</strong><span className="sutil">{v.pessoas} {v.pessoas === 1 ? 'pessoa' : 'pessoas'} · {v.projetos} {v.projetos === 1 ? 'projeto' : 'projetos'}</span></span>
                  <Icone nome="seta" tamanho={18} /></Link>
              )}</li>
            ))}
          </ul>
        )}
      </section>
      <p className="sutil">Você só vê os alunos que te convidaram e cujo convite você aceitou. Nada pode ser alterado por aqui: só comentado.</p>
    </div>
  );
}
