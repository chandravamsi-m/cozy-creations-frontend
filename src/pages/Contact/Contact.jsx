// src/pages/Contact/ContactUs.jsx
import React, { useEffect, useState, useRef } from "react";
import contactusHeroBg from "../../assets/images/contactus-hero-bg.png";
import mailRounded from "../../assets/svgs/mail-rounded.svg";
import call from "../../assets/svgs/call.svg";
import pin from "../../assets/svgs/ion_pin.svg";
import instagram from "../../assets/svgs/instagram-fill.svg";
import ScrollDownIndicator from "../../components/ScrollDownIndicator";
import { useAutoScrollFromHero } from "../../hooks/useAutoScrollFromHero";
import { BACKEND_URL } from "../../config/backend";

const COLLECTIONS = [
  { label: "Flower Collection", value: "flower" },
  { label: "Animal Collection", value: "animal" },
  { label: "Festive Collection", value: "festive" },
  { label: "Glass Jar Collection", value: "glassJar" },
  { label: "Special Collection", value: "special" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;

function ContactCard({ icon, title, value, children, delay = 0 }) {
  return (
    <div className="group w-full h-full min-h-[120px] rounded-xl border border-gray-200/50 bg-white/95 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 px-4 py-4 sm:px-5 sm:py-5 flex flex-col">
      <div className="flex items-start gap-3 flex-1">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-accent to-yellow-accent/80 border border-yellow-accent/20 grid place-items-center shrink-0 group-hover:scale-110 transition-transform duration-300">
          {icon ? (
            <img src={icon} alt={`${title} icon`} className="w-6 h-6" />
          ) : (
            children
          )}
        </div>

        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="font-bold text-sm sm:text-base text-gray-900 capitalize tracking-tight leading-tight mb-1">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 break-words leading-relaxed flex-1">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    collection: "",
    product: "",
    quantity: "",
    customization: "",
    location: "",
  });

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const heroContentRef = useRef(null);
  const contactCardsRef = useRef(null);
  const formRef = useRef(null);
  const [isVisible, setIsVisible] = useState({
    hero: false,
    cards: false,
    form: false,
  });

  // Auto-scroll after 5s on hero
  useAutoScrollFromHero({
    enabled: true,
    targetRef: contactCardsRef,
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

    if (contactCardsRef.current) {
      observer.observe(contactCardsRef.current);
    }
    if (formRef.current) {
      observer.observe(formRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));

    if (name === "collection") {
      // clear product when collection changes
      setFormData((p) => ({ ...p, product: "" }));
    }
  };

  useEffect(() => {
    const collection = formData.collection;
    if (!collection) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const tryFetch = async (url) => {
      // small wrapper to try fetch and return parsed json or throw
      const resp = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} ${resp.statusText} ${txt}`);
      }
      const json = await resp.json().catch(() => null);
      return json;
    };

    const fetchProductsForCollection = async () => {
      setLoadingProducts(true);
      setErrorMessage("");
      setProducts([]);
      try {
        // try several reasonable category encodings (original, lowercase, dashed)
        const candidates = [
          collection,
          collection.toLowerCase(),
          collection.replace(/\s+/g, "-").toLowerCase(),
        ];
        let json = null;
        let lastError = null;
        for (const c of [...new Set(candidates)]) {
          const url = `${BACKEND_URL || ""}/api/products?category=${encodeURIComponent(c)}`;
          try {
            json = await tryFetch(url);
            // if parsed successfully, stop trying alternatives
            if (json !== null) break;
          } catch (err) {
            lastError = err;
            // continue to next candidate
          }
        }

        if (!isMounted) return;

        if (!json) {
          // no valid response from candidates
          console.warn("Products fetch returned no json", lastError);
          setErrorMessage("No products found for the selected collection.");
          setProducts([]);
          return;
        }

        // normalize response shapes
        let arr = [];
        if (Array.isArray(json)) {
          arr = json;
        } else if (Array.isArray(json.products)) {
          arr = json.products;
        } else if (Array.isArray(json.data)) {
          arr = json.data;
        } else if (Array.isArray(json.result)) {
          arr = json.result;
        } else {
          // maybe backend sends { success: true, data: [...] }
          // fallback: try to find any array value inside the object
          const anyArray = Object.values(json).find((v) => Array.isArray(v));
          if (anyArray) arr = anyArray;
        }

        if (!arr.length) {
          setErrorMessage("No products available for this collection.");
          setProducts([]);
          return;
        }

        const mapped = arr.map((p) => ({
          label: p.name || p.title || p.productName || p._id || String(p.value),
          value: p._id || p.sku || p.value || p.slug || p.name || p.title,
        }));

        setProducts(mapped);
        setErrorMessage("");
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching products:", err);
        setErrorMessage("Unable to load products. Please try again later.");
        setProducts([]);
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    };

    fetchProductsForCollection();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [formData.collection]);

  const validate = () => {
    if (!formData.name.trim()) {
      setErrorMessage("Please enter your name.");
      return false;
    }
    if (!EMAIL_REGEX.test(formData.email)) {
      setErrorMessage("Please enter a valid email address.");
      return false;
    }
    if (!PHONE_REGEX.test(formData.phone.replace(/\D/g, ""))) {
      setErrorMessage("Please enter a valid phone number (10-15 digits).");
      return false;
    }
    if (!formData.collection) {
      setErrorMessage("Please select a collection.");
      return false;
    }
    if (!formData.product) {
      setErrorMessage("Please select a product.");
      return false;
    }
    if (!formData.quantity || Number(formData.quantity) < 1) {
      setErrorMessage("Please enter a valid quantity (minimum 1).");
      return false;
    }
    if (!formData.location.trim()) {
      setErrorMessage("Please enter delivery location.");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitSuccess(null);
    setErrorMessage("");

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        collection: formData.collection,
        product: formData.product,
        quantity: Number(formData.quantity),
        customization: formData.customization,
        location: formData.location,
      };

      // backend may not be ready; this will fail gracefully
      const resp = await fetch(`${BACKEND_URL || ""}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        let msg = `${resp.status} ${resp.statusText}`;
        try {
          const errBody = await resp.json();
          msg = errBody.message || JSON.stringify(errBody);
        } catch {}
        throw new Error(msg);
      }

      setSubmitSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        collection: "",
        product: "",
        quantity: "",
        customization: "",
        location: "",
      });
      setProducts([]);
    } catch (err) {
      console.error("Submit error:", err);
      setSubmitSuccess(false);
      setErrorMessage(
        err.message || "Unable to submit request. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#FBFAF9] font-montserrat">
      {/* HERO */}
      <section className="relative w-full h-screen overflow-hidden">
        <img
          src={contactusHeroBg}
          alt="Contact Background"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/40" />

        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div
            ref={heroContentRef}
            className={`max-w-3xl transition-all duration-700 ${
              isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="inline-block mb-4">
              <span className="text-yellow-accent font-semibold text-xs sm:text-sm tracking-widest uppercase bg-yellow-accent/10 px-4 py-2 rounded-full border border-yellow-accent/30">
                Get In Touch
              </span>
            </div>
            <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight leading-tight mb-6">
              Let's Create Something
              <span className="block text-yellow-accent mt-2">Beautiful Together</span>
            </h1>
            <p
              className={`text-white/90 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl transition-all duration-700 delay-200 ${
                isVisible.hero ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              Have a bulk order, custom request, or a question? Share the details below.
            </p>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <ScrollDownIndicator
          onClick={() =>
            contactCardsRef?.current?.scrollIntoView({ behavior: "smooth" })
          }
        />
      </section>

      {/* CONTACT CARDS */}
      <section
        ref={contactCardsRef}
        data-section="cards"
        className="relative z-20 bg-[#FBFAF9] pt-8 sm:pt-10 md:pt-12"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
            <div
              className={`transition-all duration-500 ${
                isVisible.cards ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <ContactCard
                icon={mailRounded}
                title="Email"
                value="cozycandlecorner13@gmail.com"
              />
            </div>
            <div
              className={`transition-all duration-500 ${
                isVisible.cards ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              <ContactCard icon={call} title="Phone" value="+91 8019401322" />
            </div>
            <div
              className={`transition-all duration-500 ${
                isVisible.cards ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: "300ms" }}
            >
              <ContactCard
                icon={pin}
                title="Address"
                value="Hyderabad, Gajularamaram"
              />
            </div>
            <div
              className={`transition-all duration-500 ${
                isVisible.cards ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: "400ms" }}
            >
              <ContactCard
                icon={instagram}
                title="Instagram"
                value="@cozycreationscandle"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <section
        ref={formRef}
        data-section="form"
        className="w-full flex justify-center py-10 sm:py-12 lg:py-14 px-4 sm:px-6 lg:px-8 bg-[#FBFAF9]"
      >
        <div
          className={`bg-white border border-gray-200/60 rounded-2xl w-full max-w-[750px] p-5 sm:p-6 md:p-7 lg:p-8 shadow-xl transition-all duration-700 ${
            isVisible.form ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-block mb-3">
              <span className="text-yellow-accent font-semibold text-xs tracking-widest uppercase">
                Order Form
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal text-gray-900 mb-2 tracking-tight">
              Bulk Order Request
            </h2>
            <p className="text-sm text-gray-600 max-w-xl mx-auto">
              Fill out the form below and we'll get back to you as soon as possible to discuss your custom order.
            </p>
          </div>

          {submitSuccess === true && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Your request has been submitted successfully. We'll contact you soon!</span>
            </div>
          )}
          {submitSuccess === false && errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
          {submitSuccess === null && errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
                className="w-full h-[48px] sm:h-[50px] px-4 border border-gray-300 rounded-lg 
             text-sm text-gray-900 placeholder:text-gray-400
             focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent bg-white transition-all"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  className="w-full h-[48px] sm:h-[50px] px-4 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent bg-white transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 1234567890"
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full h-[48px] sm:h-[50px] px-4 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Collection <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="collection"
                    value={formData.collection}
                    onChange={handleChange}
                    className="w-full h-[48px] sm:h-[50px] px-4 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent bg-white transition-all"
                    required
                  >
                    <option value="">Select a collection</option>
                    {COLLECTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Product <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    className="w-full h-[48px] sm:h-[50px] px-4 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent bg-white transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                    required
                    disabled={!formData.collection || loadingProducts}
                    aria-busy={loadingProducts}
                  >
                    <option value="">
                      {loadingProducts
                        ? "Loading products..."
                        : !formData.collection
                        ? "Select collection first"
                        : products.length
                        ? "Select a product"
                        : "No products available"}
                    </option>
                    {products.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  min="1"
                  className="w-full h-[48px] sm:h-[50px] px-4 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Customization Requests
              </label>
              <textarea
                name="customization"
                value={formData.customization}
                onChange={handleChange}
                placeholder="Tell us about any special requests, custom fragrances, colors, or other customization needs..."
                rows="4"
                className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent resize-none bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Delivery Location <span className="text-red-500">*</span>
              </label>
              <textarea
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Enter your complete delivery address with city, state, and PIN code"
                rows="4"
                autoComplete="street-address"
                className="w-full min-h-[100px] px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-accent/50 focus:border-yellow-accent resize-none bg-white transition-all"
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full h-[50px] sm:h-[52px] rounded-lg text-sm sm:text-base font-bold text-gray-900 bg-yellow-accent hover:bg-yellow-accent/90 transition-all duration-300 shadow-lg hover:shadow-xl ${
                  submitting
                    ? "opacity-70 pointer-events-none cursor-not-allowed"
                    : "hover:scale-[1.02] active:scale-[0.98]"
                }`}
                aria-busy={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit Order Request"
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
