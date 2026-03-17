// src/pages/NotFound/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import usePageSEO from '../../hooks/usePageSEO';

export default function NotFound() {
  usePageSEO({
    title: "404 — Page Not Found",
    description: "The page you're looking for doesn't exist. Browse our handcrafted candle collections or return to the homepage.",
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p>Page not found.</p>
      <Link to="/" className="text-blue-600 underline">Go home</Link>
    </div>
  );
}
