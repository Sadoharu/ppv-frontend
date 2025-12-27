// src/components/RequireAdmin.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/state/auth";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
