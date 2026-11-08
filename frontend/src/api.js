// Cliente da API. O token fica num cookie httpOnly: o código da página nunca o vê.
export class ErroApi extends Error {
  constructor(status, corpo) {
    super(corpo?.erro || 'Algo deu errado.');
    this.status = status;
    this.codigo = corpo?.codigo;
  }
}

async function chamar(metodo, caminho, corpo) {
  const res = await fetch(`/api${caminho}`, {
    method: metodo,
    credentials: 'same-origin',
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ErroApi(res.status, json);
  return json;
}

export const api = {
  get: (c) => chamar('GET', c),
  post: (c, b) => chamar('POST', c, b),
  put: (c, b) => chamar('PUT', c, b),
  patch: (c, b) => chamar('PATCH', c, b),
  del: (c) => chamar('DELETE', c),
};

// Baixa um arquivo da API (ex.: CSV) usando o cookie de sessão.
export async function baixar(caminho, nomeArquivo) {
  const res = await fetch(`/api${caminho}`, { credentials: 'same-origin' });
  if (!res.ok) throw new ErroApi(res.status, await res.json().catch(() => null));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

// Converte "78,4" ou "78.4" em número; vazio vira undefined.
export function numero(valor) {
  if (valor === '' || valor == null) return undefined;
  const n = Number(String(valor).replace(',', '.').replace('−', '-'));
  return Number.isFinite(n) ? n : undefined;
}

export const formatarData = (iso) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR') : '—';

export const iniciaisDe = (nome = '') =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
