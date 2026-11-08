import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, formatarData } from '../api.js';
import { corDe, OBJETIVOS, tinta } from '../catalogo.js';
import { Aviso, Cabecalho } from '../componentes/Layout.jsx';
import Grafico from '../componentes/Grafico.jsx';
import Icone from '../componentes/Icone.jsx';
import Comentarios from '../componentes/Comentarios.jsx';
import { AvatarTreino, TagCategoria, TagTreino } from '../componentes/Tags.jsx';

const TESTES = [
  ['sentar_levantar', 'Sentar e levantar', 'rep.', false],
  ['caminhada_6min_m', 'Caminhada 6 min', 'm', false],
  ['sentar_alcancar', 'Sentar e alcançar', 'cm', false],
  ['peso_kg', 'Peso', 'kg', true],
  ['cintura_cm', 'Cintura', 'cm', true],
];

const idade = (nasc) => (nasc ? Math.floor((Date.now() - new Date(nasc)) / 31557600000) : null);
const mes = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
const fmt = (v, u) => (v == null ? '—' : `${String(Number(v)).replace('.', ',')}${u ? ` ${u}` : ''}`);

export default function Pessoa() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState(null);
  const [erro, setErro] = useState('');
  const [teste, setTeste] = useState(null);

  useEffect(() => {
    api.get(`/pessoas/${id}`).then((r) => {
      setF(r);
      // Começa pelo primeiro teste que tenha dados.
      const comDados = TESTES.find(([k]) => r.avaliacoes.filter((a) => a[k] != null).length >= 1);
      setTeste((comDados ?? TESTES[0])[0]);
    }).catch((e) => setErro(e.message));
  }, [id]);

  async function excluir() {
    if (!window.confirm('Excluir esta pessoa e todos os dados dela? Isso não pode ser desfeito.')) return;
    try { await api.del(`/pessoas/${id}`); nav('/pessoas', { replace: true }); } catch (e) { setErro(e.message); }
  }

  if (erro) return <div className="pilha"><Cabecalho titulo="Pessoa" voltar="/pessoas" /><Aviso>{erro}</Aviso></div>;
  if (!f || !teste) return <div className="carregando">Carregando…</div>;

  const { pessoa, triagem, avaliacoes, plano, sessoes, comentarios } = f;
  const ultima = avaliacoes.at(-1);
  const primeira = avaliacoes[0];
  const [, rotuloTeste, unidadeTeste, menorMelhor] = TESTES.find(([k]) => k === teste);
  const pontos = avaliacoes.filter((a) => a[teste] != null).map((a) => ({ valor: Number(a[teste]), legenda: mes(a.data) }));
  const testesDisponiveis = TESTES.filter(([k]) => avaliacoes.some((a) => a[k] != null));
  const anos = idade(pessoa.nascimento);
  const esforcoMedio = sessoes.length ? (sessoes.reduce((t, s) => t + s.esforco, 0) / sessoes.length).toFixed(1).replace('.', ',') : '—';

  return (
    <div className="pilha">
      <Cabecalho titulo="" voltar="/pessoas" />

      <header className="perfil-capa" style={tinta(pessoa.objetivo, 0.16)}>
        <AvatarTreino nome={pessoa.nome} objetivo={pessoa.objetivo} grande />
        <div className="pilha-mini">
          <h1 className="titulo-tela">{pessoa.nome}</h1>
          <div className="linha-tags">
            <TagTreino objetivo={pessoa.objetivo} />
            <TagCategoria categoria={pessoa.categoria} />
            {anos && <span className="sutil">{anos} anos</span>}
          </div>
        </div>
      </header>

      {triagem?.liberada ? (
        <p className="aviso aviso-ok"><Icone nome="check" tamanho={16} /> Triagem concluída · liberado para atividade</p>
      ) : (
        <p className="aviso aviso-alerta"><Icone nome="alerta" tamanho={16} /> Triagem com restrição · encaminhar para avaliação médica</p>
      )}

      <div className="grade-3">
        <div className="numero-cartao"><strong>{sessoes.length}</strong><span>sessões</span></div>
        <div className="numero-cartao"><strong>{avaliacoes.length}</strong><span>avaliações</span></div>
        <div className="numero-cartao"><strong>{esforcoMedio}</strong><span>esforço médio</span></div>
      </div>

      <section className="cartao pilha-pequena">
        <div className="linha-entre"><h2 className="rotulo">Evolução</h2><span className="sutil">desde {formatarData(pessoa.criado_em)}</span></div>
        {testesDisponiveis.length > 1 && (
          <div className="chips rolagem-x" role="group" aria-label="Escolher teste">
            {testesDisponiveis.map(([k, r]) => (
              <button key={k} type="button" className="chip" aria-pressed={teste === k} onClick={() => setTeste(k)}>{r}</button>
            ))}
          </div>
        )}
        <Grafico pontos={pontos} rotulo={rotuloTeste} unidade={unidadeTeste} cor={corDe(pessoa.objetivo)} menorMelhor={menorMelhor} />
        {ultima && primeira && ultima !== primeira && (
          <div className="tabela-comparacao" role="table" aria-label="Primeira e última avaliação">
            <div role="row" className="cabeca"><span role="columnheader">Medida</span><span role="columnheader">{formatarData(primeira.data)}</span><span role="columnheader">{formatarData(ultima.data)}</span></div>
            {testesDisponiveis.map(([k, r, u]) => (
              <div role="row" key={k}><span role="cell">{r}</span><span role="cell">{fmt(primeira[k], u)}</span><span role="cell"><strong>{fmt(ultima[k], u)}</strong></span></div>
            ))}
          </div>
        )}
        <Link to={`/pessoas/${id}/avaliacao`} className="botao botao-secundario"><Icone nome="avaliacao" tamanho={18} /> Nova avaliação</Link>
      </section>

      <Link to={`/pessoas/${id}/plano`} className="cartao item-cartao plano-cartao" style={tinta(pessoa.objetivo)}>
        <span className="cartao-treino-icone"><Icone nome={OBJETIVOS[pessoa.objetivo]?.icone ?? 'forca'} tamanho={20} espessura={2.2} /></span>
        <span className="item-texto"><span className="rotulo">Plano atual</span>
          <strong>{plano ? `${plano.objetivo} · ${plano.frequencia}` : triagem?.liberada ? 'Montar plano de atividades' : 'Bloqueado pela triagem'}</strong>
          {plano && <span className="sutil">{plano.atividades.length} atividades{plano.duracao_min ? ` · ~${plano.duracao_min} min` : ''}</span>}</span>
        <Icone nome="seta" tamanho={18} />
      </Link>

      <section className="cartao pilha-pequena">
        <h2 className="rotulo">Últimas sessões</h2>
        {sessoes.length === 0 && <p className="sutil">Nenhuma sessão ainda.</p>}
        {sessoes.slice(0, 5).map((s, i) => (
          <div key={s.id} className="sessao-linha">
            <span className="sessao-numero">{sessoes.length - i}</span>
            <span className="item-texto"><strong>{formatarData(s.data)}</strong>{s.observacoes && <span className="sutil">{s.observacoes}</span>}</span>
            <span className="barra-esforco" aria-label={`Esforço ${s.esforco} de 10`}><span style={{ width: `${s.esforco * 10}%`, background: corDe(pessoa.objetivo) }} /></span>
            <span className="sutil">{s.esforco}/10</span>
          </div>
        ))}
      </section>

      <Comentarios itens={comentarios} />

      {plano && <Link to={`/pessoas/${id}/sessao`} className="botao"><Icone nome="check" tamanho={18} /> Registrar sessão de hoje</Link>}
      <button type="button" className="botao-texto perigo" onClick={excluir}>Excluir pessoa e dados</button>
    </div>
  );
}
