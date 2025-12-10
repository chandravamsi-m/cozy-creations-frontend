// src/App.jsx
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  // Refs used by GSAP and passed down to Home
  const heroRef = useRef(null);
  const heroNavRef = useRef(null);
  const productSectionRef = useRef(null);
  const stickyNavRef = useRef(null);

  const NAV_HEIGHT = 72;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
  let attempt = 0;
  const maxAttempts = 12; // ~1.2s total retry window
  let ctx = null;
  let didSetNavVisibleFallback = false;

  const tryInit = () => {
    attempt += 1;
    const heroEl = heroRef.current;
    const navEl = stickyNavRef.current;
    const productEl = productSectionRef.current;
    const heroNavEl = heroNavRef.current;

    // If all refs present, initialize GSAP as before
    if (heroEl && navEl && productEl && heroNavEl) {
      try {
        gsap.registerPlugin(ScrollTrigger);
        ctx = gsap.context(() => {
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
            },
          });
        });
      } catch (err) {
        console.error('GSAP initialization error:', err);
      }
    } else if (navEl && attempt >= maxAttempts && !didSetNavVisibleFallback) {
      // refs didn't appear — likely on a non-home page.
      // Make the sticky navbar visible so all pages show the nav.
      // We do this without GSAP (direct DOM style) to avoid side-effects.
      try {
        navEl.style.opacity = '1';
        navEl.style.transform = 'translateY(0)';
        // Ensure pointer events enabled
        navEl.style.pointerEvents = 'auto';
      } catch (e) {
        // ignore styling errors
      }
      didSetNavVisibleFallback = true;
    } else if (attempt < maxAttempts) {
      // Try again shortly to allow Home to mount
      setTimeout(tryInit, 100);
    } else {
      // Give up after retries; a fallback may have been applied above
      if (!didSetNavVisibleFallback && navEl) {
        try {
          navEl.style.opacity = '1';
          navEl.style.transform = 'translateY(0)';
          navEl.style.pointerEvents = 'auto';
        } catch (e) {}
        didSetNavVisibleFallback = true;
      }
    }
  };

  tryInit();

  return () => {
    if (ctx) ctx.revert();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // keep empty deps — retry logic handles timing

  return (
    <BrowserRouter>
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
/>
}
            />
            <Route path="about" element={<About />} />
            <Route path="products" element={<Products />} />
            <Route path="custom" element={<Custom />} />
            <Route path="contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
