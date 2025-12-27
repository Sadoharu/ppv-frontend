// src/components/AdminLayout.tsx
import { Outlet, Link, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen">
      <nav className="p-4 border-b bg-white flex gap-4">
        <Link className={pathname==="/admin" ? "font-semibold" : ""} to="/admin">Панель</Link>
        <Link className={pathname==="/admin/codes" ? "font-semibold" : ""} to="/admin/codes">Коди</Link>
      </nav>
      <Outlet />
    </div>
  );
}
