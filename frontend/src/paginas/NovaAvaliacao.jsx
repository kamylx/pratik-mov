import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, numero } from '../api.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';

const PROTOCOLOS = ['Bateria para idosos', 'Avaliação de academia', 'Personalizado'];
const MEDIDAS = [['peso_kg', 'Peso (kg)'], ['altura_cm', 'Altura (cm)'], ['cintura_cm', 'Cintura (cm)']];
const TESTES = [
  ['sentar_levantar', 'Sentar e levantar 30 s', 'rep.'],
  ['sentar_alcancar', 'Sentar e alcançar', 'cm'],
  ['caminhada_6min_m', 'Caminhada 6 min', 'm'],
];
const INTEIROS = ['sentar_levantar', 'caminhada_6min_m'];

export default function NovaAvaliacao() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ficha, setFicha] = useState(null);
  const [v, setV] = useState({ protocolo: PROTOCOLOS[0], pressao: '', observacoes: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get(`/pessoas/${id}`).then((f) => {
      setFicha(f);
      const ultima = f.avaliacoes.at(-1);
      if (ultima) setV((x) => ({ ...x, protocolo: ultima.protocolo, altura_cm: String(ultima.altura_cm ?? '').replace('.', ',') }));
    }).catch((e) => setErro(e.message));
  }, [id]);

  const anterior = ficha?.avaliacoes.at(-1);
  const peso = numero(v.peso_kg), altura = numero(v.altura_cm);
  const imc = peso && altura ? (peso / (altura / 100) ** 2).toFixed(1).replace('.', ',') : null;
  const muda = (k) => (e) => setV({ ...v, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    const corpo = { protocolo: v.protocolo };
    for (const [k] of [...MEDIDAS, ...TESTES]) {
      const n = numero(v[k]);
      if (v[k] && n === undefined) return setErro('Use apenas números nas medidas e testes.');
      if (n !== undefined) corpo[k] = INTEIROS.includes(k) ? Math.round(n) : n;
    }
    if (v.pressao) corpo.pressao = v.pressao.trim();
    if (v.observacoes) corpo.observacoes = v.observacoes;
    setEnviando(true);
    try {
      await api.post(`/pessoas/${id}/avaliacoes`, corpo);
      nav(`/pessoas/${id}`, { replace: true });
    } catch (err) { setErro(err.message); } finally { setEnviando(false); }
  }

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      <Cabecalho titulo="Nova avaliação" subtitulo={ficha ? `${ficha.pessoa.nome} · avaliação ${ficha.avaliacoes.length + 1}` : ''} voltar={`/pessoas/${id}`} />
      <label className="campo">Protocolo
        <select value={v.protocolo} onChange={muda('protocolo')}>{PROTOCOLOS.map((p) => <option key={p}>{p}</option>)}</select>
      </label>

      <fieldset className="cartao pilha-pequena">
        <legend className="rotulo">Medidas</legend>
        <div className="grade-2">
          {MEDIDAS.map(([k, r]) => (
            <label key={k} className="campo">{r}<input inputMode="decimal" value={v[k] ?? ''} onChange={muda(k)} placeholder="—" /></label>
          ))}
          <label className="campo">Pressão (mmHg)<input value={v.pressao} onChange={muda('pressao')} placeholder="120/80" /></label>
        </div>
        {imc && <div className="linha-entre destaque-suave"><span className="sutil">IMC calculado</span><strong>{imc}</strong></div>}
      </fieldset>

      <fieldset className="cartao pilha-pequena">
        <legend className="rotulo">Testes</legend>
        {TESTES.map(([k, r, u]) => (
          <label key={k} className="linha-teste">
            <span>{r}<span className="sutil bloco">{anterior?.[k] != null ? `anterior: ${String(anterior[k]).replace('.', ',')} ${u}` : 'sem resultado anterior'}</span></span>
            <input inputMode="decimal" value={v[k] ?? ''} onChange={muda(k)} placeholder="—" />
          </label>
        ))}
      </fieldset>

      <label className="campo">Observações
        <textarea rows="3" value={v.observacoes} onChange={muda('observacoes')} placeholder="Como a pessoa se sentiu, ajustes feitos…" />
      </label>
      <Aviso>{erro}</Aviso>
      <button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar avaliação'}</button>
    </form>
  );
}
