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
    { id: "profile", label: "Personal Profile", icon: "👤", path: "/profile" },
    { id: "orders", label: "Order History", icon: "📦", path: "/my-orders" },
    { id: "addresses", label: "Saved Addresses", icon: "📍", path: "/addresses" },
  ];

  return (
    <div className="w-full lg:w-56 shrink-0 lg:sticky lg:top-24 h-fit">
      {/* Profile Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-yellow-accent/20 flex items-center justify-center text-xl shadow-sm border border-yellow-accent/10 transition-transform hover:scale-105">
          {userData?.displayName?.charAt(0) || userData?.email?.charAt(0).toUpperCase() || "U"}
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {userData?.displayName || "User"}
          </h2>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-0.5">
        {sidebarLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => link.path !== "#" && navigate(link.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all group ${location.pathname === link.path
              ? "bg-yellow-accent text-black shadow-md shadow-yellow-accent/10"
              : "text-gray-500 hover:bg-white hover:text-gray-900"
              }`}
          >
            <span className={`text-base transition-transform group-hover:scale-110`}>
              {link.icon}
            </span>
            {link.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
