import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';

export default function NovaSessao() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [feitas, setFeitas] = useState(new Set());
  const [esforco, setEsforco] = useState(null);
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get(`/pessoas/${id}`).then((f) => {
      setFicha(f);
      setFeitas(new Set(f.plano?.atividades.map((a) => a.id) ?? []));
    }).catch((e) => setErro(e.message));
  }, [id]);

  const alternar = (aid) => {
    const n = new Set(feitas);
    if (n.has(aid)) n.delete(aid); else n.add(aid);
    setFeitas(n);
  };

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (esforco === null) return setErro('Marque a percepção de esforço.');
    setEnviando(true);
    try {
      await api.post(`/pessoas/${id}/sessoes`, {
        esforco, atividades_feitas: [...feitas], observacoes: observacoes || undefined,
      });
      nav(`/pessoas/${id}`, { replace: true });
    } catch (err) { setErro(err.message); } finally { setEnviando(false); }
  }

  const numeroSessao = ficha ? ficha.sessoes.length + 1 : '';

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      <Cabecalho titulo={`Sessão ${numeroSessao}`} subtitulo={ficha ? `${ficha.pessoa.nome} · hoje` : ''} voltar={`/pessoas/${id}`} />

      <fieldset className="pilha-pequena">
        <legend className="rotulo">Atividades do plano</legend>
        <ul className="lista">
          {ficha?.plano?.atividades.map((a) => (
            <li key={a.id}><label className="item">
              <input type="checkbox" checked={feitas.has(a.id)} onChange={() => alternar(a.id)} />
              <span className="item-texto"><strong>{a.nome}</strong></span>
              <span className="sutil">{a.detalhe}</span>
            </label></li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="cartao pilha-pequena">
        <legend className="rotulo">Percepção de esforço (0 a 10)</legend>
        <div className="escala" role="group" aria-label="Percepção de esforço">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} type="button" className="escala-item" aria-pressed={esforco === n} onClick={() => setEsforco(n)}>{n}</button>
          ))}
        </div>
        <div className="linha-entre sutil"><span>muito leve</span><span>máximo</span></div>
      </fieldset>

      <label className="campo">Observações
        <textarea rows="3" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Ex.: sentiu cansaço na remada, reduzir carga" />
      </label>
      <Aviso>{erro}</Aviso>
      <button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar sessão'}</button>
    </form>
  );
}
