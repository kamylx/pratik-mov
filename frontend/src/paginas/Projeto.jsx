import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, formatarData } from '../api.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';
import { ConviteProjetos, TIPOS } from './Projetos.jsx';
import Pesquisa from '../componentes/Pesquisa.jsx';
import Comentarios from '../componentes/Comentarios.jsx';

const hoje = () => new Date().toISOString().slice(0, 10);

export default function Projeto() {
  const { id } = useParams();
  const [dados, setDados] = useState(null);
  const [aba, setAba] = useState('presenca');
  const [bloqueado, setBloqueado] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  // Presença
  const [presentes, setPresentes] = useState(new Set());
  const [encontro, setEncontro] = useState({ data: hoje(), atividade: '' });
  // Participante novo
  const [novo, setNovo] = useState({ nome: '', consentimento: false });

  const carregar = useCallback(() => api.get(`/projetos/${id}`).then((r) => {
    setDados(r);
    setPresentes(new Set(r.participantes.filter((p) => p.ativo).map((p) => p.id)));
  }).catch((e) => { if (e.codigo === 'recurso_pro') setBloqueado(true); else setErro(e.message); }), [id]);

  useEffect(() => { carregar(); }, [carregar]);

  if (bloqueado) return <ConviteProjetos />;
  if (!dados) return erro ? <div className="pilha"><Cabecalho titulo="Projeto" voltar="/projetos" /><Aviso>{erro}</Aviso></div> : <div className="carregando">Carregando…</div>;

  const { projeto, participantes, encontros, coletas, comentarios } = dados;
  const ativos = participantes.filter((p) => p.ativo);

  const alternar = (pid) => {
    const n = new Set(presentes);
    if (n.has(pid)) n.delete(pid); else n.add(pid);
    setPresentes(n);
  };

  async function salvarPresenca() {
    setErro(''); setOk('');
    try {
      await api.post(`/projetos/${id}/encontros`, {
        data: encontro.data, atividade: encontro.atividade || undefined, presentes: [...presentes],
      });
      setOk(`Presença salva: ${presentes.size} de ${ativos.length} presentes.`);
      setEncontro({ data: hoje(), atividade: '' });
      await carregar();
    } catch (e) { setErro(e.message); }
  }

  async function adicionar(e) {
    e.preventDefault();
    setErro(''); setOk('');
    if (novo.nome.trim().length < 2) return setErro('Informe o nome do participante.');
    if (!novo.consentimento) return setErro('Confirme o termo de consentimento.');
    try {
      await api.post(`/projetos/${id}/participantes`, { nome: novo.nome, consentimento: true });
      setNovo({ nome: '', consentimento: false });
      await carregar();
    } catch (err) { setErro(err.message); }
  }

  async function alternarAtivo(p) {
    try { await api.patch(`/projetos/${id}/participantes/${p.id}`, { ativo: !p.ativo }); await carregar(); } catch (e) { setErro(e.message); }
  }

  return (
    <div className="pilha">
      <Cabecalho titulo="" voltar="/projetos" />
      <header className="pilha-pequena" style={{ marginTop: -8 }}>
        <div className="linha-entre" style={{ justifyContent: 'flex-start' }}>
          <h1 className="titulo-grande">{projeto.nome}</h1>
          <span className="selo-pro">PRO</span>
        </div>
        <p className="sutil">{[TIPOS[projeto.tipo], projeto.local, projeto.horario].filter(Boolean).join(' · ')}</p>
      </header>

      <div className="grade-3">
        <div className="medida"><strong>{ativos.length}</strong><span className="sutil">participantes</span></div>
        <div className="medida"><strong>{encontros.length}{projeto.total_encontros ? `/${projeto.total_encontros}` : ''}</strong><span className="sutil">encontros</span></div>
        <div className="medida"><strong>{encontros.length ? Math.round(encontros.reduce((t, e) => t + e.presentes, 0) / encontros.length) : '—'}</strong><span className="sutil">média presentes</span></div>
      </div>

      <div className="segmentado" role="group" aria-label="Seções do projeto">
        {[['presenca', 'Presença'], ['participantes', 'Pessoas'], ['pesquisa', 'Pesquisa'], ['historico', 'Encontros']].map(([k, r]) => (
          <button key={k} type="button" aria-pressed={aba === k} onClick={() => { setAba(k); setOk(''); }}>{r}</button>
        ))}
      </div>

      <Aviso>{erro}</Aviso>
      <Aviso tipo="ok">{ok}</Aviso>

      {aba === 'presenca' && (
        <section className="pilha-pequena">
          {ativos.length === 0 ? <p className="sutil">Cadastre participantes na aba Participantes.</p> : (
            <>
              <div className="grade-2">
                <label className="campo">Data<input type="date" value={encontro.data} onChange={(e) => setEncontro({ ...encontro, data: e.target.value })} /></label>
                <label className="campo">Atividade<input value={encontro.atividade} onChange={(e) => setEncontro({ ...encontro, atividade: e.target.value })} placeholder="Caminhada 30 min" /></label>
              </div>
              <div className="lista">
                <div className="item linha-entre">
                  <span className="item-texto"><strong>Encontro</strong><span className="sutil">{presentes.size} de {ativos.length} presentes</span></span>
                  <button type="button" className="chip" onClick={() => setPresentes(presentes.size === ativos.length ? new Set() : new Set(ativos.map((p) => p.id)))}>
                    {presentes.size === ativos.length ? 'Desmarcar todos' : 'Marcar todos'}
                  </button>
                </div>
                {ativos.map((p) => (
                  <label key={p.id} className="item">
                    <input type="checkbox" checked={presentes.has(p.id)} onChange={() => alternar(p.id)} />
                    <span className="item-texto"><strong>{p.nome}</strong></span>
                  </label>
                ))}
              </div>
              <button type="button" className="botao" onClick={salvarPresenca}>Salvar presença</button>
            </>
          )}
        </section>
      )}

      {aba === 'participantes' && (
        <section className="pilha-pequena">
          <form onSubmit={adicionar} className="cartao pilha-pequena" noValidate>
            <label className="campo">Nome do participante<input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
            <label className="opcao">
              <input type="checkbox" checked={novo.consentimento} onChange={(e) => setNovo({ ...novo, consentimento: e.target.checked })} />
              <span>Assinou o termo de consentimento do projeto.</span>
            </label>
            <button className="botao botao-secundario">Adicionar participante</button>
          </form>
          {participantes.length > 0 && (
            <ul className="lista">
              {participantes.map((p) => (
                <li key={p.id} className="item">
                  <span className="item-texto"><strong style={{ opacity: p.ativo ? 1 : 0.6 }}>{p.nome}</strong>
                    <span className="sutil">{p.presencas} presenças{p.ativo ? '' : ' · inativo'}</span></span>
                  <button type="button" className="chip" onClick={() => alternarAtivo(p)}>{p.ativo ? 'Desativar' : 'Reativar'}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {aba === 'pesquisa' && (
        <Pesquisa projeto={projeto} participantes={participantes} coletas={coletas} recarregar={carregar} />
      )}

      {aba === 'historico' && (
        <section>
          {encontros.length === 0 ? <p className="sutil">Nenhum encontro registrado.</p> : (
            <ul className="lista">
              {encontros.map((e) => (
                <li key={e.id} className="item">
                  <span className="item-texto"><strong>{formatarData(e.data)}</strong><span className="sutil">{e.atividade || 'Sem atividade descrita'}</span></span>
                  <span className="sutil">{e.presentes} presentes</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <Comentarios itens={comentarios} />
    </div>
  );
}
