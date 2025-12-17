// src/pages/admin/AdminLayout.jsx
import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminLayout() {
  const { user, isAdmin, logoutUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) navigate("/");
    if (user && !isAdmin) navigate("/");
  }, [user, isAdmin]);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  return (
    <div className="h-screen flex overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-60 bg-gray-900 text-white p-5 space-y-4 h-full overflow-y-auto shrink-0">
        <h1 className="text-xl font-bold mb-6">Admin Panel</h1>

        <nav className="flex flex-col gap-3">
          <Link to="/admin" className="hover:underline">
            📦 All Products
          </Link>

          <Link to="/admin/create" className="hover:underline">
            ➕ Create Product
          </Link>

          <Link to="/admin/orders" className="hover:underline">
            🧾 Orders
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="mt-10 bg-red-600 px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 bg-gray-50 h-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
