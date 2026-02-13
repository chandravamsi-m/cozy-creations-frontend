import React, { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function OfferBanner() {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {   
    fetchActiveOffer();
  }, []);

  const fetchActiveOffer = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/offers/active`);
      const data = await res.json();

      if (data.offer && data.offer.isActive) {
        setOffer(data.offer);
      }
    } catch (err) {
      console.error("Failed to fetch active offer:", err);
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything while loading or if no active offer
  if (loading || !offer) return null;

  return (
    <div className="w-full bg-transparent text-white/90 py-3 px-4 text-[10px] sm:text-xs font-medium tracking-wide relative z-[100] border-b border-white/20">
      <div className="max-w-[1280px] mx-auto flex justify-between items-center">
        {/* Left: Email */}
        <div className="hidden md:flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
          </svg>
          <span className="font-light tracking-wider">{offer.email || "cozycreationscorner13@gmail.com"}</span>
        </div>

        {/* Center: Offer */}
        <div className="flex-1 text-center font-normal text-white">
          <p className="tracking-[0.05em] lowercase">{offer.offerText}</p>
        </div>

        {/* Right: Phone */}
        <div className="hidden md:flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span className="font-light tracking-wider">{offer.phone || "+91 80194 01322"}</span>
        </div>
      </div>
    </div>
  );
}
