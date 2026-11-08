import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, formatarData } from '../api.js';
import { CATEGORIAS, LISTA_OBJETIVOS, OBJETIVOS, tinta } from '../catalogo.js';
import Icone from '../componentes/Icone.jsx';
import { Aviso } from '../componentes/Layout.jsx';
import { AvatarTreino, TagCategoria } from '../componentes/Tags.jsx';

const precisaReavaliar = (p) =>
  !p.ultima_avaliacao || (Date.now() - new Date(p.ultima_avaliacao)) / 864e5 > 30;

export default function Pessoas() {
  const [params, setParams] = useSearchParams();
  const treino = params.get('treino') ?? '';
  const categoria = params.get('categoria') ?? '';
  const [dados, setDados] = useState(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => { api.get('/pessoas').then(setDados).catch((e) => setErro(e.message)); }, []);

  const filtrar = (k, v) => {
    const n = new URLSearchParams(params);
    if (!v || n.get(k) === v) n.delete(k); else n.set(k, v);
    setParams(n, { replace: true });
  };

  const pessoas = dados?.pessoas ?? [];
  const lista = useMemo(() => pessoas
    .filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))
    .filter((p) => !treino || p.objetivo === treino)
    .filter((p) => !categoria || p.categoria === categoria), [pessoas, busca, treino, categoria]);

  // Agrupa por tipo de treino, na ordem do catálogo.
  const grupos = LISTA_OBJETIVOS.map((o) => [o, lista.filter((p) => p.objetivo === o)]).filter(([, l]) => l.length);
  const treinosUsados = LISTA_OBJETIVOS.filter((o) => pessoas.some((p) => p.objetivo === o));
  const categoriasUsadas = Object.keys(CATEGORIAS).filter((c) => pessoas.some((p) => p.categoria === c));
  const uso = dados?.uso;
  const cheio = uso && uso.limite !== null && uso.total >= uso.limite;

  return (
    <div className="pilha">
      <header className="linha-entre">
        <div>
          <h1 className="titulo-grande">Pessoas</h1>
          {uso && <p className="sutil">{uso.limite !== null ? `${uso.total} de ${uso.limite} no plano gratuito` : `${uso.total} pessoas`}</p>}
        </div>
        <Link to={cheio ? '/pro' : '/pessoas/nova'} className="botao-quadrado" aria-label="Nova pessoa"><Icone nome="mais" tamanho={22} espessura={2.4} /></Link>
      </header>
      <Aviso>{erro}</Aviso>
      {cheio && <Aviso tipo="info">Você chegou ao limite do plano gratuito. <Link to="/pro">Conheça o Pro</Link>.</Aviso>}

      <label className="campo-busca">
        <span className="visualmente-oculto">Buscar pessoa</span>
        <Icone nome="lupa" tamanho={18} />
        <input type="search" placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </label>

      {treinosUsados.length > 0 && (
        <div className="filtro-bloco">
          <span className="rotulo">Treino</span>
          <div className="chips rolagem-x" role="group" aria-label="Filtrar por treino">
            {treinosUsados.map((o) => (
              <button key={o} type="button" className="chip chip-treino" style={tinta(o)} aria-pressed={treino === o} onClick={() => filtrar('treino', o)}>
                <Icone nome={OBJETIVOS[o].icone} tamanho={14} espessura={2.2} />{o}
              </button>
            ))}
          </div>
        </div>
      )}
      {categoriasUsadas.length > 1 && (
        <div className="filtro-bloco">
          <span className="rotulo">Categoria</span>
          <div className="chips rolagem-x" role="group" aria-label="Filtrar por categoria">
            {categoriasUsadas.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={categoria === c} onClick={() => filtrar('categoria', c)}>
                <Icone nome={CATEGORIAS[c].icone} tamanho={14} />{CATEGORIAS[c].curto ?? CATEGORIAS[c].rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {dados && lista.length === 0 && (
        <p className="sutil">{pessoas.length === 0 ? 'Cadastre a primeira pessoa que você atende.' : 'Ninguém encontrado com esses filtros.'}</p>
      )}

      {grupos.map(([objetivo, gente]) => (
        <section key={objetivo} className="grupo-treino" style={tinta(objetivo)}>
          <h2 className="grupo-treino-titulo">
            <span className="cartao-treino-icone pequeno"><Icone nome={OBJETIVOS[objetivo].icone} tamanho={16} espessura={2.2} /></span>
            {objetivo}<span className="sutil">{gente.length}</span>
          </h2>
          <ul className="lista">
            {gente.map((p) => (
              <li key={p.id}><Link to={`/pessoas/${p.id}`} className="item">
                <AvatarTreino nome={p.nome} objetivo={p.objetivo} />
                <span className="item-texto"><strong>{p.nome}</strong>
                  <span className="linha-tags"><TagCategoria categoria={p.categoria} />
                    <span className="sutil">{p.ultima_sessao ? `última sessão ${formatarData(p.ultima_sessao)}` : 'sem sessões'}</span></span></span>
                {p.liberada === false && <span className="selo selo-alerta">Restrição</span>}
                {p.liberada !== false && precisaReavaliar(p) && <span className="selo selo-alerta">Reavaliar</span>}
              </Link></li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
