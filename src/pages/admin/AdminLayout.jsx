import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ToastProvider } from "../../contexts/ToastContext";
import ConfirmModal from "../../components/ConfirmModal";
import Skeleton from "../../components/common/Skeleton";
import {
  Menu,
  X,
  Package,
  Layers,
  FileText,
  Users,
  Gift,
  Truck,
  LayoutDashboard,
  Sparkles,
  Flower2,
  Flame,
  Boxes
} from "lucide-react";

export default function AdminLayout() {
  const { user, isAdmin, loading, logoutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = React.useRef(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Automatically scroll main content to top on route change
  React.useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      navigate("/");
    }
  }, [user, isAdmin, loading, navigate]);

  const [confirmModal, setConfirmModal] = React.useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { }
  });

  const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Logout",
      message: "Are you sure you want to sign out of the Admin Panel?",
      onConfirm: async () => {
        await logoutUser();
        navigate("/");
      }
    });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <ToastProvider>
      <div className="h-screen w-full flex overflow-hidden bg-gray-50">

        {/* MOBILE HEADER & HAMBURGER */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 text-white z-40 p-4 flex items-center justify-between shadow-md h-16">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded focus:outline-none hover:bg-gray-800 z-50 transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <h1 className="text-lg font-bold absolute left-1/2 transform -translate-x-1/2">
            Admin Panel
          </h1>
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
          fixed inset-y-0 left-0 z-50 w-64 md:w-56 lg:w-64 bg-gray-900 text-white p-5 space-y-4 h-full overflow-y-auto transform transition-transform duration-300 ease-in-out
          md:static md:translate-x-0 md:inset-auto shrink-0
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <button
              onClick={closeSidebar}
              className="md:hidden text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-1">
            {[
              { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
              { to: "/admin/products", icon: Flame, label: "Candles" },
              { to: "/admin/bulk-products", icon: Boxes, label: "Bulk Candles" },
              { to: "/admin/scented-sticks", icon: Flower2, label: "Scented Sticks" },
              { to: "/admin/perfumes", icon: Sparkles, label: "Perfumes" },
              { to: "/admin/orders", icon: FileText, label: "Orders" },
              { to: "/admin/users", icon: Users, label: "Users" },
              { to: "/admin/offers", icon: Gift, label: "Offers" },
              { to: "/admin/delivery", icon: Truck, label: "Delivery" },
            ].map((item) => {
              const isActive = item.exact 
                ? location.pathname === item.to 
                : location.pathname.startsWith(item.to) && (item.to !== "/admin" || location.pathname === "/admin");
              
              const Icon = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3 px-4 py-2 rounded-lg transition-colors
                    ${isActive 
                      ? "bg-gray-800 text-white" 
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                  <span className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="w-full mt-10 bg-red-600 px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main ref={mainRef} className="flex-1 h-full overflow-y-auto pt-16 md:pt-0 bg-gray-50">
          <div className="p-4 sm:p-6 lg:p-8">
            {loading ? (
              <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-2 mb-8 mt-2">
                  <Skeleton width="220px" height="32px" />
                  <Skeleton width="140px" height="20px" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} height="120px" borderRadius="16px" className="w-full" />
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-8">
                  <Skeleton height="400px" borderRadius="16px" className="w-full" />
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </ToastProvider>
  );
}
