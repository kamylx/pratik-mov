import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import Layout from './componentes/Layout.jsx';
import Entrar from './paginas/Entrar.jsx';
import Cadastro from './paginas/Cadastro.jsx';
import Inicio from './paginas/Inicio.jsx';
import Pessoas from './paginas/Pessoas.jsx';
import NovaPessoa from './paginas/NovaPessoa.jsx';
import Pessoa from './paginas/Pessoa.jsx';
import NovaAvaliacao from './paginas/NovaAvaliacao.jsx';
import EditarPlano from './paginas/EditarPlano.jsx';
import NovaSessao from './paginas/NovaSessao.jsx';
import Relatorio from './paginas/Relatorio.jsx';
import Pro from './paginas/Pro.jsx';
import Projetos from './paginas/Projetos.jsx';
import NovoProjeto from './paginas/NovoProjeto.jsx';
import Projeto from './paginas/Projeto.jsx';
import Termos from './paginas/Termos.jsx';
import Perfil from './paginas/Perfil.jsx';
import Portfolio from './paginas/Portfolio.jsx';
import ProfInicio from './paginas/professor/ProfInicio.jsx';
import ProfAluno from './paginas/professor/ProfAluno.jsx';
import ProfFicha from './paginas/professor/ProfFicha.jsx';

const SessaoContext = createContext(null);
export const useSessao = () => useContext(SessaoContext);

export default function App() {
  const [usuario, setUsuario] = useState(undefined); // undefined = carregando

  useEffect(() => {
    api.get('/auth/eu').then((r) => setUsuario(r.usuario)).catch(() => setUsuario(null));
  }, []);

  const sair = async () => {
    await api.post('/auth/logout', {}).catch(() => {});
    setUsuario(null);
  };

  if (usuario === undefined) return <div className="carregando">Carregando…</div>;

  return (
    <SessaoContext.Provider value={{ usuario, setUsuario, sair }}>
      <Routes>
        {usuario?.papel === 'professor' ? (
          <Route element={<Layout professor />}>
            <Route path="/" element={<ProfInicio />} />
            <Route path="/alunos/:alunoId" element={<ProfAluno />} />
            <Route path="/alunos/:alunoId/pessoas/:itemId" element={<ProfFicha tipo="pessoa" />} />
            <Route path="/alunos/:alunoId/projetos/:itemId" element={<ProfFicha tipo="projeto" />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : usuario ? (
          <Route element={<Layout />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/pessoas" element={<Pessoas />} />
            <Route path="/pessoas/nova" element={<NovaPessoa />} />
            <Route path="/pessoas/:id" element={<Pessoa />} />
            <Route path="/pessoas/:id/avaliacao" element={<NovaAvaliacao />} />
            <Route path="/pessoas/:id/plano" element={<EditarPlano />} />
            <Route path="/pessoas/:id/sessao" element={<NovaSessao />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="/pro" element={<Pro />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/projetos/novo" element={<NovoProjeto />} />
            <Route path="/projetos/:id" element={<Projeto />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/termos" element={<Termos />} />
            <Route path="*" element={<Entrar />} />
          </>
        )}
      </Routes>
    </SessaoContext.Provider>
  );
}
