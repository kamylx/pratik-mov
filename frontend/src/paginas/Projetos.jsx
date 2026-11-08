import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Icone from '../componentes/Icone.jsx';
import { Aviso } from '../componentes/Layout.jsx';

export const TIPOS = { extensao: 'Extensão', pesquisa: 'Pesquisa', estagio: 'Estágio' };

export function ConviteProjetos() {
  return (
    <div className="pilha">
      <h1 className="titulo-grande">Projetos e pesquisas</h1>
      <section className="cartao pilha-pequena">
        <span className="selo-pro grande">PRO</span>
        <p><strong>Grupos de caminhada, trabalhos com idosos, pesquisas e estágios.</strong></p>
        <p className="sutil">Cadastre participantes, marque a presença de todos de uma vez e leve tudo para o relatório final.</p>
        <Link to="/pro" className="botao">Conhecer o Pro</Link>
      </section>
    </div>
  );
}

export default function Projetos() {
  const [projetos, setProjetos] = useState(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/projetos').then((r) => setProjetos(r.projetos)).catch((e) => {
      if (e.codigo === 'recurso_pro') setBloqueado(true); else setErro(e.message);
    });
  }, []);

  if (bloqueado) return <ConviteProjetos />;

  return (
    <div className="pilha">
      <header className="linha-entre">
        <div>
          <h1 className="titulo-grande">Projetos</h1>
          <p className="sutil">Extensão, pesquisa e estágio em grupo</p>
        </div>
        <Link to="/projetos/novo" className="botao-quadrado" aria-label="Novo projeto"><Icone nome="mais" tamanho={22} espessura={2.4} /></Link>
      </header>
      <Aviso>{erro}</Aviso>
      {projetos && projetos.length === 0 && <p className="sutil">Crie o primeiro projeto em grupo.</p>}
      {projetos?.length > 0 && (
        <ul className="lista">
          {projetos.map((p) => (
            <li key={p.id}><Link to={`/projetos/${p.id}`} className="item">
              <span className="avatar"><Icone nome="projetos" /></span>
              <span className="item-texto"><strong>{p.nome}</strong>
                <span className="sutil">{TIPOS[p.tipo]} · {p.participantes} participantes · {p.encontros}{p.total_encontros ? `/${p.total_encontros}` : ''} encontros</span></span>
              <Icone nome="seta" tamanho={18} />
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
