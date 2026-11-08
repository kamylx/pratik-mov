import { Link } from 'react-router-dom';
import { useSessao } from '../App.jsx';

const BENEFICIOS = [
  ['Relatório final completo', 'identificação, evolução, atividades e projetos, pronto para PDF'],
  ['Pessoas sem limite', 'no gratuito são até 10'],
  ['Projetos em grupo e pesquisa', 'participantes, presença em lote e encontros'],
  ['Estágio com supervisor', 'nome e nº do CREF no relatório'],
  ['Portfólio do aluno', 'sua trajetória para estágio e entrevistas'],
  ['Supervisor vinculado', 'o professor acompanha e comenta seus atendimentos'],
  ['Pesquisa com exportação', 'coletas padronizadas e CSV anonimizado'],
];

export default function Pro() {
  const { usuario } = useSessao();
  const ativo = usuario.plano === 'pro';

  return (
    <div className="pilha">
      <span className="selo-pro grande">PRATIK MOV PRO</span>
      <h1 className="titulo-grande">{ativo ? 'Você está no Pro.' : 'Do atendimento ao relatório final, sem retrabalho.'}</h1>
      <p className="sutil">{ativo ? 'Todos os recursos abaixo estão liberados na sua conta.' : 'Tudo o que você registra vira o relatório que a disciplina pede.'}</p>
      <ul className="lista beneficios">
        {BENEFICIOS.map(([t, d]) => (
          <li key={t} className="item"><span className="item-texto"><strong>{t}</strong><span className="sutil">{d}</span></span></li>
        ))}
      </ul>
      {ativo ? (
        <Link to="/projetos" className="botao">Ir para os projetos</Link>
      ) : (
        <>
          <p className="numero-grande" style={{ textAlign: 'center' }}>[R$ XX] <span className="sutil">/mês</span></p>
          <button type="button" className="botao" disabled>Assinatura em breve</button>
          <Link to="/" className="link-centro">Continuar no gratuito</Link>
        </>
      )}
    </div>
  );
}
