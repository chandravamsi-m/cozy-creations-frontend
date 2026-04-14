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
  LayoutDashboard
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
      <div className="h-screen flex overflow-hidden bg-gray-50">

        {/* MOBILE HEADER & HAMBURGER */}
        <div className="md:hidden fixed top-0 w-full bg-gray-900 text-white z-40 p-4 flex items-center justify-between shadow-md h-16">
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
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white p-5 space-y-4 h-full overflow-y-auto transform transition-transform duration-300 ease-in-out
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

          <nav className="flex flex-col gap-2">
            <Link to="/admin" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors">
              <LayoutDashboard className="w-5 h-5 text-gray-400" />
              <span>Dashboard</span>
            </Link>

            <Link to="/admin/products" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors">
              <Package className="w-5 h-5 text-gray-400" />
              <span>Products</span>
            </Link>

            <Link to="/admin/bulk-products" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors">
              <Layers className="w-5 h-5 text-gray-400" />
              <span>Bulk Products</span>
            </Link>

            <Link to="/admin/orders" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors">
              <FileText className="w-5 h-5 text-gray-400" />
              <span>Orders</span>
            </Link>

            <Link to="/admin/users" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors">
              <Users className="w-5 h-5 text-gray-400" />
              <span>Users</span>
            </Link>

            <Link to="/admin/offers" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors">
              <Gift className="w-5 h-5 text-gray-400" />
              <span>Offers</span>
            </Link>

            <Link to="/admin/delivery" onClick={closeSidebar} className="flex items-center gap-3 p-2 rounded hover:bg-gray-800 transition-colors">
              <Truck className="w-5 h-5 text-gray-400" />
              <span>Delivery</span>
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
        <main ref={mainRef} className="flex-1 h-full overflow-y-auto pt-16 md:pt-0 bg-gray-50">
          <React.Suspense fallback={
             <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
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
          }>
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
          </React.Suspense>
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
