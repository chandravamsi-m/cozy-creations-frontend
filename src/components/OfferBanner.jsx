import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, X } from 'lucide-react';
import { apiFetch } from "../lib/api";

export default function OfferBanner() {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const lastScrollY = useRef(window.scrollY);

  useEffect(() => {
    fetchActiveOffer();
  }, []);

  // Auto-minimize when scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Threshold: 70% of viewport height (assuming hero is 100vh)
      const threshold = window.innerHeight * 0.7;

      // Only auto-minimize if crossing the threshold downwards while expanded
      if (lastScrollY.current <= threshold && currentScrollY > threshold && !isMinimized) {
        setIsMinimized(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMinimized]);

  const fetchActiveOffer = async () => {
    try {
      const res = await apiFetch("/offers/active");
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
  if (loading || !offer || !offer.isActive) return null;

  return (
    <div className={`fixed right-0 z-[100] pointer-events-none transition-all duration-500 
      ${isMinimized
        ? 'bottom-8 md:bottom-auto md:top-1/2 md:-translate-y-1/2 pr-4 md:pr-0'
        : 'bottom-8 md:bottom-auto md:top-1/2 md:-translate-y-1/2 pr-3 md:pr-4'
      }`}
    >
      {!isMinimized ? (
        <div className="w-48 sm:w-56 md:w-60 h-[360px] sm:h-[400px] md:h-[420px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-yellow-accent/30 pointer-events-auto transform transition-all duration-500 animate-fadeInRight flex flex-col group relative">
          {/* Close/Minimize Button - TOP RIGHT */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="absolute right-2 top-2 w-6 h-6 bg-black/20 backdrop-blur-md hover:bg-black/40 rounded-full flex items-center justify-center text-white shadow-lg z-30 transition-all border border-white/20"
            title="Minimize"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Banner Image Area - TOP HALF */}
          <div className="h-1/2 bg-gray-100 relative overflow-hidden">
            {offer.bannerImageUrl ? (
              <img
                src={offer.bannerImageUrl}
                alt="Special Offer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-yellow-50 text-yellow-600 font-black text-3xl opacity-20">
                COZY
              </div>
            )}

            {/* Subtle Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
          </div>

          {/* Offer Content - BOTTOM HALF */}
          <div className="h-1/2 p-3 sm:p-5 flex flex-col items-center justify-between text-center bg-white">
            <div className="space-y-1 flex-1 flex flex-col justify-center">
              <span className="text-[8px] sm:text-[9px] font-black text-yellow-600 uppercase tracking-[0.2em] animate-pulse mb-1">
                {offer.offerHeading || "Special Offer"}
              </span>
              <h3 className="text-[10px] sm:text-xs md:text-sm font-black text-gray-900 leading-tight uppercase tracking-tight line-clamp-3">
                {offer.offerText}
              </h3>
            </div>

            <button
              onClick={() => navigate("/products", { state: { scrollTo: "products", skipHero: true } })}
              className="w-full py-2 sm:py-2.5 bg-yellow-accent hover:bg-yellow-400 text-black rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] shadow-[0_5px_15px_rgba(251,191,36,0.2)] hover:-translate-y-0.5 transition-all duration-300 mb-1"
            >
              Shop Now
            </button>
          </div>
        </div>
      ) : (
        /* Unified Minimized Gift Icon */
        <div className="flex flex-col items-end">
          <button
            onClick={() => setIsMinimized(false)}
            className="w-12 h-12 bg-yellow-accent rounded-full flex items-center justify-center shadow-2xl pointer-events-auto hover:scale-110 active:scale-95 transition-all duration-300 animate-fadeInRight ring-2 ring-yellow-accent ring-offset-2 ring-offset-white mr-2"
          >
            <Gift className="w-5 h-5 text-black" />
          </button>
        </div>
      )}
    </div>
  );
}
