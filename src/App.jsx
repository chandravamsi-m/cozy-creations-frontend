// src/App.jsx
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MainLayout from './layouts/MainLayout';

// lazy pages
const Home = lazy(() => import('./pages/Home/Home'));
const About = lazy(() => import('./pages/About/About'));
const Products = lazy(() => import('./pages/Products/Products'));
const Custom = lazy(() => import('./pages/Custom/Custom'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

// Inner component that has access to useLocation
function AppContent({ heroRef, heroNavRef, productSectionRef, stickyNavRef, menuOpen, setMenuOpen }) {
  const location = useLocation();
  const NAV_HEIGHT = 72;

  useEffect(() => {
    // Only initialize GSAP when on home page
    if (location.pathname !== '/') {
      return;
    }

    let attempt = 0;
    const maxAttempts = 15; // ~1.5s total retry window
    let ctx = null;

    const tryInit = () => {
      attempt += 1;
      const heroEl = heroRef.current;
      const navEl = stickyNavRef.current;
      const productEl = productSectionRef.current;
      const heroNavEl = heroNavRef.current;

      // If all refs present, initialize GSAP for home page only
      if (heroEl && navEl && productEl && heroNavEl) {
        try {
          gsap.registerPlugin(ScrollTrigger);
          
          // Kill any existing ScrollTriggers on these elements
          ScrollTrigger.getAll().forEach(trigger => {
            const triggerEl = trigger.trigger || trigger.vars?.trigger;
            if (triggerEl === productEl || triggerEl === heroEl || 
                triggerEl === navEl || triggerEl === heroNavEl) {
              trigger.kill();
            }
          });

          ctx = gsap.context(() => {
            // Ensure sticky navbar is hidden initially on home page
            gsap.set(navEl, { autoAlpha: 0, y: -20 });
            gsap.set(heroNavEl, { autoAlpha: 1 });

            // Hero parallax upward
            gsap.to(heroEl, {
              y: -NAV_HEIGHT,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: productEl,
                start: 'top bottom',
                end: `top top+=${NAV_HEIGHT}`,
                scrub: true,
                refreshPriority: 1,
              },
            });

            // Navbar fade/slide in
            gsap.to(navEl, {
              autoAlpha: 1,
              y: 0,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: productEl,
                start: `top top+=${NAV_HEIGHT}`,
                end: `top top+=${NAV_HEIGHT + 10}`,
                toggleActions: 'play none none reverse',
                refreshPriority: 1,
              },
            });

            // Hero nav fade out when sticky appears
            gsap.to(heroNavEl, {
              autoAlpha: 0,
              ease: 'power1.out',
              scrollTrigger: {
                trigger: productEl,
                start: `top top+=${NAV_HEIGHT}`,
                end: `top top+=${NAV_HEIGHT + 40}`,
                toggleActions: 'play none none reverse',
                refreshPriority: 1,
              },
            });

            // Refresh ScrollTrigger after a short delay to ensure proper calculation
            setTimeout(() => {
              ScrollTrigger.refresh();
            }, 150);
          });
        } catch (err) {
          console.error('GSAP initialization error:', err);
        }
      } else if (attempt < maxAttempts) {
        // Try again shortly to allow pages to mount
        setTimeout(tryInit, 100);
      }
    };

    tryInit();

    return () => {
      if (ctx) {
        ctx.revert();
      }
      // Refresh ScrollTrigger on cleanup
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 50);
    };
  }, [location.pathname, heroRef, heroNavRef, productSectionRef, stickyNavRef]);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Routes>
        {/* Layout route — passes menu and stickyNavRef down to layout */}
        <Route
          path="/"
          element={<MainLayout stickyNavRef={stickyNavRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}
        >
          <Route
            index
            element={<Home
              heroRef={heroRef}
              heroNavRef={heroNavRef}
              productSectionRef={productSectionRef}
              menuOpen={menuOpen}
              setMenuOpen={setMenuOpen}
            />}
          />
          <Route path="about" element={<About />} />
          <Route path="products" element={<Products />} />
          <Route path="custom" element={<Custom />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  // Refs used by GSAP and passed down to Home
  const heroRef = useRef(null);
  const heroNavRef = useRef(null);
  const productSectionRef = useRef(null);
  const stickyNavRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <AppContent
        heroRef={heroRef}
        heroNavRef={heroNavRef}
        productSectionRef={productSectionRef}
        stickyNavRef={stickyNavRef}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />
    </BrowserRouter>
  );
}
