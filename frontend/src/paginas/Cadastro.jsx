import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useSessao } from '../App.jsx';
import { Aviso } from '../componentes/Layout.jsx';
import { Marca } from './Entrar.jsx';

export default function Cadastro() {
  const { setUsuario } = useSessao();
  const [f, setF] = useState({ nome: '', email: '', senha: '', curso: '', cref: '' });
  const [papel, setPapel] = useState('aluno');
  const [aceite, setAceite] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const muda = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (f.senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    if (papel === 'professor' && !/^\d{3,6}-[A-Za-z]\/[A-Za-z]{2}$/.test(f.cref.trim())) return setErro('Informe o CREF no formato 000000-G/UF.');
    if (!aceite) return setErro('Aceite os termos de uso para continuar.');
    setEnviando(true);
    try {
      const r = await api.post('/auth/cadastro', {
        nome: f.nome, email: f.email, senha: f.senha, papel,
        curso: papel === 'aluno' ? f.curso || undefined : undefined,
        cref: papel === 'professor' ? f.cref.trim() : undefined,
      });
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
      <form onSubmit={enviar} className="formulario" noValidate>
        <div className="segmentado" role="group" aria-label="Tipo de conta">
          <button type="button" aria-pressed={papel === 'aluno'} onClick={() => setPapel('aluno')}>Sou aluno</button>
          <button type="button" aria-pressed={papel === 'professor'} onClick={() => setPapel('professor')}>Sou professor</button>
        </div>
        <label className="campo">Nome<input value={f.nome} onChange={muda('nome')} autoComplete="name" required /></label>
        <label className="campo">E-mail<input type="email" value={f.email} onChange={muda('email')} autoComplete="email" required /></label>
        <label className="campo">Senha (mínimo 8 caracteres)<input type="password" value={f.senha} onChange={muda('senha')} autoComplete="new-password" required /></label>
        {papel === 'aluno' ? (
          <label className="campo">Curso<input value={f.curso} onChange={muda('curso')} placeholder="Ex.: Educação Física – Bacharelado" /></label>
        ) : (
          <label className="campo">Nº do CREF<input value={f.cref} onChange={muda('cref')} placeholder="000000-G/UF" /></label>
        )}
        <label className="opcao">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>{papel === 'aluno' ? 'Uso o app em estágios e projetos supervisionados e aceito os' : 'Aceito os'} <Link to="/termos">termos de uso e a política de privacidade</Link>.</span>
        </label>
        <Aviso>{erro}</Aviso>
        <button className="botao" disabled={enviando}>{enviando ? 'Criando…' : 'Criar conta'}</button>
        <Link to="/" className="link-centro">Já tenho conta</Link>
      </form>
    </div>
  );
}
