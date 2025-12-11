// src/layouts/MainLayout.jsx
import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MainLayout({ stickyNavRef, menuOpen, setMenuOpen }) {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Ensure navbar visibility based on current page
  useEffect(() => {
    const navEl = stickyNavRef?.current;
    if (!navEl) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // If on home page, hide the sticky navbar initially (GSAP will handle it)
      if (location.pathname === '/') {
        try {
          gsap.set(navEl, { autoAlpha: 0, y: -20 });
          // Trigger ScrollTrigger refresh after a moment to ensure it recalculates
          setTimeout(() => {
            if (typeof ScrollTrigger !== 'undefined') {
              ScrollTrigger.refresh();
            }
          }, 200);
        } catch (e) {
          navEl.style.opacity = '0';
          navEl.style.visibility = 'hidden';
        }
      } else {
      // If not on home page, ensure navbar is visible - clear all GSAP properties first
      const makeVisible = () => {
        try {
          // Kill any GSAP animations on this element
          gsap.killTweensOf(navEl);
          // Clear all GSAP properties
          gsap.set(navEl, { clearProps: 'all' });
          // Force visibility
          gsap.set(navEl, { autoAlpha: 1, y: 0 });
        } catch (e) {
          // GSAP might not be available
        }
        // Always set inline styles as fallback with !important to override GSAP
        navEl.style.setProperty('opacity', '1', 'important');
        navEl.style.setProperty('visibility', 'visible', 'important');
        navEl.style.setProperty('transform', 'translateY(0)', 'important');
        navEl.style.setProperty('pointer-events', 'auto', 'important');
        navEl.style.setProperty('display', 'block', 'important');
      };

        // Run immediately and also with a small delay to catch any late GSAP updates
        makeVisible();
        setTimeout(makeVisible, 100);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [location.pathname, stickyNavRef]);

  return (
    <div className="relative w-full min-h-screen bg-white font-montserrat">
      {/* Sticky navbar available on every page */}
      <Navbar stickyNavRef={stickyNavRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Page content */}
      <main>
        <Outlet />
      </main>

      {/* Footer available on every page */}
      <Footer />
    </div>
  );
}
