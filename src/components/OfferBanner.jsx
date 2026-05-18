// src/components/OfferBanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProducts } from "../contexts/ProductsContext";
 
export default function OfferBanner() {
  const { activeOffers, offersLoading } = useProducts();
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const navigate = useNavigate();
  const lastScrollY = useRef(window.scrollY);
  
  // Mobile swipe refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
 
  // Filter offers that have a banner
  const bannerOffers = activeOffers.filter(o => o.isActive && o.hasBanner);

  // Infinite Scroll Slides configuration: [Last, ...All, First]
  const slides = bannerOffers.length > 1
    ? [bannerOffers[bannerOffers.length - 1], ...bannerOffers, bannerOffers[0]]
    : bannerOffers;

  // Sync index to 1 when multiple offers exist
  useEffect(() => {
    if (bannerOffers.length > 1 && currentOfferIndex === 0) {
      setCurrentOfferIndex(1);
    }
  }, [bannerOffers.length]);

  // Seamless Wrap-around Jump Resets
  useEffect(() => {
    if (bannerOffers.length <= 1) return;

    // Fast-Forward seamless warp: Clone first -> Real first
    if (currentOfferIndex === bannerOffers.length + 1) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentOfferIndex(1);
      }, 500); // 500ms matches translation animation
      return () => clearTimeout(timer);
    }

    // Fast-Backward seamless warp: Clone last -> Real last
    if (currentOfferIndex === 0) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentOfferIndex(bannerOffers.length);
      }, 500); // 500ms matches translation animation
      return () => clearTimeout(timer);
    }
  }, [currentOfferIndex, bannerOffers.length]);

  // Re-enable CSS transition timers
  useEffect(() => {
    if (!isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);
 
  // Auto-rotate offers if multiple exist (resets on manual interaction)
  useEffect(() => {
    if (bannerOffers.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 5000); // Rotate every 5 seconds
    return () => clearInterval(interval);
  }, [bannerOffers.length, currentOfferIndex, isTransitioning]);
 
  // Auto-minimize when scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const threshold = window.innerHeight * 0.7;
 
      if (lastScrollY.current <= threshold && currentScrollY > threshold && !isMinimized) {
        setIsMinimized(true);
      }
      lastScrollY.current = currentScrollY;
    };
 
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMinimized]);
 
  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (!isTransitioning) return;
    setCurrentOfferIndex(prev => prev - 1);
  };
 
  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (!isTransitioning) return;
    setCurrentOfferIndex(prev => prev + 1);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Threshold in pixels for swipe

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  const getActiveDotIndex = () => {
    if (currentOfferIndex === 0) return bannerOffers.length - 1;
    if (currentOfferIndex === bannerOffers.length + 1) return 0;
    return currentOfferIndex - 1;
  };
 
  if (offersLoading || bannerOffers.length === 0) return null;
 
  return (
    <div className={`fixed right-0 z-[100] pointer-events-none transition-all duration-500 
      ${isMinimized
        ? 'bottom-8 md:bottom-auto md:top-1/2 md:-translate-y-1/2 pr-4 md:pr-0'
        : 'bottom-8 md:bottom-auto md:top-1/2 md:-translate-y-1/2 pr-3 md:pr-4'
      }`}
    >
      {!isMinimized ? (
        <div className="w-48 sm:w-56 md:w-60 h-[360px] sm:h-[400px] md:h-[420px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-yellow-accent/30 pointer-events-auto transform transition-all duration-500 animate-fadeInRight flex flex-col group relative">
          {/* Carousel Viewport Wrapper */}
          <div 
            className="flex-1 overflow-hidden relative w-full h-full rounded-[2rem]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div 
              className={`flex h-full ease-out ${isTransitioning ? 'transition-transform duration-500' : 'transition-none'}`}
              style={{ 
                width: `${slides.length * 100}%`,
                transform: `translateX(-${(bannerOffers.length > 1 ? currentOfferIndex : 0) * (100 / slides.length)}%)`
              }}
            >
              {slides.map((offer, idx) => (
                <div 
                  key={`${offer.id}-${idx}`} 
                  className="h-full flex flex-col bg-white"
                  style={{ width: `${100 / slides.length}%` }}
                >
                  {/* Banner Image Area */}
                  <div className="h-1/2 bg-gray-100 relative overflow-hidden">
                    {offer.bannerImageUrl ? (
                      <img
                        src={offer.bannerImageUrl}
                        alt={offer.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-yellow-50 text-yellow-600 font-black text-3xl opacity-20 uppercase">
                        COZY
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
                  </div>
 
                  {/* Offer Content */}
                  <div className="h-1/2 p-3 sm:p-5 flex flex-col items-center justify-between text-center bg-white relative">
                    <div className="space-y-1 flex-1 flex flex-col justify-center">
                      <span className="text-[8px] sm:text-[9px] font-black text-yellow-600 uppercase tracking-[0.2em] animate-pulse mb-1">
                        {offer.offerHeading || "Special Offer"}
                      </span>
                      <h3 className="text-[10px] sm:text-xs md:text-sm font-black text-gray-900 leading-tight uppercase tracking-tight line-clamp-3">
                        {offer.offerText || offer.name}
                      </h3>
                    </div>
 
                    <button
                      onClick={() => {
                        const state = { scrollTo: "products", skipHero: true };
                        if (!offer.applicableToAll && offer.applicableCategories?.length > 0) {
                          state.category = offer.applicableCategories[0];
                        }
                        navigate("/products", { state });
                      }}
                      className="w-full py-2 sm:py-2.5 bg-yellow-accent hover:bg-yellow-400 text-black rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] shadow-[0_5px_15px_rgba(251,191,36,0.2)] hover:-translate-y-0.5 transition-all duration-300 mb-1"
                    >
                      Shop Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
 
            {/* Navigation Arrows */}
            {bannerOffers.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 top-[25%] -translate-y-1/2 w-6 h-6 bg-white/90 hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow z-30 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-90 border border-gray-100 pointer-events-auto"
                  aria-label="Previous Offer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 top-[25%] -translate-y-1/2 w-6 h-6 bg-white/90 hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow z-30 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 active:scale-90 border border-gray-100 pointer-events-auto"
                  aria-label="Next Offer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
 
            {/* Slide Indicators */}
            {bannerOffers.length > 1 && (
              <div className="absolute top-[45%] left-1/2 -translate-x-1/2 flex gap-1 z-30 bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                {bannerOffers.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentOfferIndex(i + 1);
                    }}
                    className={`w-1 h-1 rounded-full transition-all duration-300 ${getActiveDotIndex() === i ? 'bg-yellow-accent w-2.5' : 'bg-white/60'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Close/Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            className="absolute right-3 top-3 w-6 h-6 bg-black/35 backdrop-blur-md hover:bg-black/50 rounded-full flex items-center justify-center text-white shadow-lg z-[50] transition-all border border-white/10 active:scale-90 pointer-events-auto"
            title="Minimize"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Minimized Gift Icon */
        <div className="flex flex-col items-end">
          <button
            onClick={() => setIsMinimized(false)}
            className="w-12 h-12 bg-yellow-accent rounded-full flex items-center justify-center shadow-2xl pointer-events-auto hover:scale-110 active:scale-95 transition-all duration-300 animate-fadeInRight ring-2 ring-yellow-accent ring-offset-2 ring-offset-white mr-2"
          >
            <div className="relative">
              <Gift className="w-5 h-5 text-black" />
              {bannerOffers.length > 1 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {bannerOffers.length}
                </span>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
