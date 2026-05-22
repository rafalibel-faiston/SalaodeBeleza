import { HashRouter, Routes, Route } from 'react-router-dom';
import ClientBooking from './pages/ClientBooking';
import AdminDashboard from './pages/AdminDashboard';
import ClientVIP from './pages/ClientVIP';

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Rota da Cliente: raiz do site → agendamento */}
        <Route path="/" element={<ClientBooking />} />

        {/* Rota da Giovanna: acesso via /#/gerencia */}
        <Route path="/gerencia" element={<AdminDashboard />} />

        {/* Painel VIP: cliente consulta seus agendamentos via /#/minha-conta */}
        <Route path="/minha-conta" element={<ClientVIP />} />
      </Routes>
    </HashRouter>
  );
}

export default App;