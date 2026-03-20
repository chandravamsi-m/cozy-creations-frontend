// src/App.jsx
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import MainLayout from "./layouts/MainLayout";
import { ProductsProvider } from "./contexts/ProductsContext";
import { LoginModalProvider, useLoginModal } from "./contexts/LoginModalContext";
import LoginModal from "./components/LoginModal";
import { CartProvider } from "./hooks/useCart";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import OfferBanner from "./components/OfferBanner";

import { ToastProvider } from "./contexts/ToastContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Lazy pages
const Home = lazy(() => import("./pages/Home/Home"));
const About = lazy(() => import("./pages/About/About"));
const Products = lazy(() => import("./pages/Products/Products"));
const Contact = lazy(() => import("./pages/Contact/Contact"));
const CartPage = lazy(() => import("./pages/Cart/Cart"));
const Checkout = lazy(() => import("./pages/Checkout/Checkout"));
// Removed OrderSuccess lazy import
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminBulkProducts = lazy(() =>
  import("./pages/admin/AdminBulkProducts")
);
const AdminEditProduct = lazy(() => import("./pages/admin/AdminEditProduct"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminOffers = lazy(() => import("./pages/admin/AdminOffers"));
const AdminDelivery = lazy(() => import("./pages/admin/AdminDelivery"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const MyOrders = lazy(() => import("./pages/MyOrders/MyOrders"));
const SavedAddresses = lazy(() => import("./pages/SavedAddresses/SavedAddresses"));

// Component with routing
function AppContent({
  heroRef,
  productSectionRef,
  stickyNavRef,
  menuOpen,
  setMenuOpen,
}) {
  const { openLoginModal } = useLoginModal();
  const location = useLocation();
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const NAV_HEIGHT = 72;
  useEffect(() => {
    if (loading) return;
    if (user && isAdmin && !location.pathname.startsWith("/admin")) {
      navigate("/admin");
    }
  }, [user, isAdmin, loading, location.pathname, navigate]);

  // GSAP logic (unchanged)
  useEffect(() => {
    if (location.pathname !== "/") return;

    let attempt = 0;
    const maxAttempts = 15;
    let ctx = null;

    const tryInit = () => {
      attempt++;

      const heroEl = heroRef.current;
      const navEl = stickyNavRef.current;
      const productEl = productSectionRef.current;

      if (heroEl && navEl && productEl) {
        try {
          gsap.registerPlugin(ScrollTrigger);

          ScrollTrigger.getAll().forEach((trigger) => {
            const trigEl = trigger.trigger || trigger.vars?.trigger;
            if ([productEl, heroEl, navEl].includes(trigEl)) {
              trigger.kill();
            }
          });

          ctx = gsap.context(() => {
            const setHeroMode = () => {
              navEl.classList.add("cc-nav-hero");
              navEl.classList.remove("cc-nav-solid");
              navEl.classList.add("cc-nav-animate");
            };
            const setSolidMode = () => {
              navEl.classList.add("cc-nav-solid");
              navEl.classList.remove("cc-nav-hero");
              navEl.classList.add("cc-nav-animate");
            };

            // Start: navbar fixed at top (no vertical translation), but "hero" appearance
            gsap.set(navEl, { autoAlpha: 1, y: 0 });
            setHeroMode();

            gsap.to(heroEl, {
              y: -NAV_HEIGHT,
              ease: "power2.out",
              scrollTrigger: {
                trigger: productEl,
                start: "top bottom",
                end: `top top+=${NAV_HEIGHT}`,
                scrub: true,
              },
            });

            // Only change navbar appearance as you scroll (position stays fixed at top)
            ScrollTrigger.create({
              trigger: productEl,
              start: `top top+=${NAV_HEIGHT}`,
              end: `top top+=${NAV_HEIGHT + 1}`,
              onEnter: setSolidMode,
              onLeaveBack: setHeroMode,
            });

            setTimeout(() => ScrollTrigger.refresh(), 150);
          });
        } catch (err) {
          console.error("GSAP error", err);
        }
      } else if (attempt < maxAttempts) {
        setTimeout(tryInit, 100);
      }
    };

    tryInit();
    return () => ctx?.revert();
  }, [location.pathname]);

  const { isOpen: loginModalOpen, closeLoginModal } = useLoginModal();

  return (
    <>
      {/* GLOBAL LOGIN MODAL */}
      {loginModalOpen && (
        <LoginModal closeModal={closeLoginModal} />
      )}

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            Loading...
          </div>
        }
      >
        {location.pathname === "/" && <OfferBanner />}
        <Routes>
          <Route
            path="/"
            element={
              <MainLayout
                stickyNavRef={stickyNavRef}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
              />
            }
          >
            <Route
              index
              element={
                <Home
                  heroRef={heroRef}
                  productSectionRef={productSectionRef}
                  menuOpen={menuOpen}
                  setMenuOpen={setMenuOpen}
                />
              }
            />
            <Route path="about" element={<About />} />
            <Route path="products" element={<Products />} />
            <Route path="contact" element={<Contact />} />
            <Route path="cart" element={<CartPage />} />
            {/* Checkout Route */}
            <Route path="/checkout" element={<Checkout />} />
            {/* User Account Routes - SECURED */}
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/addresses" element={<ProtectedRoute><SavedAddresses /></ProtectedRoute>} />

// Redundant Route Removed
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ADMIN ROUTES */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="bulk-products" element={<AdminBulkProducts />} />
            <Route path="products/:id/edit" element={<AdminEditProduct />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="offers" element={<AdminOffers />} />
            <Route path="delivery" element={<AdminDelivery />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  const heroRef = useRef(null);
  const productSectionRef = useRef(null);
  const stickyNavRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);

  // One-time backend warmup to reduce Render cold start delay
  useEffect(() => {
    const KEY = "cc_backend_pinged";
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");

    if (!BACKEND_URL) return;

    fetch(`${BACKEND_URL}/health`).catch(() => {
      // best-effort warmup; errors are safe to ignore
    });
  }, []);

  return (
    <ToastProvider>
      <LoginModalProvider>
        <CartProvider>
          <ProductsProvider>
            <BrowserRouter>
              <AppContent
                heroRef={heroRef}
                productSectionRef={productSectionRef}
                stickyNavRef={stickyNavRef}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
              />
            </BrowserRouter>
          </ProductsProvider>
        </CartProvider>
      </LoginModalProvider>
    </ToastProvider>
  );
}
