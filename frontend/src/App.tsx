import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { isLoggedIn } from "./app/shared";
import FactoryDashboard from "./pages/FactoryDashboard";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/OperationDashboard";
import AreaPage, { AdmissionManualsPage, WorkstationPage } from "./pages/AreaPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { ClientLoginPage, ClientPendingFormPage, ClientPendingListPage, ClientPrivateRoute } from "./pages/ClientPortal";

function PrivateRoute({ children }: { children: ReactNode }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cliente/login" element={<ClientLoginPage />} />
        <Route path="/cliente/pendencias" element={<ClientPrivateRoute><ClientPendingListPage /></ClientPrivateRoute>} />
        <Route path="/cliente/pendencias/:pendingId" element={<ClientPrivateRoute><ClientPendingFormPage /></ClientPrivateRoute>} />
        <Route path="/" element={<PrivateRoute><FactoryDashboard /></PrivateRoute>} />
        <Route path="/operation" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/area/:areaId" element={<PrivateRoute><AreaPage /></PrivateRoute>} />
        <Route path="/area/pessoal/station/admissoes/manuals" element={<PrivateRoute><AdmissionManualsPage /></PrivateRoute>} />
        <Route path="/area/:areaId/station/:stationId" element={<PrivateRoute><WorkstationPage /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><PlaceholderPage title="Relatorios" /></PrivateRoute>} />
        <Route path="/indicators" element={<PrivateRoute><PlaceholderPage title="Indicadores" /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><PlaceholderPage title="Configuracoes" /></PrivateRoute>} />
        <Route path="/help" element={<PrivateRoute><PlaceholderPage title="Ajuda" /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
