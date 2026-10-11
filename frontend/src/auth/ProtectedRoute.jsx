import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider.jsx";

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <main className="center-state" role="status">Restoring your session…</main>;
  }
  if (status === "error") {
    return (
      <main className="center-state" role="alert">
        <h1>We couldn’t check your session</h1>
        <p>Check your connection and reload this page.</p>
      </main>
    );
  }
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
