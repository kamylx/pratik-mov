import { Link } from 'react-router-dom';

// RASCUNHO: revisar com um advogado antes de publicar. Campos entre colchetes a preencher.
export default function Termos() {
  return (
    <div className="tela-acesso texto-longo">
      <Link to="/" className="link-forte">← Voltar</Link>
      <h1 className="titulo-grande">Termos de uso e privacidade</h1>
      <p className="sutil">Rascunho · versão de [data]</p>

      <h2>1. Para que serve o Pratik Mov</h2>
      <p>O Pratik Mov ajuda estudantes de Educação Física a registrar atendimentos feitos em estágios, projetos de extensão e pesquisas, e a gerar relatórios para a disciplina.</p>

      <h2>2. Uso supervisionado</h2>
      <p>O app deve ser usado apenas em atividades supervisionadas por profissional registrado no CREF. Ele registra o trabalho, mas não substitui a supervisão nem autoriza o exercício da profissão por quem não tem registro (Lei 9.696/1998).</p>

      <h2>3. Dados das pessoas atendidas</h2>
      <p>Você só pode cadastrar alguém depois que a pessoa assinar o termo de consentimento. Dados de saúde são sensíveis pela LGPD: use-os apenas para o atendimento e o relatório, e não os compartilhe fora disso.</p>

      <h2>4. Quem é responsável pelos dados</h2>
      <p>[Definir com assessoria jurídica: papéis de controlador e operador entre aluno, instituição e Pratik.]</p>

      <h2>5. Segurança</h2>
      <p>Senhas são guardadas com criptografia, a sessão expira em 2 horas e cada aluno só acessa as pessoas que ele atende. Ações importantes ficam registradas sem guardar dados de saúde no registro.</p>

      <h2>6. Exclusão</h2>
      <p>Você pode excluir uma pessoa a qualquer momento, e todos os dados dela são apagados. Para excluir sua conta, escreva para [e-mail de contato].</p>

      <h2>7. Plano gratuito e Pro</h2>
      <p>O plano gratuito permite até 10 pessoas atendidas e um relatório simples. O Pro libera os demais recursos mediante assinatura de [R$ XX] por mês.</p>

      <h2>8. Contato</h2>
      <p>[Nome ou CNPJ] · [e-mail de contato]</p>
    </div>
  );
}
