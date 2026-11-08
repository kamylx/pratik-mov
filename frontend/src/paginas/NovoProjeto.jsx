import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, numero } from '../api.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';
import { TIPOS } from './Projetos.jsx';

export default function NovoProjeto() {
  const nav = useNavigate();
  const [f, setF] = useState({ nome: '', tipo: 'extensao', local: '', horario: '', total_encontros: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const muda = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (f.nome.trim().length < 2) return setErro('Dê um nome ao projeto.');
    setEnviando(true);
    try {
      const r = await api.post('/projetos', {
        nome: f.nome, tipo: f.tipo, local: f.local || undefined, horario: f.horario || undefined,
        total_encontros: numero(f.total_encontros),
      });
      nav(`/projetos/${r.projeto.id}`, { replace: true });
    } catch (err) { setErro(err.message); } finally { setEnviando(false); }
  }

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      <Cabecalho titulo="Novo projeto" voltar="/projetos" />
      <label className="campo">Nome do projeto<input value={f.nome} onChange={muda('nome')} placeholder="Ex.: Caminhada Ativa" /></label>
      <label className="campo">Tipo
        <select value={f.tipo} onChange={muda('tipo')}>
          {Object.entries(TIPOS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </select>
      </label>
      <label className="campo">Local<input value={f.local} onChange={muda('local')} placeholder="Ex.: Praça da República" /></label>
      <div className="grade-2">
        <label className="campo">Dias e horário<input value={f.horario} onChange={muda('horario')} placeholder="ter e qui, 7h" /></label>
        <label className="campo">Total de encontros<input inputMode="numeric" value={f.total_encontros} onChange={muda('total_encontros')} placeholder="24" /></label>
      </div>
      <Aviso>{erro}</Aviso>
      <button className="botao" disabled={enviando}>{enviando ? 'Criando…' : 'Criar projeto'}</button>
    </form>
  );
}
