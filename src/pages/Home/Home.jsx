// src/pages/Home/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAutoScrollFromHero } from "../../hooks/useAutoScrollFromHero";
import { optimizeCloudinaryImage, IMAGE_PRESETS } from "../../utils/imageOptimization";
import rectangle60 from "../../assets/images/rectangle-60.webp";
import macbookAir2 from "../../assets/images/macbook-air-2.webp";

// Cloudinary hero image
const HOME_HERO_IMAGE = "https://res.cloudinary.com/dumkblp3v/image/upload/v1767176149/unnamed-7_j6fal6.webp";

import searchBold from "../../assets/svgs/search-bold.svg";
import ScrollDownIndicator from "../../components/ScrollDownIndicator";
import usePageSEO from "../../hooks/usePageSEO";

import {
  INITIAL_FEATURES,
  IMAGE_MAP,
  COLLECTIONS,
} from "../../utils/constants";

export default function Home({ heroRef, productSectionRef, menuOpen, setMenuOpen }) {
  usePageSEO({
    title: "Handcrafted Candles — Shop Online",
    description:
      "Discover handcrafted candles made with love. Explore our floral, animal, festive, special & glass jar collections. Premium soy & gel wax candles for home décor & gifting.",
    path: "/",
  });

  const navigate = useNavigate();
  // Home collections IDs aren't 1:1 with product category values in Firestore.
  // Map where needed so filtering works correctly on the Products page.
  const categoryRouteMap = {
    glassjar: "glassJar",
  };
  const collectionsRef = useRef(null);
  const heroContentRef = useRef(null);
  const collectionsSectionRef = useRef(null);
  const featuresSectionRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isVisible, setIsVisible] = useState({
    hero: false,
    product: false,
    collections: false,
    features: false,
  });

  // Auto-scroll after 5s on hero (Home included)
  useAutoScrollFromHero({
    enabled: true,
    targetRef: productSectionRef,
    delayMs: 5000,
  });

  // Hero fade-in on mount
  useEffect(() => {
    setIsVisible((prev) => ({ ...prev, hero: true }));
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const section = entry.target.getAttribute("data-section");
            if (section) {
              setIsVisible((prev) => ({ ...prev, [section]: true }));
            }
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
    );

    if (productSectionRef?.current) {
      observer.observe(productSectionRef.current);
    }
    if (collectionsSectionRef.current) {
      observer.observe(collectionsSectionRef.current);
    }
    if (featuresSectionRef.current) {
      observer.observe(featuresSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

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
            src={optimizeCloudinaryImage(HOME_HERO_IMAGE, IMAGE_PRESETS.hero)}
            alt="Hero Background"
            className="w-full h-full object-cover object-top"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/40"></div>
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center px-4 sm:px-6 md:px-8">
          {/* Main navbar is the global `Navbar` (single navbar on Home) */}

          {/* Hero Text */}
          <div
            ref={heroContentRef}
            className={`flex-1 flex flex-col justify-center items-center text-center gap-5 mt-10 text-white transition-opacity duration-1000 ${isVisible.hero ? "opacity-100" : "opacity-0"
              }`}
          >
            <p
              className={`font-semibold text-xs uppercase tracking-wider transition-all duration-700 delay-100 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
            >
              Crafted with Love, Made for Happy Hearts
            </p>
            <div className="flex flex-col gap-2">
              <h1
                className={`font-bold text-3xl sm:text-4xl md:text-6xl leading-tight transition-all duration-700 delay-200 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
              >
                Handcrafted Candles
                <br /> Made to Warm Your World
              </h1>
              <p
                className={`font-semibold text-xs md:text-sm max-w-lg mx-auto transition-all duration-700 delay-300 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                  }`}
              >
                Discover soothing fragrances, soft glows, and artisanal designs
                crafted to bring comfort into every corner of your home.
              </p>
            </div>

            <button
              className={`bg-yellow-accent flex items-center gap-2 px-6 py-3 rounded-md mt-4 text-black font-medium hover:scale-105 transition-all duration-300 delay-400 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
              type="button"
              onClick={() => {
                navigate("/products", { state: { scrollTo: "products", skipHero: true } });
              }}
            >
              <img src={searchBold} alt="Search" className="w-6 h-6" />
              <span>Shop Collections</span>
            </button>
          </div>

          <ScrollDownIndicator
            onClick={() => productSectionRef?.current?.scrollIntoView({ behavior: "smooth" })}
          />
        </div>
      </div>

      {/* Product Highlight Section */}
      <div
        ref={productSectionRef}
        data-section="product"
        className="relative w-full h-auto lg:h-screen bg-white flex flex-col md:flex-row overflow-hidden z-20"
      >
        <div
          className={`w-full md:w-1/2 flex flex-col justify-center px-3 sm:px-6 md:px-10 lg:pl-[100px] pt-8 pb-10 sm:pt-12 sm:pb-8 md:py-16 lg:py-16 h-auto lg:h-full transition-all duration-700 ${isVisible.product ? "translate-x-0 opacity-100" : "translate-x-[-30px] opacity-0"
            }`}
        >
          <h2 className="font-normal text-[28px] xs:text-[32px] sm:text-3xl md:text-4xl lg:text-[54px] xl:text-[62px] leading-tight sm:leading-snug md:leading-tight lg:leading-[1.15] text-black uppercase max-w-none md:max-w-xl mb-4 sm:mb-8 md:mb-12 break-words text-left">
            Elevate Your Space With Handcrafted Glow
          </h2>
          <div className="hidden md:block w-full max-w-[540px] h-[1px] bg-black mb-8"></div>
          <div className="flex flex-row gap-2 sm:gap-4 w-full">
            <button
              className="flex-1 bg-yellow-accent px-4 py-2.5 sm:px-6 sm:py-3 rounded-md text-black font-medium text-[13px] sm:text-base capitalize whitespace-nowrap hover:scale-105 transition-transform duration-300"
              type="button"
              onClick={() => {
                const el = document.getElementById("collections");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore collections
            </button>
            <button
              className="flex-1 border border-black px-4 py-2.5 sm:px-6 sm:py-3 rounded-md text-black font-medium text-[13px] sm:text-base capitalize hover:bg-black hover:text-white transition-all duration-300 whitespace-nowrap"
              type="button"
              onClick={() => navigate("/about")}
            >
              Who We Are
            </button>
          </div>
        </div>
        <div
          className={`w-full md:w-1/2 h-[300px] sm:h-[400px] md:h-[500px] lg:h-full overflow-hidden transition-all duration-700 delay-200 ${isVisible.product ? "translate-x-0 opacity-100" : "translate-x-[30px] opacity-0"
            }`}
        >
          <img
            src={rectangle60}
            alt="Candle"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Collections */}
      <div
        id="collections"
        ref={collectionsSectionRef}
        data-section="collections"
        className="relative w-full bg-white py-8 md:py-16 lg:py-20 z-10"
      >
        <div className="max-w-[1280px] mx-auto px-4">
          <h2
            className={`font-semibold text-3xl md:text-4xl text-black capitalize mb-6 md:mb-8 text-center transition-all duration-700 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
          >
            OUR COLLECTIONS
          </h2>
        </div>

        <div className="relative group/collections">
          {/* Left arrow */}
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll collections left"
            className={`absolute left-2 sm:left-4 top-[96px] md:top-[140px] -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-yellow-accent shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
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
            className={`absolute right-2 sm:right-4 top-[96px] md:top-[140px] -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-yellow-accent shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
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
            className="overflow-x-auto no-scrollbar scroll-smooth"
          >
            <div className="flex gap-4 sm:gap-6 items-stretch w-max pb-4 px-4 sm:px-6 md:px-8">
              {COLLECTIONS.map((col, index) => (
                <div
                  key={col.id}
                  className={`flex-shrink-0 w-48 md:flex-1 md:w-auto transition-all duration-500 ${isVisible.collections
                    ? "translate-y-0 opacity-100"
                    : "translate-y-8 opacity-0"
                    }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col items-center text-center cursor-pointer group">
                    <div className="w-48 h-48 md:w-[280px] md:h-[280px] overflow-hidden rounded-lg mb-4 shadow-md bg-gray-100">
                      <img
                        src={col.image}
                        alt={`${col.title} collection`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                      className="mt-2 bg-yellow-accent px-4 py-2 rounded-md text-sm font-medium text-black hover:bg-yellow-500 hover:scale-105 transition-all duration-300"
                      onClick={() => {
                        const cat = categoryRouteMap[col.id] || col.value || col.id;
                        navigate("/products", {
                          state: { category: cat, scrollTo: "products", skipHero: true },
                        });
                      }}
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
      <div
        ref={featuresSectionRef}
        data-section="features"
        className="relative w-full h-auto min-h-[500px] md:min-h-[650px] bg-gray-50 overflow-hidden z-10"
      >
        <div className="absolute inset-0">
          <img
            src={macbookAir2}
            alt="Background"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl"></div>
        </div>

        <div className="relative w-full max-w-[1280px] mx-auto py-8 sm:py-12 md:py-16 flex flex-col items-center">
          <h2
            className={`font-semibold text-3xl md:text-4xl text-black capitalize mb-2 text-center transition-all duration-700 ${isVisible.features ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
          >
            Why Choose Us
          </h2>
          <p
            className={`text-base md:text-lg text-black mb-8 sm:mb-12 md:mb-16 text-center px-4 transition-all duration-700 delay-100 ${isVisible.features ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
          >
            Candles crafted to comfort, glow and soothe your space.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-8 lg:gap-10 px-4 sm:px-6 lg:px-8">
            {INITIAL_FEATURES.map((feature, index) => (
              <div
                key={feature.id}
                className={`flex flex-col items-center text-center transition-all duration-500 ${isVisible.features ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="mb-2 sm:mb-4 md:mb-6 flex justify-center items-center">
                  <img
                    src={getImage(feature.image)}
                    alt={feature.title}
                    className="w-24 h-24 sm:w-40 sm:h-40 md:w-[170px] md:h-[170px] rounded-full object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-medium text-[15px] sm:text-base md:text-lg mb-1 md:mb-2">{feature.title}</h3>
                <p className="text-[13px] sm:text-sm text-gray-800 leading-snug sm:leading-normal">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className={`mt-10 sm:mt-12 md:mt-16 relative z-10 transition-all duration-700 delay-500 ${isVisible.features ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}>
            <button
              className="bg-yellow-accent px-8 py-3 rounded-lg font-medium text-black capitalize hover:scale-105 transition-transform duration-300"
              type="button"
              onClick={() =>
                window.open(
                  "https://drive.google.com/uc?export=download&id=1FkjVEDDm_-rEKPcqLr-TgK99qwzLR3Gg",
                  "_blank"
                )
              }
            >
              Download Catalogue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
