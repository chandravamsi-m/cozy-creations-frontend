// src/components/Navbar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo image.png";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../hooks/useCart";

export default function Navbar({
  stickyNavRef,
  menuOpen,
  setMenuOpen,
  setLoginModalOpen,
}) {
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const { cart } = useCart();

  // SEPARATE STATES for desktop & mobile dropdown
  const [desktopProfileOpen, setDesktopProfileOpen] = React.useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = React.useState(false);

  const desktopDropdownRef = React.useRef(null);

  // Close only DESKTOP dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        desktopDropdownRef.current &&
        !desktopDropdownRef.current.contains(e.target)
      ) {
        setDesktopProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Total quantity badge
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav
      ref={stickyNavRef}
      className="fixed top-0 left-0 w-full z-50 cc-nav-solid"
    >
      <div className="relative max-w-[1280px] mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          {/* LOGO */}
          <div
            className="h-10 w-28 relative overflow-hidden cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src={logo}
              alt="Logo"
              className="absolute w-[100%] h-[100%] object-contain"
            />
          </div>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden md:flex gap-10 text-xs text-white uppercase">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `hover:text-yellow-accent transition-colors ${
                  isActive ? "text-yellow-accent" : ""
                }`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                `hover:text-yellow-accent transition-colors ${
                  isActive ? "text-yellow-accent" : ""
                }`
              }
            >
              About Us
            </NavLink>

            <NavLink
              to="/products"
              className={({ isActive }) =>
                `hover:text-yellow-accent transition-colors ${
                  isActive ? "text-yellow-accent" : ""
                }`
              }
            >
              Products
            </NavLink>

            <NavLink
              to="/custom"
              className={({ isActive }) =>
                `hover:text-yellow-accent transition-colors ${
                  isActive ? "text-yellow-accent" : ""
                }`
              }
            >
              Custom
            </NavLink>
          </div>

          {/* RIGHT SIDE BUTTONS */}
          <div className="flex items-center gap-4">
            {/* CONTACT */}
            <NavLink
              to="/contact"
              className="hidden md:inline-flex bg-yellow-accent px-4 py-2 rounded-lg text-xs text-black hover:bg-yellow-500 transition-colors"
            >
              Contact Us
            </NavLink>

            {/* DESKTOP PROFILE DROPDOWN */}
            {user ? (
              <div className="relative hidden md:block" ref={desktopDropdownRef}>
                <button
                  onClick={() => setDesktopProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-white text-xs hover:text-yellow-accent transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-yellow-accent flex items-center justify-center text-black font-semibold">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span>Account</span>
                  <span className="text-[10px]">▼</span>
                </button>

                {desktopProfileOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-[999] animate-fadeIn">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">
                        {user.displayName || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-2">
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        My Profile
                      </button>
                      <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        Orders
                      </button>
                      <button
                        onClick={() => {
                          logoutUser();
                          setDesktopProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLoginModalOpen(true)}
                className="hidden md:inline-flex text-white text-xs hover:text-yellow-accent"
              >
                Login
              </button>
            )}

            {/* DESKTOP CART */}
            <button
              onClick={() => navigate("/cart")}
              className="relative hidden md:flex items-center justify-center text-white"
            >
              <span className="text-xl">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-yellow-accent text-black text-[10px] px-1.5 py-[1px] rounded-full font-semibold">
                  {cartCount}
                </span>
              )}
            </button>

            {/* MOBILE MENU TOGGLE */}
            <button
              className="md:hidden h-10 w-10 inline-flex items-center justify-center text-white text-2xl"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        <div
          className={`md:hidden absolute left-0 right-0 top-full w-full bg-black/80 backdrop-blur-md p-4 space-y-4 text-white text-sm shadow-lg transition-all duration-250 ${
            menuOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
          }`}
        >
          <NavLink
            to="/"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-yellow-accent"
          >
            Home
          </NavLink>

          <NavLink
            to="/about"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-yellow-accent"
          >
            About Us
          </NavLink>

          <NavLink
            to="/products"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-yellow-accent"
          >
            Products
          </NavLink>

          <NavLink
            to="/custom"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-yellow-accent"
          >
            Custom
          </NavLink>

          {/* MOBILE PROFILE DROPDOWN */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMobileProfileOpen((prev) => !prev)}
                className="w-full flex items-center justify-between py-2 px-1 hover:text-yellow-accent"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-yellow-accent flex items-center justify-center text-black font-semibold">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span>Account</span>
                </div>
                <span className="text-xs">
                  {mobileProfileOpen ? "▲" : "▼"}
                </span>
              </button>

              {mobileProfileOpen && (
  <div className="mt-1 ml-2 border-l border-white/20 pl-3 space-y-3 animate-fadeIn">

    {/* USER INFO BOX LIKE DESKTOP */}
    <div className="bg-white/10 p-3 rounded-lg">
      <p className="text-sm font-semibold">
        {user.displayName || "User"}
      </p>
      <p className="text-xs text-white/70 truncate">
        {user.email}
      </p>
    </div>

    {/* LINKS */}
    <button className="block w-full text-left py-1 hover:text-yellow-accent">
      My Profile
    </button>

    <button className="block w-full text-left py-1 hover:text-yellow-accent">
      Orders
    </button>

    <button
      onClick={() => {
        logoutUser();
        setMenuOpen(false);
        setMobileProfileOpen(false);
      }}
      className="block w-full text-left py-1 text-red-300 hover:text-red-200"
    >
      Logout
    </button>
  </div>
)}

            </div>
          ) : (
            <button
              onClick={() => {
                setMenuOpen(false);
                setLoginModalOpen(true);
              }}
              className="block hover:text-yellow-accent py-2"
            >
              Login
            </button>
          )}

          {/* MOBILE CART */}
          <button
            onClick={() => {
              setMenuOpen(false);
              navigate("/cart");
            }}
            className="relative block text-left hover:text-yellow-accent"
          >
            🛒 Cart{" "}
            {cartCount > 0 && (
              <span className="ml-2 bg-yellow-accent text-black text-[10px] px-2 rounded-full">
                {cartCount}
              </span>
            )}
          </button>

          {/* CONTACT BUTTON */}
          <NavLink
            to="/contact"
            onClick={() => setMenuOpen(false)}
            className="w-full block bg-yellow-accent text-black rounded-md py-2 text-xs font-semibold text-center hover:bg-yellow-500 transition-colors"
          >
            Contact Us
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
