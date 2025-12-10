// src/pages/Home/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import rectangle60 from "../../assets/images/rectangle-60.png";
import unnamed7 from "../../assets/images/unnamed-7.png";
import logo from "../../assets/images/logo image.png";
import macbookAir2 from "../../assets/images/macbook-air-2.png";
import whatsapp3 from "../../assets/images/whatsapp-3.png";

import mailRounded from "../../assets/svgs/mail-rounded.svg";
import call from "../../assets/svgs/call.svg";
import searchBold from "../../assets/svgs/search-bold.svg";
import vector from "../../assets/svgs/vector.svg";

import {
  INITIAL_FEATURES,
  IMAGE_MAP,
  COLLECTIONS,
} from "../../utils/constants";

function PajamasScrollDown({ className = "" }) {
  return (
    <div className={`${className} flex justify-center items-center`}>
      <img src={vector} alt="Scroll Down" className="w-full h-full" />
    </div>
  );
}

export default function Home({ heroRef, heroNavRef, productSectionRef, menuOpen, setMenuOpen }) {

  const collectionsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, []);

  const onCollectionsScroll = () => {
    const el = collectionsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollWidth - el.clientWidth - el.scrollLeft > 10);
  };

  const scrollLeft = () => {
    const el = collectionsRef.current;
    if (!el) return;
    el.scrollBy({
      left: -Math.floor(el.clientWidth * 0.7),
      behavior: "smooth",
    });
  };
  const scrollRight = () => {
    const el = collectionsRef.current;
    if (!el) return;
    el.scrollBy({ left: Math.floor(el.clientWidth * 0.7), behavior: "smooth" });
  };

  const getImage = (name) => IMAGE_MAP[name] || Object.values(IMAGE_MAP)[0];

  return (
    <>
      {/* Hero Section - Sticky */}
      <div
        ref={heroRef}
        className="sticky top-0 w-full h-screen overflow-hidden z-0"
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={unnamed7}
            alt="Hero Background"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center">
          {/* Header/Nav Top Bar (page-specific) */}
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

            {/* Hero Navigation (visible inside hero) */}
            <div
              className="flex justify-between items-center relative"
              ref={heroNavRef}
            >
              <div className="h-12 w-32 relative overflow-">
                <img
                  src={logo}
                  alt="Logo"
                  className="absolute w-[100%] h-[100%] object-contain"
                />
              </div>

              <div className="hidden md:flex gap-10 text-xs text-white uppercase">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `hover:text-yellow-accent transition-colors ${
                      isActive ? "text-yellow-accent" : ""
                    }`
                  }
                >
                  Home
                </NavLink>

                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `hover:text-yellow-accent transition-colors ${
                      isActive ? "text-yellow-accent" : ""
                    }`
                  }
                >
                  About Us
                </NavLink>

                <NavLink
                  to="/products"
                  className={({ isActive }) =>
                    `hover:text-yellow-accent transition-colors ${
                      isActive ? "text-yellow-accent" : ""
                    }`
                  }
                >
                  Products
                </NavLink>

                <NavLink
                  to="/custom"
                  className={({ isActive }) =>
                    `hover:text-yellow-accent transition-colors ${
                      isActive ? "text-yellow-accent" : ""
                    }`
                  }
                >
                  Custom
                </NavLink>
              </div>

              <div className="flex items-center gap-3">
                <NavLink
                  to="/contact"
                  className="hidden md:inline-flex bg-yellow-accent px-4 py-2 rounded-lg text-xs text-black capitalize hover:bg-yellow-500 transition-colors"
                >
                  Contact Us
                </NavLink>

                <button
  className="md:hidden h-10 w-10 inline-flex items-center justify-center text-white text-2xl"
  aria-label="Toggle menu"
  aria-expanded={menuOpen ? 'true' : 'false'}
  onClick={() => setMenuOpen((prev) => !prev)}
  type="button"
>
  ☰
</button>

              </div>
            </div>
          </div>

          {/* Hero Text */}
          <div className="flex-1 flex flex-col justify-center items-center text-center gap-5 mt-10 text-white">
            <p className="font-semibold text-xs uppercase tracking-wider">
              Crafted with Love, Made for Happy Hearts
            </p>
            <div className="flex flex-col gap-2">
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">
                Handcrafted Candles
                <br /> Made to Warm Your World
              </h1>
              <p className="font-semibold text-xs md:text-sm max-w-lg mx-auto">
                Discover soothing fragrances, soft glows, and artisanal designs
                crafted to bring comfort into every corner of your home.
              </p>
            </div>

            <button
              className="bg-yellow-accent flex items-center gap-2 px-6 py-3 rounded-md mt-4 text-black font-medium"
              type="button"
            >
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
      <div
        ref={productSectionRef}
        className="relative w-full h-screen bg-white flex flex-col md:flex-row overflow-hidden z-20"
      >
        <div className="w-full md:w-1/2 flex flex-col justify-center px-10 md:pl-[100px] py-16 h-full">
          <h2 className="font-normal text-4xl md:text-[62px] leading-tight text-black uppercase max-w-xl mb-12">
            Elevate Your Space With Handcrafted Glow
          </h2>
          <div className="hidden md:block w-full max-w-[540px] h-[1px] bg-black mb-8"></div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              className="bg-yellow-accent px-6 py-3 rounded-md text-black font-medium text-base capitalize whitespace-nowrap"
              type="button"
            >
              Explore collections
            </button>
            <button
              className="border border-black px-6 py-3 rounded-md text-black font-medium text-base capitalize hover:bg-black hover:text-white transition whitespace-nowrap"
              type="button"
            >
              Customize Your Candle
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/2 h-full overflow-hidden">
          <img
            src={rectangle60}
            alt="Candle"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Collections */}
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
              canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="black"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Right arrow */}
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll collections right"
            className={`absolute right-[0] top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-yellow-accent shadow-2xl flex items-center justify-center transition-transform hover:scale-105 ${
              canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="black"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            ref={collectionsRef}
            onScroll={onCollectionsScroll}
            className="overflow-x-auto no-scrollbar"
          >
            <div className="flex gap-6 items-stretch w-max md:w-full px-4 md:px-0 py-4">
              {COLLECTIONS.map((col) => (
                <div
                  key={col.id}
                  className="flex-shrink-0 w-56 md:flex-1 md:w-auto"
                >
                  <div className="flex flex-col items-center text-center cursor-pointer group">
                    <div className="w-56 h-56 md:w-[320px] md:h-[320px] overflow-hidden rounded-lg mb-4 shadow-md bg-gray-100">
                      <img
                        src={col.image}
                        alt={`${col.title} collection`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          e.target.src = rectangle60;
                        }}
                      />
                    </div>
                    <h3 className="font-normal text-lg text-black mb-2">
                      {col.title}
                    </h3>

                    <button
                      type="button"
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

      {/* Why Choose Us */}
      <div className="relative w-full h-auto min-h-[650px] bg-gray-50 overflow-hidden z-10">
        <div className="absolute inset-0">
          <img
            src={macbookAir2}
            alt="Background"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl"></div>
        </div>

        <div className="relative w-full max-w-[1280px] mx-auto py-16 flex flex-col items-center">
          <h2 className="font-semibold text-4xl text-black capitalize mb-2 text-center">
            Why Choose Us
          </h2>
          <p className="text-lg text-black mb-16 text-center px-4">
            Candles crafted to comfort, glow and soothe your space.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 px-8">
            {INITIAL_FEATURES.map((feature) => (
              <div
                key={feature.id}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-6 flex justify-center items-center">
                  <img
                    src={getImage(feature.image)}
                    alt={feature.title}
                    className="w-[170px] h-[170px] rounded-full object-cover"
                  />
                </div>
                <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-800">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 relative z-10">
            <button
              className="bg-yellow-accent px-8 py-3 rounded-lg font-medium text-black capitalize"
              type="button"
            >
              View Catalogue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
