// src/components/UserSidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Reusable Sidebar for User Profile pages (Profile, Orders, etc.)
 * Features: Sticky behavior, active state tracking, and consistent styling.
 */
export default function UserSidebar({ userData }) {
  const navigate = useNavigate();
  const location = useLocation();

  const sidebarLinks = [
    { id: "profile", label: "Personal Profile", shortLabel: "Profile", icon: "👤", path: "/profile" },
    { id: "orders", label: "Order History", shortLabel: "Orders", icon: "📦", path: "/my-orders" },
    { id: "addresses", label: "Saved Addresses", shortLabel: "Addresses", icon: "📍", path: "/addresses" },
  ];

  return (
    <div className="w-full lg:w-56 shrink-0 lg:sticky lg:top-24 h-fit">
      {/* Profile Header - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-yellow-accent/20 flex items-center justify-center text-xl shadow-sm border border-yellow-accent/10 transition-transform hover:scale-105">
          {userData?.displayName?.charAt(0) || userData?.email?.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {userData?.displayName || "User"}
          </h2>
        </div>
      </div>

      {/* Premium Segmented Control for Mobile / Vertical for Desktop */}
      <div className="lg:contents">
        <nav className="flex lg:flex-col items-center bg-gray-100/50 lg:bg-transparent p-1 lg:p-0 rounded-xl lg:rounded-none overflow-x-auto lg:overflow-x-visible no-scrollbar gap-1 lg:space-y-0.5 scroll-smooth backdrop-blur-sm border border-gray-200/50 lg:border-none shadow-sm lg:shadow-none mb-4 lg:mb-0 transition-all duration-500">
          {sidebarLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <button
                key={link.id}
                onClick={() => link.path !== "#" && navigate(link.path)}
                className={`flex items-center justify-center lg:justify-start gap-1.5 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg lg:rounded-xl text-[10px] lg:text-[13px] font-bold transition-all duration-300 group whitespace-nowrap shrink-0 flex-1 lg:flex-none ${isActive
                  ? "bg-white lg:bg-yellow-accent text-black shadow-sm lg:shadow-md lg:shadow-yellow-accent/10 scale-100 lg:scale-105"
                  : "text-gray-500 hover:text-gray-900 lg:hover:bg-white/50"
                  }`}
              >
                <span className={`text-[13px] lg:text-base transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110 grayscale opacity-70"}`}>
                  {link.icon}
                </span>
                <span className="tracking-tight">
                  <span className="lg:hidden">{link.shortLabel}</span>
                  <span className="hidden lg:inline">{link.label}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
