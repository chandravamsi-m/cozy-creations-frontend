// src/components/AnnouncementStrip.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export default function AnnouncementStrip({ heroRef }) {
  const { settings } = useSettings();
  const strip = settings?.announcementStrip;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState(''); // 'left' | 'right'

  const messages = strip?.messages || [];
  const isActive = strip?.isActive;

  // ── Scroll-based visibility via scroll listener ─────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      // Collapse when user scrolls past the hero section (where navbar becomes solid)
      const threshold = window.innerHeight - 75;
      setIsVisible(window.scrollY < threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Reset index when messages change ────────────────────────────────────────
  useEffect(() => {
    setCurrentIndex(0);
  }, [messages.length]);

  // ── Navigation helpers ───────────────────────────────────────────────────────
  const goTo = useCallback((dir) => {
    if (animating || messages.length <= 1) return;
    setSlideDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex(prev => {
        if (dir === 'right') return (prev + 1) % messages.length;
        return (prev - 1 + messages.length) % messages.length;
      });
      setAnimating(false);
    }, 220);
  }, [animating, messages.length]);

  const handlePrev = useCallback((e) => {
    e.stopPropagation();
    goTo('left');
  }, [goTo]);

  const handleNext = useCallback((e) => {
    e.stopPropagation();
    goTo('right');
  }, [goTo]);

  // ── Guard: nothing to show ───────────────────────────────────────────────────
  if (!isActive || messages.length === 0) return null;

  const currentMessage = messages[currentIndex];
  const hasMultiple = messages.length > 1;

  return (
    <div
      className="w-full overflow-hidden transition-all duration-500 ease-in-out"
      style={{
        maxHeight: isVisible ? '44px' : '0px',
        opacity: isVisible ? 1 : 0,
        // No pointer events when hidden so it doesn't block navbar
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        className="w-full flex items-center justify-between px-1.5 sm:px-3"
        style={{
          height: '40px',
          backgroundColor: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
          color: '#FFFFFF',
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '12.5px',
          fontWeight: 400,
          letterSpacing: '0.03em',
          userSelect: 'none',
        }}
      >
        {/* Left Arrow */}
        <div className="flex items-center" style={{ minWidth: '36px' }}>
          {hasMultiple && (
            <button
              onClick={handlePrev}
              aria-label="Previous message"
              className="flex items-center justify-center rounded-full transition-all duration-200 hover:opacity-70 active:scale-90 focus:outline-none"
              style={{ width: '32px', height: '32px', color: '#FFFFFF' }}
            >
              <ChevronLeft style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>

        {/* Centered Message Text (Always Marquee) */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden px-2"
          style={{ position: 'relative', height: '100%', whiteSpace: 'nowrap' }}
        >
          <div 
            key={currentIndex}
            className="flex whitespace-nowrap"
            style={{
              display: 'inline-flex',
              animation: 'marqueeLoop 15s linear infinite',
            }}
          >
            {[...Array(20)].map((_, idx) => (
              <span 
                key={idx} 
                style={{ 
                  paddingRight: '64px', 
                  color: '#FFFFFF', 
                  fontSize: 'clamp(11px, 1.5vw, 13.5px)', 
                  fontWeight: 400, 
                  letterSpacing: '0.04em' 
                }}
              >
                {currentMessage?.text}
              </span>
            ))}
          </div>
        </div>

        {/* Right Arrow */}
        <div className="flex items-center gap-1.5" style={{ minWidth: '36px', justifyContent: 'flex-end' }}>
          {hasMultiple && (
            <button
              onClick={handleNext}
              aria-label="Next message"
              className="flex items-center justify-center rounded-full transition-all duration-200 hover:opacity-70 active:scale-90 focus:outline-none"
              style={{ width: '32px', height: '32px', color: '#FFFFFF' }}
            >
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Keyframe animations injected once */}
      <style>{`
        /* Percent-based transition for 20 elements (5% each) */
        @keyframes marqueeLoop {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-5%); }
        }
        @keyframes stripSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes stripSlideOutLeft {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-12px); }
        }
        @keyframes stripSlideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(12px); }
        }
      `}</style>
    </div>
  );
}
