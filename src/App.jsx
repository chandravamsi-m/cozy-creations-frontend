import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import unnamed7 from './assets/images/unnamed-7.png';
import logo from './assets/images/logo image.png';
import rectangle60 from './assets/images/rectangle-60.png';
import macbookAir2 from './assets/images/macbook-air-2.png';
import ellipse172 from './assets/images/ellipse-172.png';
import ellipse173 from './assets/images/ellipse-173.png';
import ellipse174 from './assets/images/ellipse-174.png';
import ellipse175 from './assets/images/ellipse-175.png';
import whatsapp2 from './assets/images/whatsapp-2.png';
import whatsapp3 from './assets/images/whatsapp-3.png';

// --- IMPORTANT: adjust these imports if your images are named/located differently ---
import flowerImg from './assets/images/collections/flower.png';
import animalImg from './assets/images/collections/animal.png';
import festiveImg from './assets/images/collections/festive.png';
import glassjarImg from './assets/images/collections/glassjar.png';
import specialImg from './assets/images/collections/special.png';
// ------------------------------------------------------------------------------------

import union from './assets/images/union.png';
import union1 from './assets/images/union-1.png';
import union2 from './assets/images/union-2.png';
import union3 from './assets/images/union-3.png';

import mailRounded from './assets/svgs/mail-rounded.svg';
import call from './assets/svgs/call.svg';
import searchBold from './assets/svgs/search-bold.svg';
import vector from './assets/svgs/vector.svg';

import { fetchData, endpoints } from './services/api';

function PajamasScrollDown({ className }) {
  return (
    <div className={`${className} flex justify-center items-center`}>
      <img src={vector} alt="Scroll Down" className="w-full h-full" />
    </div>
  );
}

export default function App() {
  // Data state
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  // Refs used in GSAP and layout
  const heroRef = useRef(null);
  const productSectionRef = useRef(null);
  const stickyNavRef = useRef(null);
  const heroNavRef = useRef(null);

  // Menu state + constants
  const NAV_HEIGHT = 72;
  const [menuOpen, setMenuOpen] = useState(false);

  // Collections scroll helpers
  const collectionsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Helper: map feature image keys to local images
  const getImage = (imageName) => {
    const images = {
      'ellipse-172': ellipse172,
      'ellipse-173': ellipse173,
      'ellipse-174': ellipse174,
      'ellipse-175': ellipse175,
    };
    return images[imageName] || imageName || ellipse172;
  };

  // Fetch feature & product data (features has fallback)
  useEffect(() => {
    fetchData(endpoints.features)
      .then((data) => {
        setFeatures(data);
        setLoading(false);
      })
      .catch((err) => {
        console.log('Features endpoint not available, using fallback data.');
        setFeatures([
          {
            id: 1,
            title: 'Handmade With Love',
            desc: 'Small-batch poured with warmth, care & personal detail.',
            image: 'ellipse-172',
            bgIndex: 0,
          },
          {
            id: 2,
            title: 'Natural Wax Only',
            desc: 'Soft, clean-burning wax free from toxins and chemicals.',
            image: 'ellipse-173',
            bgIndex: 1,
          },
          {
            id: 3,
            title: 'Aroma Rich Scents',
            desc: 'Fragrance that lingers, calms and transforms your space.',
            image: 'ellipse-174',
            bgIndex: 2,
          },
          {
            id: 4,
            title: 'Perfect for Gifting',
            desc: 'Thoughtfully crafted candles ready to spark joy.',
            image: 'ellipse-175',
            bgIndex: 3,
          },
        ]);
        setLoading(false);
      });

    fetchData(endpoints.products)
      .then((response) => {
        console.log('Products API Response:', response);
        if (response && response.success && response.data && Array.isArray(response.data)) {
          setProducts(response.data);
        } else {
          console.warn('Unexpected API response structure:', response);
        }
      })
      .catch((err) => {
        console.error('Error fetching products:', err);
        setProducts([]);
      });
  }, []);

  // GSAP setup (unchanged logic)
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

  const getUnion = (index) => {
    const unions = [union, union1, union2, union3];
    return unions[index % unions.length];
  };

  const getProductImageUrl = (url) => {
    if (!url) return rectangle60;
    if (
      url.startsWith('http') &&
      (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg') || url.includes('unsplash.com/photos'))
    ) {
      const photoIdMatch = url.match(/photos\/[^-]+-([A-Za-z0-9_-]+)$/);
      if (photoIdMatch && photoIdMatch[1]) {
        return `https://images.unsplash.com/photo-${photoIdMatch[1]}?w=800&h=800&fit=crop`;
      }
      return url;
    }
    return rectangle60;
  };

  // Static collections (5 categories)
  const collections = [
    { id: 'flower', title: 'Flower', image: flowerImg },
    { id: 'animal', title: 'Animal', image: animalImg },
    { id: 'festive', title: 'Festive', image: festiveImg },
    { id: 'glassjar', title: 'Glass Jar', image: glassjarImg },
    { id: 'special', title: 'Special', image: specialImg },
  ];

  // Update arrow visibility on mount & resize
  useEffect(() => {
    const updateArrows = () => {
      const el = collectionsRef.current;
      if (!el) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 10);
    };

    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, []);

  const onCollectionsScroll = () => {
    const el = collectionsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 10);
  };

  // Scroll helpers used by arrows
  const scrollLeft = () => {
    const el = collectionsRef.current;
    if (!el) return;
    el.scrollBy({ left: -Math.floor(el.clientWidth * 0.7), behavior: 'smooth' });
  };
  const scrollRight = () => {
    const el = collectionsRef.current;
    if (!el) return;
    el.scrollBy({ left: Math.floor(el.clientWidth * 0.7), behavior: 'smooth' });
  };

  return (
    <div className="relative w-full min-h-screen bg-white font-montserrat">
      {/* Sticky Navbar - fades in when scrolled past hero */}
      <nav ref={stickyNavRef} className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-md shadow-lg">
        <div className="relative max-w-[1280px] mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="h-10 w-28 relative overflow-hidden">
              <img src={logo} alt="Logo" className="absolute w-[100%] h-[100%] object-contain" />
            </div>

            <div className="hidden md:flex gap-10 text-xs text-white uppercase">
              <a href="#" className="hover:text-yellow-accent transition-colors">Home</a>
              <a href="#" className="hover:text-yellow-accent transition-colors">About Us</a>
              <a href="#" className="hover:text-yellow-accent transition-colors">Products</a>
              <a href="#" className="hover:text-yellow-accent transition-colors">Custom</a>
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden md:inline-flex bg-yellow-accent px-4 py-2 rounded-lg text-xs text-black capitalize hover:bg-yellow-500 transition-colors">
                Contact Us
              </button>
              <button
                className="md:hidden h-10 w-10 inline-flex items-center justify-center text-white text-2xl"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Toggle menu"
                type="button"
              >
                ☰
              </button>
            </div>
          </div>

          {/* Mobile dropdown - attached, full width */}
          <div
            className={`md:hidden absolute left-0 right-0 top-full w-full bg-black/80 backdrop-blur-md p-4 space-y-3 text-white text-sm shadow-lg origin-top transition-all duration-250 ease-out z-40 ${
              menuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
            }`}
          >
            <a href="#" className="block hover:text-yellow-accent">Home</a>
            <a href="#" className="block hover:text-yellow-accent">About Us</a>
            <a href="#" className="block hover:text-yellow-accent">Products</a>
            <a href="#" className="block hover:text-yellow-accent">Custom</a>
            <button className="w-full bg-yellow-accent text-black rounded-md py-2 text-xs font-semibold hover:bg-yellow-500 transition-colors" type="button">
              Contact Us
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Sticky */}
      <div ref={heroRef} className="sticky top-0 w-full h-screen overflow-hidden z-0">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src={unnamed7} alt="Hero Background" className="w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center">
          {/* Header/Nav */}
          <div className="w-full max-w-[1280px] px-4 pt-4 flex flex-col gap-2">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row items-center text-white text-xs w-full">
              {/* Mobile: centered offer only */}
              <div className="flex w-full justify-center items-center font-semibold sm:hidden">
                offer on 25th december for christmas collection
              </div>
              {/* Desktop: full bar */}
              <div className="hidden sm:flex w-full items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <img src={mailRounded} alt="Email" className="w-6 h-6" />
                  <span>cozycreationscorner13@gmail.com</span>
                </div>
                <div className="font-semibold text-center flex-1">
                  offer on 25th december for christmas collection
                </div>
                <div className="flex items-center gap-2">
                  <img src={call} alt="Call" className="w-6 h-6" />
                  <span>+91 80194 01322</span>
                </div>
              </div>
            </div>

            <div className="w-full h-[1px] bg-white/20 my-2"></div>

            {/* Navigation */}
            <div className="flex justify-between items-center relative" ref={heroNavRef}>
              <div className="h-12 w-32 relative overflow-">
                <img src={logo} alt="Logo" className="absolute w-[100%] h-[100%] object-contain" />
              </div>

              <div className="hidden md:flex gap-10 text-xs text-white uppercase">
                <a href="#" className="hover:text-yellow-accent">Home</a>
                <a href="#" className="hover:text-yellow-accent">About Us</a>
                <a href="#" className="hover:text-yellow-accent">Products</a>
                <a href="#" className="hover:text-yellow-accent">Custom</a>
              </div>

              <div className="flex items-center gap-3">
                <button className="hidden md:inline-flex bg-yellow-accent px-4 py-2 rounded-lg text-xs text-black capitalize hover:bg-yellow-500 transition-colors">
                  Contact Us
                </button>
                <button
                  className="md:hidden h-10 w-10 inline-flex items-center justify-center text-white text-2xl"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label="Toggle menu"
                  type="button"
                >
                  ☰
                </button>
              </div>
            </div>
          </div>

          {/* Hero mobile dropdown - full width, attached to nav */}
          <div
            className={`md:hidden absolute left-0 right-0 top-full w-full bg-black/80 backdrop-blur-md p-4 space-y-3 text-white text-sm shadow-lg origin-top transition-all duration-250 ease-out z-40 ${
              menuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
            }`}
          >
            <a href="#" className="block hover:text-yellow-accent">Home</a>
            <a href="#" className="block hover:text-yellow-accent">About Us</a>
            <a href="#" className="block hover:text-yellow-accent">Products</a>
            <a href="#" className="block hover:text-yellow-accent">Custom</a>
            <button className="w-full bg-yellow-accent text-black py-2 text-xs font-semibold hover:bg-yellow-500 transition-colors" type="button">
              Contact Us
            </button>
          </div>

          {/* Hero Text */}
          <div className="flex-1 flex flex-col justify-center items-center text-center gap-5 mt-10 text-white">
            <p className="font-semibold text-xs uppercase tracking-wider">Crafted with Love, Made for Happy Hearts</p>
            <div className="flex flex-col gap-2">
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">
                Handcrafted Candles<br /> Made to Warm Your World
              </h1>
              <p className="font-semibold text-xs md:text-sm max-w-lg mx-auto">
                Discover soothing fragrances, soft glows, and artisanal designs crafted to bring comfort into every corner of your home.
              </p>
            </div>

            <button className="bg-yellow-accent flex items-center gap-2 px-6 py-3 rounded-md mt-4 text-black font-medium" type="button">
              <img src={searchBold} alt="Search" className="w-6 h-6" />
              <span>Shop Collections</span>
            </button>
          </div>

          {/* Scroll Down */}
          <div className="pb-8 flex flex-col items-center gap-2 text-white">
            <PajamasScrollDown className="animate-bounce w-6 h-6" />
            <span className="text-xs font-semibold uppercase">Scroll Down</span>
          </div>
        </div>
      </div>

      {/* Product Highlight Section */}
      <div ref={productSectionRef} className="relative w-full h-screen bg-white flex flex-col md:flex-row overflow-hidden z-20">
        <div className="w-full md:w-1/2 flex flex-col justify-center px-10 md:pl-[100px] py-16 h-full">
          <h2 className="font-normal text-4xl md:text-[62px] leading-tight text-black uppercase max-w-xl mb-12">
            Elevate Your Space With Handcrafted Glow
          </h2>
          <div className="hidden md:block w-full max-w-[540px] h-[1px] bg-black mb-8"></div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-yellow-accent px-6 py-3 rounded-md text-black font-medium text-base capitalize whitespace-nowrap" type="button">
              Explore collections
            </button>
            <button className="border border-black px-6 py-3 rounded-md text-black font-medium text-base capitalize hover:bg-black hover:text-white transition whitespace-nowrap" type="button">
              Customize Your Candle
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/2 h-full overflow-hidden">
          <img src={rectangle60} alt="Candle" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Collections - static 5-category row (with arrows and Explore buttons) */}
      <div className="relative w-full bg-white py-16 z-10">
        <div className="max-w-[1280px] mx-auto px-4 relative">
          <h2 className="font-['Montserrat:Regular',sans-serif] font-normal text-4xl md:text-5xl text-black uppercase mb-8 text-center">
            Our Collections
          </h2>

          {/* Left arrow */}
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll collections left"
            className={`absolute left-[0] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-yellow-accent shadow-2xl flex items-center justify-center transition-transform hover:scale-105 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Left SVG chevron (real arrow) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Right arrow */}
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll collections right"
            className={`absolute right-[0] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-yellow-accent shadow-2xl flex items-center justify-center transition-transform hover:scale-105 ${
              canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Right SVG chevron (real arrow) */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Scrollable row */}
          <div
            ref={collectionsRef}
            onScroll={onCollectionsScroll}
            className="overflow-x-auto no-scrollbar"
          >
            <div className="flex gap-6 items-stretch w-max md:w-full px-4 md:px-0 py-4">
              {collections.map((col) => (
                <div key={col.id} className="flex-shrink-0 w-56 md:flex-1 md:w-auto">
                  <div className="flex flex-col items-center text-center cursor-pointer group">
                    <div className="w-56 h-56 md:w-[320px] md:h-[320px] overflow-hidden rounded-lg mb-4 shadow-md bg-gray-100">
                      <img
                        src={col.image}
                        alt={`${col.title} collection`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => { e.target.src = rectangle60; }}
                      />
                    </div>
                    <h3 className="font-normal text-lg text-black mb-2">
                      {col.title}
                    </h3>

                    <button
                      type="button"
                      onClick={() => { window.location.href = `/collections/${col.id}`; }}
                      className="mt-2 bg-yellow-accent px-4 py-2 rounded-md text-sm font-medium text-black hover:bg-yellow-500 transition"
                    >
                      Explore {col.title}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="relative w-full h-auto min-h-[650px] bg-gray-50 overflow-hidden z-10">
        <div className="absolute inset-0">
          <img src={macbookAir2} alt="Background" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl"></div>
        </div>

        <div className="relative w-full max-w-[1280px] mx-auto py-16 flex flex-col items-center">
          <h2 className="font-semibold text-4xl text-black capitalize mb-2 text-center">Why Choose Us</h2>
          <p className="text-lg text-black mb-16 text-center px-4">Candles crafted to comfort, glow and soothe your space.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 px-8">
            {features.map((feature) => (
              <div key={feature.id} className="flex flex-col items-center text-center">
                <div className="mb-6 flex justify-center items-center">
                  <img src={getImage(feature.image)} alt={feature.title} className="w-[170px] h-[170px] rounded-full object-cover" />
                </div>
                <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-800">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 relative z-10">
            <button className="bg-yellow-accent px-8 py-3 rounded-lg font-medium text-black capitalize" type="button">
              View Catalogue
            </button>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="relative w-full bg-[#191816] text-white py-16 overflow-visible z-10">
        <div className="hidden lg:block overflow-visible absolute top-[-170px] right-[2%] w-[380px] h-[500px] opacity-100 pointer-events-none">
          <img src={whatsapp2} alt="Decor" className="w-full h-[100%] object-contain" />
        </div>

        <div className="w-full max-w-[1280px] mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-10 md:gap-20 items-center md:items-start">
            <div className="w-[300px] h-[200px] rounded-2xl overflow-hidden relative">
              <img src={whatsapp3} alt="Footer Candle" className="w-full h-full object-fill" />
            </div>

            <div className="flex gap-20">
              <div className="flex flex-col gap-3 text-sm capitalize">
                <a href="#" className="hover:text-yellow-accent">Home</a>
                <a href="#" className="hover:text-yellow-accent">About Us</a>
                <a href="#" className="hover:text-yellow-accent">Products</a>
                <a href="#" className="hover:text-yellow-accent">Customize</a>
                <a href="#" className="hover:text-yellow-accent">Contact Us</a>
              </div>

              <div className="flex flex-col gap-4 text-sm">
                <p>Instagram</p>
                <p className="flex items-center gap-2">
                  <img src={mailRounded} alt="Email" className="w-4 h-4" />
                  <a href="mailto:cozycandlecorner13@gmail.com" className="underline">cozycandlecorner13@gmail.com</a>
                </p>
                <p className="flex items-center gap-2">
                  <img src={call} alt="Call" className="w-4 h-4" />
                  <span>8019401322</span>
                </p>
                <p>📍 Hyderabad, Gajularamaram</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-white my-8"></div>

          <div className="text-center text-xs text-white">© 2025 Cozy Creations. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
