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
  transparent = false,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart } = useCart();

  // Total quantity badge
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav
      ref={stickyNavRef}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-black/70 backdrop-blur-md shadow-lg"
      }`}
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

          {/* DESKTOP NAV LINKS */}
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
            {/* CONTACT BUTTON */}
            <NavLink
              to="/contact"
              className="hidden md:inline-flex bg-yellow-accent px-4 py-2 rounded-lg text-xs text-black capitalize hover:bg-yellow-500 transition-colors"
            >
              Contact Us
            </NavLink>

            {/* LOGIN BUTTON */}
            <button
              onClick={() => navigate("/login")} // optional - or open modal
              className="hidden md:inline-flex text-white text-xs hover:text-yellow-accent transition-colors"
            >
              {user ? "Profile" : "Login"}
            </button>

            {/* CART BUTTON */}
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
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              type="button"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        <div
          className={`md:hidden absolute left-0 right-0 top-full w-full bg-black/80 backdrop-blur-md p-4 space-y-4 text-white text-sm shadow-lg origin-top transition-all duration-250 ease-out z-40 ${
            menuOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
          }`}
        >
          <NavLink
            onClick={() => setMenuOpen(false)}
            to="/"
            className="block hover:text-yellow-accent"
          >
            Home
          </NavLink>
          <NavLink
            onClick={() => setMenuOpen(false)}
            to="/about"
            className="block hover:text-yellow-accent"
          >
            About Us
          </NavLink>
          <NavLink
            onClick={() => setMenuOpen(false)}
            to="/products"
            className="block hover:text-yellow-accent"
          >
            Products
          </NavLink>
          <NavLink
            onClick={() => setMenuOpen(false)}
            to="/custom"
            className="block hover:text-yellow-accent"
          >
            Custom
          </NavLink>

          {/* Login */}
          <button
            onClick={() => {
              setMenuOpen(false);
              navigate("/login");
            }}
            className="block hover:text-yellow-accent"
          >
            {user ? "Profile" : "Login"}
          </button>

          {/* CART BUTTON */}
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

          <NavLink
            onClick={() => setMenuOpen(false)}
            to="/contact"
            className="w-full block bg-yellow-accent text-black rounded-md py-2 text-xs font-semibold text-center hover:bg-yellow-500 transition-colors"
          >
            Contact Us
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
