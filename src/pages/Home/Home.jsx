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

import Navbar from "../../components/Navbar";

function PajamasScrollDown({ className = "" }) {
  return (
    <div className={`${className} flex justify-center items-center`}>
      <img src={vector} alt="Scroll Down" className="w-full h-full" />
    </div>
  );
}

export default function Home({
  heroRef,
  heroNavRef,
  productSectionRef,
  menuOpen,
  setMenuOpen,
}) {
  const collectionsRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef?.current) return;

      const heroBottom = heroRef.current.getBoundingClientRect().bottom;

      // when hero bottom touches navbar height (~80px)
      setNavSolid(heroBottom <= 80);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [heroRef]);

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
    el.scrollBy({
      left: Math.floor(el.clientWidth * 0.7),
      behavior: "smooth",
    });
  };

  const getImage = (name) => IMAGE_MAP[name] || Object.values(IMAGE_MAP)[0];

  return (
    <>
      {/* Hero Section */}
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
          {/* Shared Navbar */}
          <Navbar
            stickyNavRef={heroNavRef}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            transparent={!navSolid}
          />

          {/*
          ================================
          PAGE-SPECIFIC TOP BAR + NAV
          (TEMPORARILY DISABLED)
          ================================
          */}

          {/*
          <div className="w-full max-w-[1280px] px-4 pt-4 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row items-center text-white text-xs w-full">
              <div className="flex w-full justify-center items-center font-semibold sm:hidden">
                offer on 25th december for christmas collection
              </div>
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

            <div
              className="flex justify-between items-center relative"
              ref={heroNavRef}
            >
              <div className="h-12 w-32 relative mx-auto md:mx-0">
                <img
                  src={logo}
                  alt="Logo"
                  className="absolute w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
          */}

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
        <div className="w-full md:w-1/2 flex flex-col justify-center px-4 sm:px-6 md:px-10 lg:pl-[100px] py-16 h-full">
          <h2 className="font-normal text-2xl sm:text-3xl md:text-4xl lg:text-[62px] leading-tight text-black uppercase max-w-xl mb-12">
            Elevate Your Space With Handcrafted Glow
          </h2>

          <div className="flex gap-4">
            <button className="bg-yellow-accent px-6 py-3 rounded-md text-black font-medium">
              Explore collections
            </button>
            <button className="border border-black px-6 py-3 rounded-md text-black font-medium hover:bg-black hover:text-white transition">
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
          <h2 className="font-normal text-4xl md:text-5xl text-black uppercase mb-8 text-center">
            Our Collections
          </h2>

          <div
            ref={collectionsRef}
            onScroll={onCollectionsScroll}
            className="overflow-x-auto no-scrollbar"
          >
            <div className="flex gap-6 w-max md:w-full py-4">
              {COLLECTIONS.map((col) => (
                <div key={col.id} className="w-56 md:flex-1">
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-56 h-56 md:w-[320px] md:h-[320px] rounded-lg overflow-hidden mb-4">
                      <img
                        src={col.image}
                        alt={col.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    </div>
                    <h3 className="text-lg text-black mb-2">{col.title}</h3>
                    <button className="bg-yellow-accent px-4 py-2 rounded-md text-sm font-medium">
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
      <div className="relative w-full min-h-[650px] bg-gray-50 overflow-hidden z-10">
        <div className="absolute inset-0">
          <img
            src={macbookAir2}
            alt="Background"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-white/10 backdrop-blur-xl"></div>
        </div>

        <div className="relative max-w-[1280px] mx-auto py-16 text-center">
          <h2 className="font-semibold text-4xl mb-2">Why Choose Us</h2>
          <p className="text-lg mb-16">
            Candles crafted to comfort, glow and soothe your space.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {INITIAL_FEATURES.map((feature) => (
              <div key={feature.id}>
                <img
                  src={getImage(feature.image)}
                  alt={feature.title}
                  className="w-[170px] h-[170px] mx-auto rounded-full mb-6"
                />
                <h3 className="font-medium text-lg mb-2">{feature.title}</h3>
                <p className="text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
