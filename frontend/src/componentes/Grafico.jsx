import { useId } from 'react';

// Gráfico de área com linhas de grade, na cor do treino da pessoa.
export default function Grafico({ pontos, rotulo, unidade = '', cor = '#A78BFA', menorMelhor = false }) {
  const id = useId().replace(/:/g, '');
  if (pontos.length < 2) {
    return (
      <div className="grafico-vazio">
        <p className="sutil">Faça ao menos duas avaliações para ver a evolução.</p>
      </div>
    );
  }
  const L = 320, A = 150, esq = 30, dir = 14, topo = 26, base = 112;
  const valores = pontos.map((p) => p.valor);
  let min = Math.min(...valores), max = Math.max(...valores);
  const folga = (max - min) * 0.25 || Math.abs(max) * 0.1 || 1;
  min -= folga; max += folga;
  const x = (i) => esq + (i * (L - esq - dir)) / (pontos.length - 1);
  const y = (v) => base - ((v - min) / (max - min)) * (base - topo);
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.valor)}`).join(' ');
  const area = `${linha} L${x(pontos.length - 1)},${base} L${x(0)},${base} Z`;
  const grade = [0, 0.5, 1].map((t) => min + t * (max - min));
  const primeiro = valores[0], ultimo = valores.at(-1);
  const delta = Math.round((ultimo - primeiro) * 10) / 10;
  const melhorou = menorMelhor ? delta < 0 : delta > 0;
  const fmt = (v) => String(Math.round(v * 10) / 10).replace('.', ',');

  return (
    <figure className="grafico">
      <div className="grafico-topo">
        <div>
          <span className="grafico-valor">{fmt(ultimo)}<small> {unidade}</small></span>
          <span className="sutil">{rotulo}</span>
        </div>
        {delta !== 0 && (
          <span className="grafico-delta" data-melhor={melhorou}>
            {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))} {unidade}
          </span>
        )}
      </div>
      <svg width="100%" viewBox={`0 0 ${L} ${A}`} role="img"
        aria-label={`${rotulo}: de ${fmt(primeiro)} para ${fmt(ultimo)} ${unidade} em ${pontos.length} avaliações`}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {grade.map((v, i) => (
          <g key={i}>
            <line x1={esq} x2={L - dir} y1={y(v)} y2={y(v)} stroke="#2E2642" strokeDasharray={i === 0 ? '' : '3 4'} />
            <text x={esq - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#7D7396">{fmt(v)}</text>
          </g>
        ))}
        <path d={area} fill={`url(#g${id})`} />
        <path d={linha} fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pontos.map((p, i) => {
          const ult = i === pontos.length - 1;
          return (
            <g key={i}>
              {ult && <circle cx={x(i)} cy={y(p.valor)} r="10" fill={cor} opacity="0.18" />}
              <circle cx={x(i)} cy={y(p.valor)} r={ult ? 5 : 3.5} fill={ult ? cor : '#1C1729'} stroke={cor} strokeWidth="2" />
              <text x={x(i)} y={y(p.valor) - 11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#F2EEFA">{fmt(p.valor)}</text>
              <text x={x(i)} y={A - 8} textAnchor="middle" fontSize="10.5" fill="#A99FC0">{p.legenda}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
