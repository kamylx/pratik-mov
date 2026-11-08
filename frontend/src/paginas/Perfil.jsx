import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, iniciaisDe } from '../api.js';
import { useSessao } from '../App.jsx';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';
import Icone from '../componentes/Icone.jsx';

export default function Perfil() {
  const { usuario, sair } = useSessao();
  const pro = usuario.plano === 'pro';
  const [vinculos, setVinculos] = useState([]);
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const carregar = () => api.get('/vinculos').then((r) => setVinculos(r.vinculos)).catch((e) => setErro(e.message));
  useEffect(() => { carregar(); }, []);

  async function convidar(e) {
    e.preventDefault();
    setErro(''); setOk('');
    try {
      await api.post('/vinculos', { email });
      setEmail('');
      setOk('Convite enviado. O professor precisa aceitar para ver seus atendimentos.');
      carregar();
    } catch (err) { setErro(err.message); }
  }

  async function remover(v) {
    if (!window.confirm(`Remover ${v.nome}? Ele deixa de ver seus atendimentos.`)) return;
    try { await api.del(`/vinculos/${v.id}`); carregar(); } catch (err) { setErro(err.message); }
  }

  return (
    <div className="pilha">
      <Cabecalho titulo="Perfil" voltar="/" />
      <header className="perfil">
        <span className="avatar grande">{iniciaisDe(usuario.nome)}</span>
        <div>
          <h1 className="titulo-tela">{usuario.nome}</h1>
          <p className="sutil">{usuario.email}{usuario.curso ? ` · ${usuario.curso}` : ''}</p>
        </div>
      </header>

      <Link to="/pro" className="cartao item-cartao">
        <span className="item-texto"><span className="rotulo">Plano</span><strong>{pro ? 'Pratik Mov Pro' : 'Gratuito'}</strong></span>
        <Icone nome="seta" tamanho={18} />
      </Link>

      <section className="cartao pilha-pequena">
        <h2 className="rotulo">Supervisores</h2>
        <p className="sutil">O professor vinculado vê seus atendimentos e projetos e pode comentar. Ele não altera nada.</p>
        {vinculos.map((v) => (
          <div key={v.id} className="linha-entre linha-divisoria">
            <span className="item-texto"><strong>{v.nome}</strong>
              <span className="sutil">{v.cref ? `CREF ${v.cref}` : v.email} · {v.status === 'ativo' ? 'acompanhando' : 'aguardando aceite'}</span></span>
            <button type="button" className="chip" onClick={() => remover(v)}>Remover</button>
          </div>
        ))}
        {pro ? (
          <form onSubmit={convidar} className="pilha-pequena" noValidate>
            <label className="campo">E-mail do professor
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="professor@faculdade.edu.br" />
            </label>
            <button className="botao botao-secundario">Convidar supervisor</button>
          </form>
        ) : (
          <Link to="/pro" className="link-forte">Vincular supervisor é um recurso do Pro</Link>
        )}
        <Aviso>{erro}</Aviso>
        <Aviso tipo="ok">{ok}</Aviso>
      </section>

      <ul className="lista">
        <li><Link to="/portfolio" className="item"><span className="item-texto"><strong>Meu portfólio</strong><span className="sutil">{pro ? 'sua trajetória no curso' : 'recurso do Pro'}</span></span><Icone nome="seta" tamanho={18} /></Link></li>
        <li><Link to="/termos" className="item"><span className="item-texto"><strong>Termos de uso e privacidade</strong></span><Icone nome="seta" tamanho={18} /></Link></li>
        <li><button type="button" className="item botao-linha" onClick={sair}><span className="item-texto"><strong>Sair</strong></span><Icone nome="sair" tamanho={18} /></button></li>
      </ul>
    </div>
  );
}
