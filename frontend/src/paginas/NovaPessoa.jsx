import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { CATEGORIAS, LISTA_CATEGORIAS, LISTA_OBJETIVOS, OBJETIVOS, tinta } from '../catalogo.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';
import Icone from '../componentes/Icone.jsx';

const PERGUNTAS = [
  ['restricao_medica', 'Algum médico já indicou problema no coração ou restrição a exercícios?'],
  ['sintomas_esforco', 'Sente dor no peito, tontura ou falta de ar ao se esforçar?'],
  ['problema_articular', 'Tem problema nos ossos ou articulações que piora com atividade?'],
];

export default function NovaPessoa() {
  const nav = useNavigate();
  const [f, setF] = useState({ nome: '', nascimento: '', categoria: '', objetivo: '' });
  const [triagem, setTriagem] = useState({ restricao_medica: null, sintomas_esforco: null, problema_articular: null });
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [limite, setLimite] = useState(false);

  const algumSim = Object.values(triagem).some((v) => v === true);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (f.nome.trim().length < 2) return setErro('Informe o nome da pessoa.');
    if (!f.categoria) return setErro('Escolha a categoria da pessoa.');
    if (!f.objetivo) return setErro('Escolha o tipo de treino.');
    if (Object.values(triagem).some((v) => v === null)) return setErro('Responda todas as perguntas da triagem.');
    if (!consentimento) return setErro('Confirme o termo de consentimento.');
    setEnviando(true);
    try {
      const r = await api.post('/pessoas', {
        nome: f.nome, objetivo: f.objetivo, categoria: f.categoria, nascimento: f.nascimento || undefined,
        consentimento: true, triagem,
      });
      nav(r.triagem.liberada ? `/pessoas/${r.pessoa.id}/avaliacao` : `/pessoas/${r.pessoa.id}`, { replace: true });
    } catch (err) {
      if (err.codigo === 'limite_plano') setLimite(true);
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="pilha" onSubmit={enviar} noValidate>
      <Cabecalho titulo="Nova pessoa" subtitulo="Dados, perfil e triagem" voltar="/pessoas" />

      <fieldset className="cartao pilha-pequena">
        <legend className="rotulo">1 · Dados</legend>
        <label className="campo">Nome completo<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
        <label className="campo">Nascimento<input type="date" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} /></label>
      </fieldset>

      <fieldset className="pilha-pequena">
        <legend className="rotulo">2 · Categoria</legend>
        <div className="grade-escolha" role="radiogroup" aria-label="Categoria">
          {LISTA_CATEGORIAS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={f.categoria === c} className="escolha" onClick={() => setF({ ...f, categoria: c })}>
              <Icone nome={CATEGORIAS[c].icone} tamanho={22} />
              <strong>{CATEGORIAS[c].curto ?? CATEGORIAS[c].rotulo}</strong>
              <span className="sutil">{CATEGORIAS[c].descricao}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="pilha-pequena">
        <legend className="rotulo">3 · Tipo de treino</legend>
        <div className="grade-escolha" role="radiogroup" aria-label="Tipo de treino">
          {LISTA_OBJETIVOS.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={f.objetivo === o} className="escolha escolha-treino" style={tinta(o)} onClick={() => setF({ ...f, objetivo: o })}>
              <span className="cartao-treino-icone"><Icone nome={OBJETIVOS[o].icone} tamanho={20} espessura={2.2} /></span>
              <strong>{o}</strong>
              <span className="sutil">{OBJETIVOS[o].descricao}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="cartao pilha-pequena">
        <legend className="rotulo">4 · Prontidão para atividade</legend>
        {PERGUNTAS.map(([k, texto]) => (
          <div key={k} className="pergunta">
            <p>{texto}</p>
            <div className="sim-nao" role="radiogroup" aria-label={texto}>
              {[['Não', false], ['Sim', true]].map(([r, v]) => (
                <button key={r} type="button" role="radio" aria-checked={triagem[k] === v} className={`botao-opcao${v ? ' sim' : ''}`}
                  onClick={() => setTriagem({ ...triagem, [k]: v })}>{r}</button>
              ))}
            </div>
          </div>
        ))}
        {algumSim && (
          <p className="aviso aviso-alerta"><Icone nome="alerta" tamanho={16} /> Com alguma resposta “sim”, encaminhe para avaliação médica antes de iniciar. O plano fica bloqueado até lá.</p>
        )}
      </fieldset>

      <label className="cartao opcao">
        <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
        <span>A pessoa assinou o termo de consentimento para uso dos dados no estágio e no relatório.</span>
      </label>

      <Aviso>{erro}</Aviso>
      {limite && <Link to="/pro" className="botao botao-secundario">Conhecer o Pro</Link>}
      <button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar e continuar'}</button>
    </form>
  );
}
