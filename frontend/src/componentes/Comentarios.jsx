import { useState } from 'react';
import { formatarData, iniciaisDe } from '../api.js';

// Lista de comentários do professor; com onEnviar, mostra o campo para comentar.
export default function Comentarios({ itens, onEnviar }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(e) {
    e.preventDefault();
    if (texto.trim().length < 2) return setErro('Escreva o comentário.');
    setErro(''); setEnviando(true);
    try { await onEnviar(texto.trim()); setTexto(''); } catch (err) { setErro(err.message); } finally { setEnviando(false); }
  }

  if (!onEnviar && itens.length === 0) return null;

  return (
    <section className="cartao pilha-pequena">
      <h2 className="rotulo">Comentários do professor</h2>
      {itens.length === 0 && <p className="sutil">Nenhum comentário ainda.</p>}
      {itens.map((c) => (
        <div key={c.id} className="comentario">
          <span className="avatar pequeno">{iniciaisDe(c.autor)}</span>
          <div>
            <p className="comentario-autor"><strong>{c.autor}</strong> <span className="sutil">{c.autor_cref ? `CREF ${c.autor_cref} · ` : ''}{formatarData(c.criado_em)}</span></p>
            <p className="comentario-texto">{c.texto}</p>
          </div>
        </div>
      ))}
      {onEnviar && (
        <form onSubmit={enviar} className="pilha-pequena" noValidate>
          <label className="campo">Novo comentário
            <textarea rows="3" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Orientação para o aluno" />
          </label>
          {erro && <p className="aviso aviso-erro" role="alert">{erro}</p>}
          <button className="botao" disabled={enviando}>{enviando ? 'Enviando…' : 'Comentar'}</button>
        </form>
      )}
    </section>
  );
}
