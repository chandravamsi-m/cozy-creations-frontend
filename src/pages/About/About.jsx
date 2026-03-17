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
import usePageSEO from "../../hooks/usePageSEO";

// Cloudinary hero image
const ABOUT_HERO_IMAGE = "https://res.cloudinary.com/dumkblp3v/image/upload/v1771307254/image_6_dal1ii.webp";

export default function About() {
  usePageSEO({
    title: "About Us — Our Story",
    description:
      "Cozy Creations crafts premium handmade candles with passion and artistry. Learn about our journey, our soy & gel wax process, and our unique floral, festive & custom candle collections.",
    path: "/about",
  });
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
  useAutoScrollFromHero({ enabled: typeof window !== 'undefined' && window.innerWidth > 768, targetRef: afterHeroRef, delayMs: 5000 });

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
      {/* Navbar is rendered by MainLayout */}

      {/* Add padding top to account for fixed navbar */}
      <div className="pt-0">
        {/* Hero Section - About Us */}
        <section className="relative w-full h-auto min-h-[50vh] md:h-screen overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={optimizeCloudinaryImage(ABOUT_HERO_IMAGE, IMAGE_PRESETS.hero)}
              alt="About Background"
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/40" />
          </div>

          {/* Content */}
          <div className="relative z-10 w-full h-full flex flex-col pt-32 pb-12 sm:pt-0 sm:pb-0 sm:justify-center">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <p
                className={`text-white font-semibold text-4xl md:text-6xl uppercase tracking-wider mb-4 transition-all duration-700 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                  }`}
              >
                About Us
              </p>
              <h1
                className={`text-yellow-accent text-2xl md:text-3xl font-bold leading-tight uppercase mb-6 transition-all duration-700 delay-100 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                  }`}
              >
                Where Every Flame <br /> Feels Like Home
              </h1>
              <p
                className={`text-white/90 text-md font-semibold leading-relaxed max-w-lg transition-all duration-700 delay-200 ${isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                  }`}
              >
                Cozy Creations crafts premium candles, aroma-rich gifts, and custom designs that elevate everyday spaces with soothing fragrance and timeless beauty.
              </p>
            </div>
          </div>

          {/* Pajama scroll (all pages except Contact) - Desktop only */}
          <div className="hidden md:block">
            <ScrollDownIndicator
              onClick={() =>
                afterHeroRef?.current?.scrollIntoView({ behavior: "smooth" })
              }
            />
          </div>
        </section>

        {/* Our Journey Section */}
        <section
          ref={(el) => {
            afterHeroRef.current = el;
            journeySectionRef.current = el;
          }}
          data-section="journey"
          className="relative w-full bg-white flex flex-col md:flex-row items-center md:max-h-[500px] lg:max-h-[450px] gap-0 md:gap-12 lg:gap-20 overflow-hidden mb-12"
        >
          {/* Text Content */}
          <div
            className={`w-full md:flex-1 flex flex-col justify-center px-4 md:pl-[100px] md:pr-0 py-6 md:py-8 transition-all duration-700 ${isVisible.journey ? "translate-x-0 opacity-100" : "translate-x-[-30px] opacity-0"
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

          {/* Image Content - Full Width Edge (Flex) */}
          <div
            className={`w-full md:flex-1 h-[250px] sm:h-[300px] md:h-auto md:self-stretch relative transition-all duration-700 delay-200 ${isVisible.journey ? "translate-x-0 opacity-100" : "translate-x-[30px] opacity-0"
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
          className="relative w-full bg-white px-0 pb-0 md:pb-8 overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row items-center gap-0 md:gap-12 lg:gap-20">
            {/* Images Grid - Left Side - Full Width Edge */}
            <div
              className={`w-full lg:flex-1 h-[350px] sm:h-[400px] md:h-[clamp(500px,65vh,600px)] lg:h-[clamp(550px,80vh,750px)] relative transition-all duration-700 ${isVisible.handmade ? "translate-x-0 opacity-100" : "translate-x-[-30px] opacity-0"
                }`}
            >
              <img
                src={aboutGrid}
                alt="About Grid"
                className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Text Content - Right Side */}
            <div
              className={`w-full lg:flex-1 flex flex-col justify-center px-4 pr-4 md:pr-[100px] lg:pr-[150px] pl-4 md:pl-12 lg:pl-0 py-8 md:py-16 transition-all duration-700 delay-200 ${isVisible.handmade ? "translate-x-0 opacity-100" : "translate-x-[30px] opacity-0"
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
          className="relative w-full bg-white px-0 mb-0 md:px-0 pt-4 md:pt-16 pb-0"
        >
          {/* Intro Text */}
          <p
            className={`text-base md:text-lg font-semibold text-black text-center capitalize mb-12 md:mb-16 max-w-4xl mx-2 md:mx-auto px-0 transition-all duration-700 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
          >
            Our collections include floral candles, animal-shaped candles, jar candles, spiral designs, festive specials, and personalized gift candles—perfect for home décor and gifting.
          </p>

          {/* Collections Grid - Responsive Structured Layout */}
          <div className="relative w-full max-w-[1440px] mx-auto px-4 md:px-8 lg:px-0">
            <div className="flex flex-wrap justify-center items-end gap-6 md:gap-8 lg:gap-8">
              {/* Glass Jar Collection */}
              <div
                className={`flex flex-col items-center w-[calc(50%-12px)] sm:w-[160px] md:w-[180px] lg:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "100ms" }}
              >
                <p className="text-sm md:text-base font-medium text-black capitalize text-center mb-2">
                  glass jar collection
                </p>
                <div className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] lg:h-[436px]">
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
                className={`flex flex-col items-center w-[calc(50%-12px)] sm:w-[160px] md:w-[180px] lg:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "200ms" }}
              >
                <p className="text-sm md:text-base font-medium text-black capitalize text-center mb-2">
                  flower collection
                </p>
                <div className="relative w-full h-[220px] sm:h-[250px] md:h-[300px] lg:h-[303px]">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection2}
                      alt="Flower Collection"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Animal & Shapes Collection */}
              <div
                className={`flex flex-col items-center w-[calc(50%-12px)] sm:w-[160px] md:w-[180px] lg:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "300ms" }}
              >
                <p className="text-sm md:text-base font-medium text-black capitalize text-center mb-2">
                  animal & shapes
                </p>
                <div className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] lg:h-[436px]">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection3}
                      alt="Animal & Shapes"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Spiral Collection */}
              <div
                className={`flex flex-col items-center w-[calc(50%-12px)] sm:w-[160px] md:w-[180px] lg:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "400ms" }}
              >
                <p className="text-sm md:text-base font-medium text-black capitalize text-center mb-2">
                  spiral collection
                </p>
                <div className="relative w-full h-[220px] sm:h-[250px] md:h-[300px] lg:h-[303px]">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection4}
                      alt="Spiral Collection"
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Festive Special */}
              <div
                className={`flex flex-col items-center w-[calc(50%-12px)] sm:w-[160px] md:w-[180px] lg:w-[181px] transition-all duration-500 ${isVisible.collections ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
                  }`}
                style={{ transitionDelay: "500ms" }}
              >
                <p className="text-sm md:text-base font-medium text-black capitalize text-center mb-2">
                  festive special
                </p>
                <div className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] lg:h-[436px]">
                  <div className="absolute inset-0 bg-gray-200 overflow-hidden" style={{ borderRadius: '1000px 1000px 0 0' }}>
                    <img
                      src={collection5}
                      alt="Festive Special"
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
