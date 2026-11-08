import { CATEGORIAS, OBJETIVOS, tinta } from '../catalogo.js';
import Icone from './Icone.jsx';

export function TagTreino({ objetivo, grande = false }) {
  return (
    <span className={`tag-treino${grande ? ' grande' : ''}`} style={tinta(objetivo)}>
      <Icone nome={OBJETIVOS[objetivo]?.icone ?? 'forca'} tamanho={grande ? 16 : 13} espessura={2.2} />
      {objetivo}
    </span>
  );
}

export function TagCategoria({ categoria }) {
  const c = CATEGORIAS[categoria] ?? CATEGORIAS.adulto;
  return (
    <span className="tag-categoria">
      <Icone nome={c.icone} tamanho={13} espessura={2} />
      {c.curto ?? c.rotulo}
    </span>
  );
}

// Avatar tingido pela cor do treino da pessoa.
export function AvatarTreino({ nome, objetivo, grande = false }) {
  const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  return <span className={`avatar avatar-treino${grande ? ' grande' : ''}`} style={tinta(objetivo, 0.18)}>{iniciais}</span>;
}
