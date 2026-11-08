import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatarData } from '../api.js';
import { useSessao } from '../App.jsx';
import { CATEGORIAS, corDe } from '../catalogo.js';
import { agrupar, fraseAtividades, fraseObservacoes, fraseProjeto, frasePessoaSimples, frasesPessoaFinal, frasesResumo, qtd } from '../frases.js';
import { Aviso } from '../componentes/Layout.jsx';

const hoje = () => new Date().toISOString().slice(0, 10);
const inicioSemestre = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() < 6 ? '01' : '07'}-01`;
};
const fmt = (v, u = '') => (v == null ? '—' : `${String(Number(v)).replace('.', ',')}${u}`);

// Barras horizontais simples: quantas pessoas por treino ou por categoria.
function Distribuicao({ titulo, itens, rotulo, cor }) {
  const max = Math.max(...itens.map(([, q]) => q), 1);
  return (
    <div className="distribuicao">
      <h4>{titulo}</h4>
      {itens.map(([k, q]) => (
        <div key={k} className="distribuicao-linha">
          <span>{rotulo(k)}</span>
          <span className="distribuicao-barra"><span style={{ width: `${(q / max) * 100}%`, background: cor(k) }} /></span>
          <strong>{q}</strong>
        </div>
      ))}
    </div>
  );
}

function Cabeca({ titulo, subtitulo }) {
  return (
    <header className="relatorio-cabeca">
      <h2>{titulo}</h2>
      {subtitulo && <p className="sutil">{subtitulo}</p>}
    </header>
  );
}

const Editavel = ({ children, ...resto }) => (
  <div className="editavel" contentEditable suppressContentEditableWarning spellCheck {...resto}>{children}</div>
);

function RelatorioSimples({ rel }) {
  return (
    <article className="relatorio">
      <Cabeca titulo="Relatório de atendimentos" subtitulo={`${rel.aluno.nome}${rel.aluno.curso ? ` · ${rel.aluno.curso}` : ''} · ${formatarData(rel.periodo.inicio)} a ${formatarData(rel.periodo.fim)}`} />
      <Editavel>
        <section>
          <h3>Visão geral</h3>
          <p>{frasesResumo(rel.pessoas, rel.totais.sessoes).join(' ')}</p>
        </section>
        <section>
          <h3>Atendimentos</h3>
          {rel.pessoas.length === 0 && <p>Nenhum atendimento no período.</p>}
          {rel.pessoas.map((p, i) => <p key={p.id}>{frasePessoaSimples(p, i)}</p>)}
        </section>
      </Editavel>
      <p className="relatorio-rodape">Nomes substituídos por iniciais para preservar a privacidade. Gerado com Pratik Mov.</p>
    </article>
  );
}

function RelatorioFinal({ rel }) {
  const id = rel.identificacao;
  const porTreino = agrupar(rel.pessoas, 'objetivo');
  const porCategoria = agrupar(rel.pessoas, 'categoria');
  return (
    <article className="relatorio">
      <Cabeca titulo="Relatório final de estágio" subtitulo={[id.disciplina, `${formatarData(rel.periodo.inicio)} a ${formatarData(rel.periodo.fim)}`].filter(Boolean).join(' · ')} />

      <section>
        <h3>1. Identificação</h3>
        <table className="tabela-dados"><tbody>
          <tr><th>Estagiário(a)</th><td>{id.aluno}</td></tr>
          {id.curso && <tr><th>Curso</th><td>{id.curso}</td></tr>}
          {id.disciplina && <tr><th>Disciplina</th><td>{id.disciplina}</td></tr>}
          {id.local && <tr><th>Local</th><td>{id.local}</td></tr>}
          {id.supervisor && <tr><th>Supervisor(a)</th><td>{id.supervisor}{id.cref ? ` · CREF ${id.cref}` : ''}</td></tr>}
          <tr><th>Período</th><td>{formatarData(rel.periodo.inicio)} a {formatarData(rel.periodo.fim)}</td></tr>
        </tbody></table>
      </section>

      <Editavel>
        <section>
          <h3>2. Apresentação</h3>
          <p>{frasesResumo(rel.pessoas, rel.totais.sessoes).join(' ')}{rel.totais.projetos > 0 ? ` Além disso, conduzi ${rel.totais.projetos === 1 ? 'um projeto em grupo, descrito' : `${qtd(rel.totais.projetos, 'projeto', 'projetos')} em grupo, descritos`} mais adiante.` : ''}</p>
        </section>
      </Editavel>

      {rel.pessoas.length > 0 && (
        <section>
          <h3>3. Perfil das pessoas atendidas</h3>
          <div className="grade-distribuicao">
            <Distribuicao titulo="Por tipo de treino" itens={porTreino} rotulo={(k) => k} cor={corDe} />
            <Distribuicao titulo="Por categoria" itens={porCategoria} rotulo={(k) => CATEGORIAS[k]?.rotulo ?? k} cor={() => '#6D28D9'} />
          </div>
        </section>
      )}

      <section>
        <h3>4. Acompanhamento individual</h3>
        {rel.pessoas.length === 0 && <p>Não houve atendimentos individuais no período.</p>}
        {rel.pessoas.map((p, i) => (
          <div key={p.id} className="bloco-pessoa">
            <h4>{p.iniciais} · {p.objetivo}</h4>
            <Editavel><p>{frasesPessoaFinal(p, i).join(' ')}</p>
              {(p.atividades?.length > 0 || p.observacoes?.length > 0) && (
                <p>{[p.atividades?.length > 0 && fraseAtividades(p.atividades), p.observacoes?.length > 0 && fraseObservacoes(p.observacoes)].filter(Boolean).join(' ')}</p>
              )}
            </Editavel>
            {p.inicial && p.final && p.inicial.data !== p.final.data && (
              <div className="tabela-rolagem"><table>
                <thead><tr><th>Medida</th><th>{formatarData(p.inicial.data)}</th><th>{formatarData(p.final.data)}</th></tr></thead>
                <tbody>
                  {[['Peso', 'peso_kg', ' kg'], ['Cintura', 'cintura_cm', ' cm'], ['Sentar e levantar (30 s)', 'sentar_levantar', ' rep.'], ['Sentar e alcançar', 'sentar_alcancar', ' cm'], ['Caminhada de 6 min', 'caminhada_6min_m', ' m']]
                    .filter(([, k]) => p.inicial[k] != null || p.final[k] != null)
                    .map(([r, k, u]) => <tr key={k}><td>{r}</td><td>{fmt(p.inicial[k], u)}</td><td>{fmt(p.final[k], u)}</td></tr>)}
                </tbody>
              </table></div>
            )}
          </div>
        ))}
      </section>

      {rel.projetos.length > 0 && (
        <section>
          <h3>5. Atividades em grupo</h3>
          <Editavel>
            {rel.projetos.map((pr) => (
              <p key={pr.id}>{fraseProjeto(pr)}</p>
            ))}
          </Editavel>
        </section>
      )}

      <section>
        <h3>{rel.projetos.length > 0 ? '6' : '5'}. Considerações finais</h3>
        <Editavel><p className="placeholder-escrita">Escreva aqui o que você aprendeu no estágio, as dificuldades que encontrou e como pretende continuar.</p></Editavel>
      </section>

      <div className="assinaturas">
        <div><span />Estagiário(a)</div>
        <div><span />Supervisor(a){id.cref ? ` · CREF ${id.cref}` : ''}</div>
      </div>
      <p className="relatorio-rodape">Nomes substituídos por iniciais para preservar a privacidade. Gerado com Pratik Mov.</p>
    </article>
  );
}

export default function Relatorio() {
  const { usuario } = useSessao();
  const pro = usuario.plano === 'pro';
  const [tipo, setTipo] = useState(pro ? 'final' : 'simples');
  const [f, setF] = useState({ inicio: inicioSemestre(), fim: hoje(), disciplina: '', local: '', supervisor: '', cref: '' });
  const [rel, setRel] = useState(null);
  const [erro, setErro] = useState('');
  const muda = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function gerar(e) {
    e.preventDefault();
    setErro('');
    const q = new URLSearchParams({ inicio: f.inicio, fim: f.fim });
    if (tipo === 'final') for (const k of ['disciplina', 'local', 'supervisor', 'cref']) if (f[k]) q.set(k, f[k]);
    try { setRel(await api.get(`/relatorio/${tipo}?${q}`)); } catch (err) { setErro(err.message); }
  }

  return (
    <div className="pilha">
      <header className="nao-imprimir">
        <h1 className="titulo-grande">Relatório</h1>
        <p className="sutil">Gerado a partir de tudo o que você registrou.</p>
      </header>

      <div className="segmentado nao-imprimir" role="group" aria-label="Tipo de relatório">
        <button type="button" aria-pressed={tipo === 'simples'} onClick={() => { setTipo('simples'); setRel(null); }}>Simples</button>
        <button type="button" aria-pressed={tipo === 'final'} onClick={() => { setTipo('final'); setRel(null); }}>Final completo <span className="selo-pro">PRO</span></button>
      </div>

      {tipo === 'final' && !pro ? (
        <section className="cartao pilha-pequena nao-imprimir">
          <p><strong>O relatório final completo faz parte do Pro.</strong></p>
          <p className="sutil">Inclui identificação com supervisor e CREF, perfil dos atendimentos, evolução detalhada de cada pessoa, projetos em grupo e espaço para assinaturas.</p>
          <Link to="/pro" className="botao">Conhecer o Pro</Link>
        </section>
      ) : (
        <form onSubmit={gerar} className="cartao pilha-pequena nao-imprimir">
          <div className="grade-2">
            <label className="campo">Início<input type="date" value={f.inicio} onChange={muda('inicio')} /></label>
            <label className="campo">Fim<input type="date" value={f.fim} onChange={muda('fim')} /></label>
          </div>
          {tipo === 'final' && (
            <>
              <div className="grade-2">
                <label className="campo">Disciplina<input value={f.disciplina} onChange={muda('disciplina')} placeholder="Estágio II" /></label>
                <label className="campo">Local<input value={f.local} onChange={muda('local')} placeholder="Laboratório de avaliação" /></label>
              </div>
              <div className="grade-2">
                <label className="campo">Supervisor(a)<input value={f.supervisor} onChange={muda('supervisor')} placeholder="Vazio: usa o vinculado" /></label>
                <label className="campo">Nº do CREF<input value={f.cref} onChange={muda('cref')} placeholder="000000-G/UF" /></label>
              </div>
            </>
          )}
          <Aviso>{erro}</Aviso>
          <button className="botao">Gerar relatório {tipo === 'final' ? 'final' : 'simples'}</button>
        </form>
      )}

      {rel && <p className="aviso aviso-info nao-imprimir">Revise o texto: você pode clicar em qualquer parágrafo e editar antes de salvar em PDF.</p>}
      {rel?.tipo === 'simples' && <RelatorioSimples rel={rel} />}
      {rel?.tipo === 'final' && <RelatorioFinal rel={rel} />}
      {rel && <button type="button" className="botao nao-imprimir" onClick={() => window.print()}>Salvar em PDF / imprimir</button>}
    </div>
  );
}
