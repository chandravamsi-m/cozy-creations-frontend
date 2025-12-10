// src/pages/NotFound/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p>Page not found.</p>
      <Link to="/" className="text-blue-600 underline">Go home</Link>
    </div>
  );
}
