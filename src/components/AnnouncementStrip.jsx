// src/components/AnnouncementStrip.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

function MarqueeText({ text, isActive }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        const textWidth = textRef.current.getBoundingClientRect().width;
        setShouldScroll(textWidth > containerWidth - 16);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-hidden relative flex items-center ${
        shouldScroll ? 'justify-start' : 'justify-center'
      }`}
    >
      {/* Hidden element for measuring width */}
      <span
        ref={textRef}
        className="absolute invisible whitespace-nowrap pointer-events-none"
        style={{ fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit' }}
      >
        {text}
      </span>

      {shouldScroll ? (
        <div
          key={isActive ? 'active' : 'inactive'}
          className="flex whitespace-nowrap"
          style={{
            display: 'inline-flex',
            animation: isActive ? 'horizontalScroll 12s linear infinite' : 'none',
          }}
        >
          <span className="pr-12">{text}</span>
          <span className="pr-12">{text}</span>
        </div>
      ) : (
        <span className="truncate max-w-full">
          {text}
        </span>
      )}
    </div>
  );
}

export default function AnnouncementStrip({ heroRef }) {
  const { settings } = useSettings();
  const strip = settings?.announcementStrip;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const messages = strip?.messages || [];
  const isActive = strip?.isActive;

  // ── Screen size breakpoint detection ────────────────────────────────────────
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 639px)');
    const handleMql = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handleMql);
    return () => mql.removeEventListener('change', handleMql);
  }, []);

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
    setIsTransitioning(true);
  }, [messages.length]);

  // ── Vertical Auto-Scroll Interval (Desktop Only) ─────────────────────────────
  useEffect(() => {
    if (messages.length <= 1 || isMobile) return;
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
    }, 6000); // changes message every 6 seconds
    return () => clearInterval(timer);
  }, [messages.length, isMobile]);

  // ── Infinite Seamless Loop Reset (Desktop Only) ──────────────────────────────
  useEffect(() => {
    if (messages.length <= 1 || isMobile) return;
    if (currentIndex === messages.length) {
      const transitionTimeout = setTimeout(() => {
        setIsTransitioning(false);
        setCurrentIndex(0);
      }, 700); // matches the transition duration exactly
      return () => clearTimeout(transitionTimeout);
    }
  }, [currentIndex, messages.length, isMobile]);

  const handlePrev = (e) => {
    e.stopPropagation();
    setIsTransitioning(true);
    setCurrentIndex(prev => {
      if (prev === 0) return messages.length - 1;
      return prev - 1;
    });
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setIsTransitioning(true);
    setCurrentIndex(prev => {
      // On mobile, index loops around standard length directly
      if (isMobile) {
        return (prev + 1) % messages.length;
      }
      return prev + 1;
    });
  };

  // ── Guard: nothing to show ───────────────────────────────────────────────────
  if (!isActive || messages.length === 0) return null;

  const displayMessages = messages.length > 1 ? [...messages, messages[0]] : messages;

  // Calculate current active index modulo messages.length (since we clone the first message at the end)
  const activeIndex = currentIndex % messages.length;

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
        className="w-full flex items-center justify-between px-1.5 sm:px-6 md:px-8"
        style={{
          height: '40px',
          backgroundColor: 'transparent',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          fontFamily: "'Montserrat', sans-serif",
          fontSize: '12px',
          fontWeight: 400,
          letterSpacing: '0.03em',
          userSelect: 'none',
        }}
      >
        {/* Left Side (Email on Desktop, Left Arrow on Mobile) */}
        <div className="flex items-center w-[24px] sm:w-[220px] shrink-0 font-normal">
          {isMobile && messages.length > 1 ? (
            <button
              onClick={handlePrev}
              aria-label="Previous announcement"
              className="flex items-center justify-start rounded-full transition-all duration-200 hover:opacity-75 active:scale-90 focus:outline-none"
              style={{ width: '24px', height: '32px', color: '#FFFFFF' }}
            >
              <ChevronLeft className="w-[18px] h-[18px] text-white/90" />
            </button>
          ) : (
            !isMobile && (
              <div className="flex items-center gap-2 text-white/95 font-normal">
                <Mail className="w-[18px] h-[18px] text-white/80 shrink-0" />
                <a href="mailto:cozycandlecorner13@gmail.com" className="hover:underline transition-all">
                  cozycandlecorner13@gmail.com
                </a>
              </div>
            )
          )}
        </div>

        {/* Centered Message Text (Vertical Slideshow on Desktop, Crossfade Carousel on Mobile) */}
        <div
          className="flex-1 h-full overflow-hidden relative"
          style={{ height: '40px' }}
        >
          {isMobile ? (
            // Mobile manual slide: single active message with key to trigger fade-in
            <div
              key={currentIndex}
              className="w-full h-full flex items-center justify-center shrink-0 px-2 animate-messageFade"
              style={{ height: '40px' }}
            >
              <span className="text-center truncate max-w-full text-white/95 text-[11px] sm:text-xs md:text-sm font-normal tracking-wide w-full h-full flex items-center justify-center">
                <MarqueeText text={messages[activeIndex]?.text} isActive={true} />
              </span>
            </div>
          ) : (
            // Desktop auto-scroll: vertical sliding stack
            <div
              className="flex flex-col h-full"
              style={{
                transform: `translateY(-${currentIndex * 100}%)`,
                transition: isTransitioning ? 'transform 500ms ease-in-out' : 'none',
              }}
            >
              {displayMessages.map((m, idx) => {
                const isSlideActive = (idx % messages.length) === activeIndex;
                return (
                  <div
                    key={`${m.id}-${idx}`}
                    className="w-full h-full flex items-center justify-center shrink-0 px-2"
                    style={{ height: '40px' }}
                  >
                    <span className="text-center truncate max-w-full text-white/95 text-[11px] sm:text-xs md:text-sm font-normal tracking-wide w-full h-full flex items-center justify-center">
                      <MarqueeText text={m.text} isActive={isSlideActive} />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side (Phone on Desktop, Right Arrow on Mobile) */}
        <div className="flex items-center w-[24px] sm:w-[220px] justify-end shrink-0 font-normal">
          {isMobile && messages.length > 1 ? (
            <button
              onClick={handleNext}
              aria-label="Next announcement"
              className="flex items-center justify-end rounded-full transition-all duration-200 hover:opacity-75 active:scale-90 focus:outline-none"
              style={{ width: '24px', height: '32px', color: '#FFFFFF' }}
            >
              <ChevronRight className="w-[18px] h-[18px] text-white/90" />
            </button>
          ) : (
            !isMobile && (
              <div className="flex items-center gap-2 text-white/95 font-normal justify-end">
                <Phone className="w-[18px] h-[18px] text-white/80 shrink-0" />
                <a href="tel:+918019401322" className="hover:underline transition-all">
                  +91 80194 01322
                </a>
              </div>
            )
          )}
        </div>
      </div>

      {/* CSS Styles injected once */}
      <style>{`
        @keyframes horizontalScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes messageFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-messageFade {
          animation: messageFadeIn 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
