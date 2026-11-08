// Ícones de traço simples, herdando a cor do texto.
const caminhos = {
  inicio: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  pessoas: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.5 3.5 5.2',
  projetos: 'M5 21V4h11l-2 4 2 4H5',
  relatorio: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  voltar: 'M15 6l-6 6 6 6',
  seta: 'M9 6l6 6-6 6',
  mais: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5L20 7',
  alerta: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16v.5',
  avaliacao: 'M9 3h6v3H9zM7 4.5H5v16.5h14V4.5h-2M9 12l2 2 4-4',
  novaPessoa: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c1-4 3.6-6 7-6M19 14v6M16 17h6',
  marca: 'M7 20V5h6a4.5 4.5 0 0 1 0 9H7',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  forca: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12',
  musculo: 'M7 20c-2-2-3-5-2-8l2-5c.5-1.3 2.2-1.6 3-.5l.8 1.2M9 11c2-1.5 5-1.5 7 0 2 1.5 2.5 4 1.5 6.5L16 20H7',
  fogo: 'M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-1.6.6-2.8 1.5-3.8.3 1.5 1 2.3 2 2.8C11 8 11 5.5 12 3zM8 15.5A4 4 0 0 0 12 21a4 4 0 0 0 4-5.5',
  equilibrio: 'M12 4v16M5 20h14M4 9h16M4 9l-2 5a3 3 0 0 0 4 0L4 9zM20 9l-2 5a3 3 0 0 0 4 0l-2-5z',
  mobilidade: 'M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 9l7 2 7-2M12 11v4l-4 6M12 15l4 6',
  coracao: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM5 12h3l2-3 3 5 2-2h4',
  raio: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  idoso: 'M10 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22l1.5-7L8 11l2-3 3 2 1 4M16 13v9M14 13h3',
  adulto: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4.5 4.2-7 8-7s7 2.5 8 7',
  atleta: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4',
  crianca: 'M12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 21v-5l-2-3 3-2h8l3 2-2 3v5',
  gestante: 'M11 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 22v-6M13 22v-5M9 8l-1 6h2M10 8c3 0 6 2.5 6 6 0 1.7-1.3 3-3 3h-3',
  reabilitacao: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
  lupa: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  modelo: 'M4 5h16v4H4zM4 13h7v6H4zM15 13h5v6h-5z',
  grafico: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  estrela: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  lampada: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
};

export default function Icone({ nome, tamanho = 20, espessura = 2 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={espessura} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={caminhos[nome]} />
    </svg>
  );
}
