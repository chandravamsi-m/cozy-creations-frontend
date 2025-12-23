// src/pages/admin/AdminLayout.jsx
import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminLayout() {
  const { user, isAdmin, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user) navigate("/");
    if (user && !isAdmin) navigate("/");
  }, [user, isAdmin]);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">

      {/* MOBILE HEADER & HAMBURGER */}
      <div className="md:hidden fixed top-0 w-full bg-gray-900 text-white z-40 p-4 flex items-center justify-between shadow-md h-16">
        {/* Hamburger on LEFT */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded focus:outline-none hover:bg-gray-800 z-50"
        >
          {sidebarOpen ? "✕" : "☰"}
        </button>

        {/* Title CENTERED */}
        <h1 className="text-lg font-bold absolute left-1/2 transform -translate-x-1/2">
          Admin Panel
        </h1>
        
        {/* Empty placeholder to balance flex if needed, or just rely on absolute centering */}
        <div className="w-8"></div> 
      </div>

      {/* MOBILE BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* SIDEBAR */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white p-5 space-y-4 h-full overflow-y-auto transform transition-transform duration-300 ease-in-out
          md:static md:translate-x-0 md:inset-auto shrink-0
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          {/* Close button inside sidebar for mobile */}
          <button 
            onClick={closeSidebar}
            className="md:hidden text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-3">
          <Link to="/admin" onClick={closeSidebar} className="hover:underline p-2 rounded hover:bg-gray-800 transition-colors">
            📦 All Products
          </Link>

          <Link to="/admin/create" onClick={closeSidebar} className="hover:underline p-2 rounded hover:bg-gray-800 transition-colors">
            ➕ Create Product
          </Link>

          <Link to="/admin/orders" onClick={closeSidebar} className="hover:underline p-2 rounded hover:bg-gray-800 transition-colors">
            🧾 Orders
          </Link>

          <Link to="/admin/users" onClick={closeSidebar} className="hover:underline p-2 rounded hover:bg-gray-800 transition-colors">
            👥 Users
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="w-full mt-10 bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 h-full overflow-y-auto pt-20 md:pt-6 w-full">
        <Outlet />
      </main>
    </div>
  );
}
