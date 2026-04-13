import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Skeleton from "../../components/common/Skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { 
  IndianRupee, 
  ShoppingCart, 
  Users, 
  Package,
  FileText,
  TrendingUp,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { apiFetch } from "../../lib/api";

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    totalUsers: 0,
    activeProducts: 0,
    salesTrend: { days: [], weeks: [], months: [] },
    ordersByStatus: []
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [adminName, setAdminName] = useState("");
  const [timeRange, setTimeRange] = useState("months");

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const token = await user.getIdToken();
        const res = await apiFetch("/admin/dashboard-stats", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error("Failed to fetch dashboard statistics");
        const data = await res.json();
        
        if (isMounted && data.success) {
          setStats(data.stats);
          setRecentOrders(data.recentOrders);
          if (data.adminName) setAdminName(data.adminName);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          showToast("Failed to load dashboard data", "error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (user) {
      fetchDashboardStats();
    }

    return () => { isMounted = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 p-0 sm:p-2">
        <div className="flex flex-col gap-2 mb-8 mt-2">
          <Skeleton width="220px" height="32px" />
          <Skeleton width="140px" height="20px" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="120px" borderRadius="16px" className="w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          <div className="lg:col-span-2">
            <Skeleton height="400px" borderRadius="16px" className="w-full" />
          </div>
          <Skeleton height="400px" borderRadius="16px" className="w-full" />
        </div>
      </div>
    );
  }

  // Helper date format
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };
  
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  const statCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      subtitle: "All time records",
      icon: <ShoppingCart className="w-6 h-6 text-blue-600" />,
      bg: "bg-blue-50"
    },
    {
      title: "Active Products",
      value: stats.activeProducts.toLocaleString(),
      subtitle: "Live in store",
      icon: <Package className="w-6 h-6 text-purple-600" />,
      bg: "bg-purple-50"
    },
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      subtitle: "Registered accounts",
      icon: <Users className="w-6 h-6 text-orange-600" />,
      bg: "bg-orange-50"
    }
  ];

  return (
    <div className="-mx-4 sm:mx-0 p-0 sm:p-6 lg:p-8 w-[calc(100%+2rem)] sm:w-full space-y-4 sm:space-y-8 animate-in fade-in duration-500 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-1 sm:gap-4 mb-2 p-4 sm:p-0">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {getGreeting()}, {adminName || user?.displayName || "Admin"} 👋
          </h1>
          <p className="text-[11px] sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">{formattedDate}</p>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-3 sm:px-0">
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className={`p-2 sm:p-3 rounded-xl bg-green-50 text-green-600`}>
              <IndianRupee className="w-5 h-5 sm:w-6 h-6" />
            </div>
          </div>
          <h3 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight mb-0.5 sm:mb-1">
            ₹{stats.totalRevenue.toLocaleString()}
          </h3>
          <p className="text-[11px] sm:text-sm font-bold text-gray-900">Total Revenue</p>
          <p className="text-[9px] sm:text-xs font-bold text-gray-400 mt-0.5 sm:mt-1 uppercase tracking-wider leading-tight">
            {stats.deliveredOrders || 0} Delivered
          </p>
          <div className="absolute -right-4 -bottom-4 sm:-right-6 sm:-bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
            <IndianRupee className="w-20 h-20 sm:w-32 h-32" />
          </div>
        </div>

        {/* Mapped Stats for others */}
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm flex flex-col relative overflow-hidden group">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-xl ${stat.bg}`}>
                {React.cloneElement(stat.icon, { className: "w-5 h-5 sm:w-6 h-6" })}
              </div>
            </div>
            <h3 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight mb-0.5 sm:mb-1">{stat.value}</h3>
            <p className="text-[11px] sm:text-sm font-bold text-gray-900">{stat.title}</p>
            <p className="text-[9px] sm:text-xs font-bold text-gray-400 mt-0.5 sm:mt-1 uppercase tracking-wider leading-tight">{stat.subtitle}</p>
            
            <div className="absolute -right-4 -bottom-4 sm:-right-6 sm:-bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-300 pointer-events-none">
              {React.cloneElement(stat.icon, { className: "w-20 h-20 sm:w-32 h-32" })}
            </div>
          </div>
        ))}
      </div>

      {/* SALES TREND CHART */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-8">
        <div className="flex flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-gray-900 truncate">Orders Overview</h2>
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">
                Last {timeRange === 'days' ? '7 Days' : `6 ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`}
              </p>
            </div>
          </div>
          
          <div className="relative w-auto sm:min-w-[140px] shrink-0">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[11px] sm:text-sm font-bold rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full outline-none pl-3 pr-7 py-1.5 sm:px-4 sm:py-2 cursor-pointer transition-shadow"
            >
              <option value="days">Last 7 Days</option>
              <option value="weeks">Last 6 Weeks</option>
              <option value="months">Last 6 Months</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>
        </div>
        
        <div className="h-80 sm:h-96 w-full">
          {stats.salesTrend && stats.salesTrend[timeRange] && stats.salesTrend[timeRange].length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.salesTrend[timeRange]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9ca3af' }} 
                  allowDecimals={false}
                />
                <CartesianGrid vertical={false} stroke="#f3f4f6" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value}`, "Orders"]}
                />
                <Area type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <p className="text-sm font-medium">No sales data for the selected period.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        
        {/* RECENT ORDERS (Takes 2 columns on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-row items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
              <p className="text-xs text-gray-500 font-medium">Latest 5 transactions</p>
            </div>
            <Link 
              to="/admin/orders" 
              onClick={() => window.scrollTo(0, 0)}
              className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
            >
              View All →
            </Link>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Order ID</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4">Customer</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 sm:px-6 sm:py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-6 sm:px-6 sm:py-8 text-center text-gray-500">No recent orders found.</td>
                  </tr>
                ) : (
                  recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group text-[11px] sm:text-sm">
                      <td className="px-4 py-3 sm:px-6 sm:py-4 font-mono font-bold text-gray-900">
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-gray-600 hidden md:table-cell">
                        {order.createdAtIso 
                          ? new Date(order.createdAtIso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : "Unknown"}
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 max-w-[100px] truncate">
                        <p className="font-bold text-gray-900">{order.shippingAddress?.fullName || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 hidden sm:table-cell">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border
                          ${order.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-100' : 
                            order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' : 
                            order.status === 'shipped' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 text-right font-black text-gray-900">
                        ₹{order.total}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ORDER STATUS PIE CHART */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <PieChartIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order Status</h2>
                <p className="text-xs text-gray-500 font-medium">Excluding delivered orders</p>
              </div>
            </div>
          </div>
          
            <div className="flex-1 flex flex-col items-center justify-center min-h-[340px] outline-none focus:outline-none focus:ring-0 select-none overflow-hidden [&_*]:outline-none [&_*]:ring-0" style={{ WebkitTapHighlightColor: 'transparent', outline: 'none' }}>
              {!stats.ordersByStatus || stats.ordersByStatus.length === 0 ?
                <p className="text-center text-gray-500 text-sm py-4">No order data available.</p>
              : (
                <ResponsiveContainer width="100%" height={320} className="outline-none">
                  <PieChart className="outline-none">
                    <Pie
                      data={stats.ordersByStatus}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                      activeShape={false}
                      isAnimationActive={true}
                      className="focus:outline-none outline-none"
                    >
                      {stats.ordersByStatus.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PIE_COLORS[index % PIE_COLORS.length]} 
                          style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                          className="cursor-default outline-none"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value}`, name]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={70}
                      wrapperStyle={{ paddingTop: "0px" }}
                      iconType="circle"
                      formatter={(value, entry) => (
                        <span className="text-xs font-bold text-gray-700 ml-1">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
        </div>

      </div>
    </div>
  );
}
