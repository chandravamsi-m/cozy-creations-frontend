// src/App.jsx
import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import MainLayout from "./layouts/MainLayout";
import { ProductsProvider } from "./contexts/ProductsContext";
import { AuthProvider } from "./contexts/AuthContext"; // ⭐ REQUIRED
import LoginModal from "./components/LoginModal";
import { CartProvider } from "./hooks/useCart";
import { useAuth } from "./contexts/AuthContext";
import { useNavigate } from "react-router-dom";

// Lazy pages
const Home = lazy(() => import("./pages/Home/Home"));
const About = lazy(() => import("./pages/About/About"));
const Products = lazy(() => import("./pages/Products/Products"));
const Custom = lazy(() => import("./pages/Custom/Custom"));
const Contact = lazy(() => import("./pages/Contact/Contact"));
const CartPage = lazy(() => import("./pages/Cart/Cart"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCreateProduct = lazy(() =>
  import("./pages/admin/AdminCreateProduct")
);
const AdminEditProduct = lazy(() => import("./pages/admin/AdminEditProduct"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetails = lazy(() => import("./pages/admin/AdminOrderDetails"));

// Component with routing
function AppContent({
  heroRef,
  heroNavRef,
  productSectionRef,
  stickyNavRef,
  menuOpen,
  setMenuOpen,
  loginModalOpen,
  setLoginModalOpen,
}) {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const NAV_HEIGHT = 72;
  useEffect(() => {
    if (user && isAdmin) {
      navigate("/admin");
    }
  }, [user, isAdmin]);

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
      const heroNavEl = heroNavRef.current;

      if (heroEl && navEl && productEl && heroNavEl) {
        try {
          gsap.registerPlugin(ScrollTrigger);

          ScrollTrigger.getAll().forEach((trigger) => {
            const trigEl = trigger.trigger || trigger.vars?.trigger;
            if ([productEl, heroEl, navEl, heroNavEl].includes(trigEl)) {
              trigger.kill();
            }
          });

          ctx = gsap.context(() => {
            gsap.set(navEl, { autoAlpha: 0, y: -20 });
            gsap.set(heroNavEl, { autoAlpha: 1 });

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

            gsap.to(navEl, {
              autoAlpha: 1,
              y: 0,
              ease: "power2.out",
              scrollTrigger: {
                trigger: productEl,
                start: `top top+=${NAV_HEIGHT}`,
                end: `top top+=${NAV_HEIGHT + 10}`,
                toggleActions: "play none none reverse",
              },
            });

            gsap.to(heroNavEl, {
              autoAlpha: 0,
              ease: "power1.out",
              scrollTrigger: {
                trigger: productEl,
                start: `top top+=${NAV_HEIGHT}`,
                end: `top top+=${NAV_HEIGHT + 40}`,
                toggleActions: "play none none reverse",
              },
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

  return (
    <>
      {/* GLOBAL LOGIN MODAL */}
      {loginModalOpen && (
        <LoginModal closeModal={() => setLoginModalOpen(false)} />
      )}

      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            Loading...
          </div>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <MainLayout
                stickyNavRef={stickyNavRef}
                menuOpen={menuOpen}
                setMenuOpen={setMenuOpen}
                setLoginModalOpen={setLoginModalOpen}
              />
            }
          >
            <Route
              index
              element={
                <Home
                  heroRef={heroRef}
                  heroNavRef={heroNavRef}
                  productSectionRef={productSectionRef}
                  menuOpen={menuOpen}
                  setMenuOpen={setMenuOpen}
                />
              }
            />
            <Route path="about" element={<About />} />
            <Route path="products" element={<Products />} />
            <Route path="custom" element={<Custom />} />
            <Route path="contact" element={<Contact />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ADMIN ROUTES */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminProducts />} />
            <Route path="create" element={<AdminCreateProduct />} />
            <Route path="products/:id/edit" element={<AdminEditProduct />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetails />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  const heroRef = useRef(null);
  const heroNavRef = useRef(null);
  const productSectionRef = useRef(null);
  const stickyNavRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  return (
    <AuthProvider>
      {" "}
      {/* ⭐ FIXED */}
      <CartProvider>
        <ProductsProvider>
          <BrowserRouter>
            <AppContent
              heroRef={heroRef}
              heroNavRef={heroNavRef}
              productSectionRef={productSectionRef}
              stickyNavRef={stickyNavRef}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
              loginModalOpen={loginModalOpen}
              setLoginModalOpen={setLoginModalOpen}
            />
          </BrowserRouter>
        </ProductsProvider>
      </CartProvider>
    </AuthProvider>
  );
}
