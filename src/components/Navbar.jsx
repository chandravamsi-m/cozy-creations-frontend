// src/components/Navbar.jsx
import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/images/logo image.webp";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../hooks/useCart";
import { useLoginModal } from "../contexts/LoginModalContext";

import cartIcon from "../assets/svgs/cart-icon.svg";

export default function Navbar({
  stickyNavRef,
  menuOpen,
  setMenuOpen,
}) {
  const { openLoginModal } = useLoginModal();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutUser } = useAuth();
  const { cart } = useCart();

  // SEPARATE STATES for desktop & mobile dropdown
  const [desktopProfileOpen, setDesktopProfileOpen] = React.useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = React.useState(false);

  const desktopDropdownRef = React.useRef(null);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      // Desktop Profile Dropdown
      if (
        desktopDropdownRef.current &&
        !desktopDropdownRef.current.contains(e.target)
      ) {
        setDesktopProfileOpen(false);
      }

      // Mobile Hamburger Menu
      if (
        menuOpen &&
        stickyNavRef.current &&
        !stickyNavRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, setMenuOpen, stickyNavRef]);

  // Total quantity badge
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const firstName = React.useMemo(() => {
    if (!user) return "";
    const raw = (user.displayName || user.email || "").trim();
    if (!raw) return "";
    const base = raw.includes("@") ? raw.split("@")[0] : raw;
    const first = base.split(/\s+/).filter(Boolean)[0] || base;
    return first.length ? first.charAt(0).toUpperCase() + first.slice(1) : "";
  }, [user]);

  const navLinkClass = ({ isActive }) =>
    `hover:text-yellow-accent transition-colors ${isActive ? "text-yellow-accent" : ""
    }`;

  return (
    <nav
      ref={stickyNavRef}
      className={`fixed top-0 left-0 w-full z-50 ${location.pathname === "/" ? "cc-nav-hero" : "cc-nav-solid"
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

          {/* DESKTOP NAVIGATION */}
          <div className="hidden md:flex gap-10 text-xs text-white uppercase">
            <NavLink
              to="/"
              className={navLinkClass}
            >
              Home
            </NavLink>

            <NavLink
              to="/about"
              className={navLinkClass}
            >
              About Us
            </NavLink>

            <NavLink
              to="/products"
              className={navLinkClass}
            >
              Products
            </NavLink>

            <NavLink
              to="/contact"
              className={navLinkClass}
            >
              Contact Us
            </NavLink>
          </div>

          {/* RIGHT SIDE BUTTONS */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
            {/* Nav Shop Now Link (Secondary CTA - Hidden on Home Hero) */}
            <button
              onClick={() => navigate("/products", { state: { scrollTo: "products", skipHero: true } })}
              className="nav-shop-now hidden sm:inline-flex border border-yellow-accent/30 hover:bg-white hover:text-black text-yellow-accent px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 mr-1"
            >
              Shop Now
            </button>

            {/* DESKTOP PROFILE DROPDOWN */}
            {user ? (
              <div className="relative hidden md:block" ref={desktopDropdownRef}>
                <button
                  onClick={() => setDesktopProfileOpen((prev) => !prev)}
                  className="flex items-center gap-2 text-white text-xs hover:text-yellow-accent transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 border border-white/10 flex items-center justify-center text-white font-semibold">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[90px] truncate">{firstName || "Account"}</span>
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
                      <button
                        onClick={() => {
                          navigate("/profile");
                          setDesktopProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Account Settings
                      </button>
                      <button
                        onClick={() => {
                          logoutUser();
                          navigate("/");
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
                onClick={openLoginModal}
                className="hidden md:inline-flex bg-yellow-accent px-4 py-2 rounded-lg text-xs font-semibold text-black hover:bg-yellow-500 transition-colors"
              >
                Login
              </button>
            )}

            {/* Mobile Shop Now (Smaller version next to cart) */}
            <button
              onClick={() => navigate("/products", { state: { scrollTo: "products", skipHero: true } })}
              className="nav-shop-now sm:hidden flex items-center justify-center border border-yellow-accent/30 text-yellow-accent px-3 py-1.5 rounded-md text-[10px] font-bold transition-all active:scale-90 mr-1 relative z-10"
            >
              Shop
            </button>

            {/* CART BUTTON (Visible on both Mobile & Desktop) */}
            <button
              onClick={() => navigate("/cart")}
              className="relative flex items-center justify-center text-white p-2"
            >
              <img src={cartIcon} alt="Cart" className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-yellow-accent text-black text-[10px] px-1.5 py-[1px] rounded-full font-semibold">
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
          className={`md:hidden absolute left-0 right-0 top-full w-full bg-black/80 backdrop-blur-md p-4 space-y-4 text-white text-sm shadow-lg transition-all duration-250 ${menuOpen
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
            to="/contact"
            onClick={() => setMenuOpen(false)}
            className="block hover:text-yellow-accent"
          >
            Contact Us
          </NavLink>

          {/* MOBILE PROFILE DROPDOWN */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMobileProfileOpen((prev) => !prev)}
                className="w-full flex items-center justify-between py-2 px-1 hover:text-yellow-accent"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 border border-white/10 flex items-center justify-center text-white font-semibold">
                    {(user.displayName || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[140px] truncate">{firstName || "Account"}</span>
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
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setMenuOpen(false);
                      setMobileProfileOpen(false);
                    }}
                    className="block w-full text-left py-1 hover:text-yellow-accent"
                  >
                    Account Settings
                  </button>

                  <button
                    onClick={() => {
                      logoutUser();
                      navigate("/");
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
                openLoginModal();
              }}
              className="block hover:text-yellow-accent py-2"
            >
              Login
            </button>
          )}

          {/* Mobile Cart Removed from here as it's now in the top bar */}

        </div>
      </div>
    </nav>
  );
}
