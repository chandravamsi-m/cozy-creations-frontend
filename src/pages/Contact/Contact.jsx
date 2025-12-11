// src/pages/Contact/ContactUs.jsx
import React, { useEffect, useState } from "react";
import contactHeroBg from "../../assets/images/contact-hero-bg.png";
import mailRounded from "../../assets/svgs/mail-rounded.svg";
import call from "../../assets/svgs/call.svg";
import pin from "../../assets/svgs/ion_pin.svg";
import instagram from "../../assets/svgs/instagram-fill.svg";
import { endpoints } from "../../services/api"; // uses your api.js

const COLLECTIONS = [
  { label: "Flower Collection", value: "flower" },
  { label: "Animal Collection", value: "animal" },
  { label: "Festive Collection", value: "festive" },
  { label: "Glass Jar Collection", value: "glassJar" },
  { label: "Special Collection", value: "special" }, // example - keep one matching your backend
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10,15}$/;

function ContactCard({ icon, title, value, children }) {
  return (
    <div
      className="bg-white rounded-lg w-full sm:w-[260px] h-[140px] sm:h-[160px] flex flex-col items-center justify-between mt-20 sm:mt-32 md:mt-40 overflow-hidden"
      style={{
        boxShadow:
          "0px 4px 9px 0px rgba(0,0,0,0.1), 1px 17px 17px 0px rgba(0,0,0,0.09), 3px 38px 23px 0px rgba(0,0,0,0.05), 5px 67px 27px 0px rgba(0,0,0,0.01), 8px 104px 29px 0px rgba(0,0,0,0)",
      }}
    >
      {/* True half circle — easier & scalable */}
      <div className="w-[130px] flex items-start justify-center overflow-hidden">
        <div className="w-[130px] h-[70px] bg-[#ccb08b] rounded-b-full flex items-center justify-center">
          {icon ? (
            <img src={icon} alt={`${title} icon`} className="w-10 h-10" />
          ) : (
            children
          )}
        </div>
      </div>

      <div className="text-center pb-6">
        <h3 className="font-semibold text-lg text-black mb-1 capitalize">
          {title}
        </h3>
        <p className="font-normal text-sm text-black">{value}</p>
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
          const url = `${endpoints.products}?category=${encodeURIComponent(c)}`;
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
      const resp = await fetch(endpoints.contact, {
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
    <div className="relative w-full min-h-screen bg-white font-montserrat">
      {/* Hero + Cards */}
      <div className="relative w-full h-screen overflow-visible">
        <div className="absolute inset-0 overflow-visible">
          <img
            src={contactHeroBg}
            alt="Contact Background"
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>

        <div className="relative w-full pt-20 sm:pt-32 md:pt-40">
          <h1 className="text-center text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal tracking-wide px-4">
            Contact Us
          </h1>
        </div>

        <div className="relative w-full max-w-[1280px] mx-auto px-4 sm:px-6 pb-8 -mt-8">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <ContactCard
              icon={mailRounded}
              title="Email"
              value="cozycandlecorner13@gmail.com"
            />
            <ContactCard icon={call} title="Phone" value="+91 8019401322" />
            <ContactCard
              icon={pin}
              title="Address"
              value="Hyderabad, Gajularamaram"
            ></ContactCard>
            <ContactCard
              icon={instagram}
              title="Instagram"
              value="@cozycreationscandle"
            ></ContactCard>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="w-full flex justify-center py-6 sm:py-10 px-4 sm:px-6">
        <div className="bg-white border-2 border-[#3d3021] rounded-2xl sm:rounded-[32px] w-full max-w-[820px] p-4 sm:p-6 md:p-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-normal text-black uppercase mb-2">
              Bulk order request
            </h2>
            <p className="text-sm sm:text-base font-normal text-black uppercase">
              Let's connect and create something beautiful
            </p>
          </div>

          {submitSuccess === true && (
            <div className="mb-6 p-4 rounded-md bg-green-50 text-green-800">
              Your request has been submitted. We'll contact you soon.
            </div>
          )}
          {submitSuccess === false && errorMessage && (
            <div className="mb-6 p-4 rounded-md bg-red-50 text-red-800">
              {errorMessage}
            </div>
          )}
          {submitSuccess === null && errorMessage && (
            <div className="mb-6 p-4 rounded-md bg-yellow-50 text-yellow-800">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-lg sm:text-xl font-medium text-black capitalize mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="enter your name"
                autoComplete="name"
                className="w-full h-[48px] sm:h-[50px] px-3 sm:px-4 border border-black rounded-lg sm:rounded-xl 
             text-sm sm:text-base text-black placeholder:text-black/80 capitalize
             focus:outline-none focus:ring-2 focus:ring-yellow-accent 
             focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-lg sm:text-xl font-medium text-black capitalize mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="enter your Email"
                  autoComplete="email"
                  className="w-full h-[48px] sm:h-[50px] px-3 sm:px-4 border border-black rounded-lg sm:rounded-xl text-sm sm:text-base text-black placeholder:text-black/80 focus:outline-none focus:ring-2 focus:ring-yellow-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-lg sm:text-xl font-medium text-black capitalize mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="enter your phone"
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full h-[48px] sm:h-[50px] px-3 sm:px-4 border border-black rounded-lg sm:rounded-xl text-sm sm:text-base text-black placeholder:text-black/80 focus:outline-none focus:ring-2 focus:ring-yellow-accent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-lg sm:text-xl font-medium text-black capitalize mb-2">
                  Collections
                </label>
                <div className="relative">
                  <select
                    name="collection"
                    value={formData.collection}
                    onChange={handleChange}
                    className="w-full h-[48px] sm:h-[50px] px-3 sm:px-4 pr-8 sm:pr-10 border border-black rounded-lg sm:rounded-xl text-sm sm:text-base text-black appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-accent bg-white"
                    required
                  >
                    <option value="">select collections</option>
                    {COLLECTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-6 h-6"
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
                <label className="block text-lg sm:text-xl font-medium text-black capitalize mb-2">
                  Product
                </label>
                <div className="relative">
                  <select
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    className="w-full h-[48px] sm:h-[50px] px-3 sm:px-4 pr-8 sm:pr-10 border border-black rounded-lg sm:rounded-xl text-sm sm:text-base text-black appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-accent bg-white"
                    required
                    disabled={!formData.collection || loadingProducts}
                    aria-busy={loadingProducts}
                  >
                    <option value="">
                      {loadingProducts
                        ? "loading products..."
                        : !formData.collection
                        ? "select collection first"
                        : products.length
                        ? "select product"
                        : "no products available"}
                    </option>
                    {products.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      className="w-6 h-6"
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
                <label className="block text-lg sm:text-xl font-medium text-black capitalize mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="enter quantity"
                  min="1"
                  className="w-full h-[48px] sm:h-[50px] px-3 sm:px-4 border border-black rounded-lg sm:rounded-xl text-sm sm:text-base text-black placeholder:text-black/80 focus:outline-none focus:ring-2 focus:ring-yellow-accent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xl font-medium text-black capitalize mb-2">
                Customization
              </label>
              <textarea
                name="customization"
                value={formData.customization}
                onChange={handleChange}
                placeholder="any custom request"
                rows="4"
                className="w-full min-h-[100px] px-3 sm:px-4 py-3 sm:py-4 border border-black rounded-lg sm:rounded-xl text-sm sm:text-base text-black placeholder:text-black/80 focus:outline-none focus:ring-2 focus:ring-yellow-accent resize-none"
              />
            </div>

            <div>
              <label className="block text-xl font-medium text-black capitalize mb-2">
                Location
              </label>
              <textarea
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="enter your delivery location"
                rows="4"
                autoComplete="street-address"
                className="w-full min-h-[100px] px-3 sm:px-4 py-3 sm:py-4 border border-black rounded-lg sm:rounded-xl text-sm sm:text-base text-black placeholder:text-black/80 focus:outline-none focus:ring-2 focus:ring-yellow-accent resize-none"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className={`w-full h-[50px] rounded-xl text-xl font-bold text-black capitalize bg-yellow-500 transition-colors ${
                  submitting
                    ? "opacity-70 pointer-events-none"
                    : "hover:bg-yellow-600"
                }`}
                aria-busy={submitting}
              >
                {submitting ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
