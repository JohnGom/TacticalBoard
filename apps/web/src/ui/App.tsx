import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { AccountPage } from "../pages/AccountPage";
import { NewBoardPage, SavedBoardPage } from "../pages/BoardPages";
import { LandingPage } from "../pages/LandingPage";
import { PrivacyPage, TermsPage } from "../pages/LegalPages";
import { CustomTeamPage, TeamsPage } from "../pages/TeamsPage";
import { WorkspacePage } from "../pages/WorkspacePage";

function PrivateRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <main className="auth-loading" role="status">Comprobando tu espacio…</main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/login" element={<AccountPage mode="login" />} />
      <Route path="/register" element={<AccountPage mode="register" />} />
      <Route element={<PrivateRoutes />}>
        <Route path="/app" element={<WorkspacePage />} />
        <Route path="/app/boards/new" element={<NewBoardPage />} />
        <Route path="/app/boards/:boardId" element={<SavedBoardPage />} />
        <Route path="/app/teams" element={<TeamsPage />} />
        <Route path="/app/teams/:teamId" element={<CustomTeamPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
