// src/App.jsx
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home/Home';

export default function App() {
  const heroRef = useRef(null);
  const heroNavRef = useRef(null);
  const productSectionRef = useRef(null);
  const stickyNavRef = useRef(null);

  const NAV_HEIGHT = 72;
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    try {
      gsap.registerPlugin(ScrollTrigger);
      const heroEl = heroRef.current;
      const navEl = stickyNavRef.current;
      const productEl = productSectionRef.current;
      const heroNavEl = heroNavRef.current;
      if (!heroEl || !navEl || !productEl || !heroNavEl) return;

      const ctx = gsap.context(() => {
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

      return () => ctx.revert();
    } catch (err) {
      console.error('GSAP initialization error:', err);
    }
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-white font-montserrat">
      {/* Navbar gets the stickyNavRef and menu state */}
      <Navbar stickyNavRef={stickyNavRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Home page receives hero/product refs for GSAP */}
      <Home heroRef={heroRef} heroNavRef={heroNavRef} productSectionRef={productSectionRef} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
