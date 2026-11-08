import { NavLink, Outlet } from 'react-router-dom';
import Icone from './Icone.jsx';

const itens = [
  { para: '/', rotulo: 'Início', icone: 'inicio', fim: true },
  { para: '/pessoas', rotulo: 'Pessoas', icone: 'pessoas' },
  { para: '/projetos', rotulo: 'Projetos', icone: 'projetos' },
  { para: '/relatorio', rotulo: 'Relatório', icone: 'relatorio' },
];

export default function Layout({ professor = false }) {
  const lista = professor ? [{ para: '/', rotulo: 'Alunos', icone: 'pessoas', fim: true }] : itens;
  return (
    <div className="app">
      <main className="conteudo">
        <Outlet />
      </main>
      <nav className={`barra${professor ? ' barra-unica' : ''}`} aria-label="Navegação principal">
        {lista.map((i) => (
          <NavLink key={i.para} to={i.para} end={i.fim} className="barra-item">
            <span className="barra-icone"><Icone nome={i.icone} /></span>
            {i.rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Cabecalho({ titulo, subtitulo, voltar }) {
  return (
    <header className="cabecalho">
      {voltar && (
        <NavLink to={voltar} className="botao-icone" aria-label="Voltar"><Icone nome="voltar" tamanho={22} /></NavLink>
      )}
      <div>
        <h1 className="titulo-tela">{titulo}</h1>
        {subtitulo && <p className="sutil">{subtitulo}</p>}
      </div>
    </header>
  );
}

export function Aviso({ tipo = 'erro', children }) {
  if (!children) return null;
  return <p className={`aviso aviso-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>{children}</p>;
}
