import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useSessao } from '../App.jsx';
import { Aviso } from '../componentes/Layout.jsx';
import Icone from '../componentes/Icone.jsx';

export function Marca() {
  return (
    <div className="marca-grande">
      <span className="marca-icone"><Icone nome="marca" tamanho={28} espessura={2.4} /></span>
      <h1>Pratik <span className="destaque">Mov</span></h1>
    </div>
  );
}

export default function Entrar() {
  const { setUsuario } = useSessao();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const r = await api.post('/auth/login', { email, senha });
      setUsuario(r.usuario);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-acesso">
      <Marca />
      <p className="sutil grande">Seus atendimentos de estágio e projetos, do primeiro encontro ao relatório final.</p>
      <form onSubmit={enviar} className="formulario" noValidate>
        <label className="campo">E-mail
          <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="campo">Senha
          <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        <Aviso>{erro}</Aviso>
        <button className="botao" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <Link to="/cadastro" className="botao botao-secundario">Criar conta grátis</Link>
      </form>
      <p className="rodape-acesso">Para uso em estágios e projetos supervisionados por profissional registrado no CREF.</p>
    </div>
  );
}
