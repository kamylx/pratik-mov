import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, numero } from '../api.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';
import Icone from '../componentes/Icone.jsx';
import { CATEGORIAS, LISTA_OBJETIVOS, OBJETIVOS, tinta } from '../catalogo.js';

// Sugestões rápidas; o aluno pode digitar qualquer atividade.
const BIBLIOTECA = [
  ['Caminhada de aquecimento', '10 min · ritmo leve'],
  ['Sentar e levantar da cadeira', '3 séries de 10'],
  ['Remada com elástico', '3 séries de 12'],
  ['Elevação de calcanhar', '3 séries de 15'],
  ['Marcha estacionária', '2 min'],
  ['Alongamento final', '5 min'],
];

export default function EditarPlano() {
  const { id } = useParams();
  const nav = useNavigate();
  const [nome, setNome] = useState('');
  const [p, setP] = useState({ objetivo: '', frequencia: '3x por semana', duracao_min: '40' });
  const [atividades, setAtividades] = useState([]);
  const [bloqueado, setBloqueado] = useState(false);
  const [categoria, setCategoria] = useState('adulto');
  const [modelo, setModelo] = useState(null);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get(`/pessoas/${id}`).then((f) => {
      setNome(f.pessoa.nome);
      setCategoria(f.pessoa.categoria);
      setBloqueado(!f.triagem?.liberada);
      if (f.plano) {
        setP({ objetivo: f.plano.objetivo, frequencia: f.plano.frequencia, duracao_min: String(f.plano.duracao_min ?? '') });
        setAtividades(f.plano.atividades.map((a) => ({ nome: a.nome, detalhe: a.detalhe ?? '' })));
      } else {
        setP((x) => ({ ...x, objetivo: f.pessoa.objetivo }));
      }
    }).catch((e) => setErro(e.message));
  }, [id]);

  // Busca o modelo sugerido para a categoria da pessoa e o treino escolhido.
  useEffect(() => {
    if (!LISTA_OBJETIVOS.includes(p.objetivo)) { setModelo(null); return; }
    api.get(`/pessoas/${id}/modelo?objetivo=${encodeURIComponent(p.objetivo)}`).then((r) => setModelo(r.modelo)).catch(() => setModelo(null));
  }, [id, p.objetivo]);

  const usarModelo = () => {
    if (atividades.length && !window.confirm('Substituir as atividades atuais pelas do modelo?')) return;
    setAtividades(modelo.atividades.map((a) => ({ nome: a.nome, detalhe: a.detalhe })));
    setP((x) => ({ ...x, frequencia: modelo.frequencia }));
  };

  const mudaAtividade = (i, k, valor) => setAtividades(atividades.map((a, j) => (j === i ? { ...a, [k]: valor } : a)));
  const remover = (i) => setAtividades(atividades.filter((_, j) => j !== i));
  const adicionar = (nomeA = '', detalhe = '') => setAtividades([...atividades, { nome: nomeA, detalhe }]);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    const lista = atividades.filter((a) => a.nome.trim()).map((a) => ({ nome: a.nome.trim(), detalhe: a.detalhe.trim() || undefined }));
    if (!lista.length) return setErro('Adicione ao menos uma atividade.');
    setEnviando(true);
    try {
      await api.put(`/pessoas/${id}/plano`, {
        objetivo: p.objetivo, frequencia: p.frequencia, duracao_min: numero(p.duracao_min), atividades: lista,
      });
      nav(`/pessoas/${id}`, { replace: true });
    } catch (err) { setErro(err.message); } finally { setEnviando(false); }
  }

  if (bloqueado) {
    return (
      <div className="pilha">
        <Cabecalho titulo="Plano de atividades" subtitulo={nome} voltar={`/pessoas/${id}`} />
        <p className="aviso aviso-alerta"><Icone nome="alerta" tamanho={16} /> A triagem indicou restrição. Encaminhe para avaliação médica antes de montar o plano.</p>
      </div>
    );
  }

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      <Cabecalho titulo="Plano de atividades" subtitulo={nome} voltar={`/pessoas/${id}`} />
      <fieldset className="pilha-pequena">
        <legend className="rotulo">Tipo de treino</legend>
        <div className="chips" role="radiogroup" aria-label="Tipo de treino">
          {LISTA_OBJETIVOS.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={p.objetivo === o} className="chip chip-treino" style={tinta(o)} onClick={() => setP({ ...p, objetivo: o })}>
              <Icone nome={OBJETIVOS[o].icone} tamanho={14} espessura={2.2} />{o}
            </button>
          ))}
        </div>
      </fieldset>

      {modelo && (
        <section className="cartao-modelo" style={tinta(modelo.objetivo, 0.12)}>
          <div className="linha-entre">
            <span className="item-texto"><span className="rotulo">Modelo sugerido</span>
              <strong>{CATEGORIAS[categoria]?.rotulo} · {modelo.objetivo}</strong>
              <span className="sutil">Intensidade {modelo.intensidade} · {modelo.frequencia} · {modelo.atividades.length} atividades</span></span>
            <span className="cartao-treino-icone"><Icone nome="modelo" tamanho={20} /></span>
          </div>
          {modelo.aviso && <p className="aviso aviso-alerta"><Icone nome="alerta" tamanho={16} /> {modelo.aviso}</p>}
          <button type="button" className="botao botao-secundario" onClick={usarModelo}>Usar este modelo</button>
          <p className="sutil">Ponto de partida: ajuste com o seu supervisor.</p>
        </section>
      )}
      <div className="grade-2">
        <label className="campo">Frequência<input value={p.frequencia} onChange={(e) => setP({ ...p, frequencia: e.target.value })} /></label>
        <label className="campo">Minutos<input inputMode="numeric" value={p.duracao_min} onChange={(e) => setP({ ...p, duracao_min: e.target.value })} /></label>
      </div>

      <section className="pilha-pequena">
        <h2 className="rotulo">Atividades</h2>
        {atividades.length === 0 && <p className="sutil">Escolha da biblioteca abaixo ou adicione uma atividade.</p>}
        <ol className="lista">
          {atividades.map((a, i) => (
            <li key={i} className="item atividade-edicao">
              <span className="numero-bolha">{i + 1}</span>
              <span className="item-texto">
                <input aria-label={`Nome da atividade ${i + 1}`} value={a.nome} onChange={(e) => mudaAtividade(i, 'nome', e.target.value)} placeholder="Atividade" />
                <input aria-label={`Detalhe da atividade ${i + 1}`} value={a.detalhe} onChange={(e) => mudaAtividade(i, 'detalhe', e.target.value)} placeholder="Séries, tempo, carga" className="sutil" />
              </span>
              <button type="button" className="botao-icone" onClick={() => remover(i)} aria-label={`Remover atividade ${i + 1}`}>×</button>
            </li>
          ))}
        </ol>
        <button type="button" className="botao-tracejado" onClick={() => adicionar()}><Icone nome="mais" tamanho={18} /> Adicionar atividade</button>
        <div className="chips">
          {BIBLIOTECA.map(([n, d]) => (
            <button key={n} type="button" className="chip" onClick={() => adicionar(n, d)}>+ {n}</button>
          ))}
        </div>
      </section>

      <Aviso>{erro}</Aviso>
      <button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar plano'}</button>
    </form>
  );
}
