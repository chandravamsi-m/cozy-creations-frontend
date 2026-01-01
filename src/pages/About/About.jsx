import React, { useState, useRef, useEffect } from 'react';
import { useAutoScrollFromHero } from "../../hooks/useAutoScrollFromHero";
import { optimizeCloudinaryImage, IMAGE_PRESETS } from "../../utils/imageOptimization";
import Navbar from '../../components/Navbar';
import aboutJourney from '../../assets/images/about-journey.webp';
import aboutGrid from '../../assets/images/about-grid.webp';
import collection1 from '../../assets/images/collection-1.webp';
import collection2 from '../../assets/images/collection-2.webp';
import collection3 from '../../assets/images/collection-3.webp';
import collection4 from '../../assets/images/collection-4.webp';
import collection5 from '../../assets/images/collection-5.webp';
import ScrollDownIndicator from "../../components/ScrollDownIndicator";

// Cloudinary hero image
const ABOUT_HERO_IMAGE = "https://res.cloudinary.com/dumkblp3v/image/upload/v1767176694/about-hero-bg_wyfk2x.webp";

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);
  const stickyNavRef = useRef(null);
  const afterHeroRef = useRef(null);
  const journeySectionRef = useRef(null);
  const handmadeSectionRef = useRef(null);
  const collectionsSectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState({
    hero: false,
    journey: false,
    handmade: false,
    collections: false,
  });

  // Auto-scroll after 5s on hero (exclude Contact only; About included)
  useAutoScrollFromHero({ enabled: true, targetRef: afterHeroRef, delayMs: 5000 });

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

    if (journeySectionRef.current) {
      observer.observe(journeySectionRef.current);
    }
    if (handmadeSectionRef.current) {
      observer.observe(handmadeSectionRef.current);
    }
    if (collectionsSectionRef.current) {
      observer.observe(collectionsSectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full bg-white font-montserrat">
      {/* Navbar */}
      <Navbar stickyNavRef={stickyNavRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Add padding top to account for fixed navbar */}
      <div className="pt-0">
        {/* Hero Section - About Us */}
        <section className="relative w-full h-screen overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={optimizeCloudinaryImage(ABOUT_HERO_IMAGE, IMAGE_PRESETS.hero)}
              alt="About Background"
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-1/2 flex flex-col justify-center px-2 pt-20 sm:pt-12 sm:px-4 md:px-[150px]">
            <h1
              className={`text-white text-2xl sm:text-3xl md:text-4xl font-normal uppercase mb-4 sm:mb-6 transition-all duration-700 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                }`}
            >
              about us
            </h1>
            <p
              className={`text-white text-xs sm:text-sm md:text-base leading-5 max-w-full sm:max-w-[543px] capitalize transition-all duration-700 delay-200 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                }`}
            >
              Cozy Creations is a handcrafted candle brand dedicated to creating premium soy candles, aroma-rich gift candles, and custom candle designs that bring warmth, beauty, and comfort into everyday spaces. Our mission is to offer candles that not only look stunning but also fill your home with soothing fragrances and peaceful energy.
            </p>
          </div>

          {/* Pajama scroll (all pages except Contact) */}
          <ScrollDownIndicator
            onClick={() =>
              afterHeroRef?.current?.scrollIntoView({ behavior: "smooth" })
            }
          />
        </section>

        {/* Our Journey Section */}
        <section
          ref={(el) => {
            afterHeroRef.current = el;
            journeySectionRef.current = el;
          }}
          data-section="journey"
          className="relative w-full min-h-screen bg-white flex flex-col md:flex-row items-start px-4 md:px-[100px] pb-16"
        >
          <div
            className={`w-full md:w-1/2 mb-8 md:mb-0 md:pr-8 pt-44 transition-all duration-700 ${isVisible.journey ? "translate-x-0 opacity-100" : "translate-x-[-30px] opacity-0"
              }`}
          >
            <h2 className="text-3xl md:text-4xl font-medium text-black capitalize mb-6">
              Our Journey
            </h2>
            <div className="text-base md:text-lg text-black leading-relaxed space-y-4">
              <p>
                Cozy Creations began with a passion for artistic candle making and a desire to craft products that create memorable moments. What started as small-batch creations quickly evolved into a brand known for its unique candle designs, floral candles, themed candles, and festive candle collections loved by décor enthusiasts and gift shoppers.
              </p>
              <p>
                Every candle we create reflects creativity, attention to detail, and a deep love for handcrafted artistry.
              </p>
            </div>
          </div>
          <div
            className={`w-full md:w-1/2 h-[300px] sm:h-[400px] md:h-screen relative transition-all duration-700 delay-200 ${isVisible.journey ? "translate-x-0 opacity-100" : "translate-x-[30px] opacity-0"
              }`}
          >
            <div className="w-full h-full bg-gray-200 overflow-hidden">
              <img
                src={aboutJourney}
                alt="Our Journey"
                className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </section>

        {/* Handmade Candles Section */}
        <section
          ref={handmadeSectionRef}
          data-section="handmade"
          className="relative w-full min-h-screen bg-white px-4 sm:px-8 md:px-16 lg:px-[100px] pb-16"
        >
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Images Grid - Left Side */}
            <div
              className={`w-full lg:w-1/2 h-[250px] sm:h-[300px] md:h-[500px] lg:h-screen relative transition-all duration-700 ${isVisible.handmade ? "translate-x-0 opacity-100" : "translate-x-[-30px] opacity-0"
                }`}
            >
              <img
                src={aboutGrid}
                alt="About Grid"
                className="w-full h-full object-contain lg:object-cover object-center hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Text Content - Right Side */}
            <div
              className={`w-full lg:w-1/2 flex flex-col justify-center pt-8 sm:pt-12 md:pt-16 transition-all duration-700 delay-200 ${isVisible.handmade ? "translate-x-0 opacity-100" : "translate-x-[30px] opacity-0"
                }`}
            >
              <h2 className="text-3xl md:text-4xl font-medium text-black capitalize mb-6">
                Handmade Candles Crafted with Care
              </h2>
              <div className="text-base md:text-lg text-black leading-relaxed space-y-4">
                <p>
                  At Cozy Creations, we use high-quality soy and gel wax, premium fragrance oils, and artistic moulds to craft candles that stand out. Each candle is:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Hand-poured in small batches</li>
                  <li>Designed with premium wax for longer burn time</li>
                  <li>Infused with calming, mood-enhancing aromas</li>
                  <li>Created using safe, clean ingredients</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Our Collections Section */}
        <section
          ref={collectionsSectionRef}
          data-section="collections"
          className="relative w-full min-h-screen bg-white px-0 mb-0 md:px-0 pt-16 pb-0"
        >
          {/* Intro Text */}
          <p
            className={`text-base md:text-lg font-semibold text-black text-center capitalize mb-12 md:mb-16 max-w-4xl mx-2 md:mx-auto px-0 transition-all duration-700 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
          >
            Our collections include floral candles, animal-shaped candles, jar candles, spiral designs, festive specials, and personalized gift candles—perfect for home décor and gifting.
          </p>

          {/* Collections Grid - Arched Layout */}
          <div className="relative w-full max-w-7xl mx-auto items-end">
            <div className="flex flex-wrap justify-center items-end gap-4 md:gap-6 lg:gap-8">
              {/* Glass Jar Collection */}
              <div
                className={`flex flex-col items-center w-[140px] md:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "100ms" }}
              >
                <p className="text-base font-medium text-black capitalize text-center">
                  glass jar collection
                </p>
                <div className="relative w-full h-[300px] md:h-[436px] mb-0">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection1}
                      alt="Glass Jar Collection"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>

              </div>
              {/* Flower Collection */}
              <div
                className={`flex flex-col items-center w-[140px] md:w-[181px] mt-12 md:mt-20 transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "200ms" }}
              >
                <p className="text-base font-medium text-black capitalize text-center">
                  flower collection
                </p>
                <div className="relative w-full h-[250px] md:h-[303px] mb-0">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection2}
                      alt="Flower Collection"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
              {/* Animal Collection */}
              <div
                className={`flex flex-col items-center w-[140px] md:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "300ms" }}
              >
                <p className="text-base font-medium text-black capitalize text-center">
                  animal collection
                </p>

                <div className="relative w-full h-[300px] md:h-[436px] mb-0">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection3}
                      alt="Animal Collection"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>

              </div>
              {/* Festive Collection */}
              <div
                className={`flex flex-col items-end w-[140px] md:w-[181px] mt-12 md:mt-20 transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "400ms" }}
              >
                <p className="text-base font-medium text-black capitalize text-center">
                  festive collection
                </p>
                <div className="relative w-full h-[250px] md:h-[303px] mb-0">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection4}
                      alt="Festive Collection"
                      className="w-full h-full object-cover object-end hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>
              {/* Special Collection */}
              <div
                className={`flex flex-col items-center w-[140px] md:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "500ms" }}
              >
                <p className="text-base font-medium text-black capitalize text-center">
                  special collection
                </p>
                <div className="relative w-full h-[300px] md:h-[436px] mb-0">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection5}
                      alt="Special Collection"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>




            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      {/* <Footer /> */}
      {/* <Footer /> */}
    </div>
  );
}
