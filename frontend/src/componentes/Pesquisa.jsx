import { useEffect, useState } from 'react';
import { api, baixar, formatarData, numero } from '../api.js';
import { Aviso } from './Layout.jsx';

const hoje = () => new Date().toISOString().slice(0, 10);

// Aba de pesquisa: escolhe as medidas do catálogo, registra coletas e exporta CSV anonimizado.
export default function Pesquisa({ projeto, participantes, coletas, recarregar }) {
  const [catalogo, setCatalogo] = useState({});
  const [medidas, setMedidas] = useState(projeto.medidas);
  const [dataColeta, setDataColeta] = useState(hoje());
  const [valores, setValores] = useState({});
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => { api.get('/projetos/catalogo/medidas').then((r) => setCatalogo(r.medidas)).catch(() => {}); }, []);
  useEffect(() => { setMedidas(projeto.medidas); }, [projeto.medidas]);

  const ativos = participantes.filter((p) => p.ativo);
  const alterouMedidas = medidas.join() !== projeto.medidas.join();

  const alternarMedida = (m) => setMedidas(medidas.includes(m) ? medidas.filter((x) => x !== m) : [...medidas, m]);

  async function salvarMedidas() {
    setErro(''); setOk('');
    try { await api.patch(`/projetos/${projeto.id}`, { medidas }); setOk('Medidas do projeto atualizadas.'); recarregar(); } catch (e) { setErro(e.message); }
  }

  async function salvarColeta() {
    setErro(''); setOk('');
    const lista = [];
    for (const [chave, texto] of Object.entries(valores)) {
      if (texto === '') continue;
      const [participante_id, medida] = chave.split('|');
      const valor = numero(texto);
      if (valor === undefined) return setErro('Use apenas números nas coletas.');
      lista.push({ participante_id, medida, valor });
    }
    if (!lista.length) return setErro('Preencha ao menos um valor.');
    try {
      const r = await api.post(`/projetos/${projeto.id}/coletas`, { data: dataColeta, valores: lista });
      setOk(`${r.salvos} valores salvos.`);
      setValores({});
      recarregar();
    } catch (e) { setErro(e.message); }
  }

  async function exportar() {
    setErro('');
    try { await baixar(`/projetos/${projeto.id}/exportar`, `pesquisa-${projeto.nome.toLowerCase().replace(/\W+/g, '-')}.csv`); } catch (e) { setErro(e.message); }
  }

  return (
    <section className="pilha-pequena">
      <div className="cartao pilha-pequena">
        <h2 className="rotulo">Medidas da pesquisa</h2>
        <div className="chips">
          {Object.entries(catalogo).map(([k, m]) => (
            <button key={k} type="button" className="chip" aria-pressed={medidas.includes(k)} onClick={() => alternarMedida(k)}>{m.rotulo}</button>
          ))}
        </div>
        {alterouMedidas && <button type="button" className="botao botao-secundario" onClick={salvarMedidas}>Salvar medidas</button>}
      </div>

      <Aviso>{erro}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>

      {projeto.medidas.length > 0 && ativos.length > 0 && (
        <div className="cartao pilha-pequena">
          <div className="linha-entre"><h2 className="rotulo">Nova coleta</h2>
            <label className="campo campo-inline"><span className="visualmente-oculto">Data da coleta</span>
              <input type="date" value={dataColeta} onChange={(e) => setDataColeta(e.target.value)} /></label>
          </div>
          <div className="tabela-rolagem">
            <table className="tabela-coleta">
              <thead><tr><th>Participante</th>{projeto.medidas.map((m) => <th key={m}>{catalogo[m]?.rotulo ?? m} <span className="sutil">({catalogo[m]?.unidade})</span></th>)}</tr></thead>
              <tbody>
                {ativos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    {projeto.medidas.map((m) => (
                      <td key={m}><input inputMode="decimal" aria-label={`${catalogo[m]?.rotulo ?? m} de ${p.nome}`}
                        value={valores[`${p.id}|${m}`] ?? ''} onChange={(e) => setValores({ ...valores, [`${p.id}|${m}`]: e.target.value })} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="botao" onClick={salvarColeta}>Salvar coleta</button>
        </div>
      )}

      <div className="cartao pilha-pequena">
        <h2 className="rotulo">Coletas registradas</h2>
        {coletas.length === 0 && <p className="sutil">Nenhuma coleta ainda.</p>}
        {coletas.map((c) => (
          <div key={c.data} className="linha-entre linha-divisoria"><span>{formatarData(c.data)}</span><span className="sutil">{c.participantes} participantes · {c.valores} valores</span></div>
        ))}
        <button type="button" className="botao botao-secundario" onClick={exportar} disabled={coletas.length === 0}>Exportar CSV anonimizado</button>
        <p className="sutil">Participantes viram códigos (P01, P02…) e a data de nascimento vira idade. Nenhum nome sai no arquivo.</p>
      </div>
    </section>
  );
}
