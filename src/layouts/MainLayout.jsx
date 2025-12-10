// src/layouts/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MainLayout({ stickyNavRef, menuOpen, setMenuOpen }) {
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
