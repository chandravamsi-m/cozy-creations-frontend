import React, { useState } from "react";
import contactHeroBg from "../../assets/images/contact-hero-bg.png";
import mailRounded from "../../assets/svgs/mail-rounded.svg";
import call from "../../assets/svgs/call.svg";

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted:", formData);
  };

  return (
    <div className="relative w-full min-h-screen bg-white font-montserrat">
      {/* Hero Section with Contact Cards */}
      <div className="relative w-full h-[607px] overflow-visible">
        {/* Background Image */}
        <div className="absolute inset-0 overflow-visible">
          <img
            src={contactHeroBg}
            alt="Contact Background"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image doesn't load
              e.target.style.display = "none";
            }}
          />
          <div className=""></div>
        </div>

        {/* Contact Us Title */}
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-full pt-40">
          <h1 className="text-center text-white text-4xl md:text-5xl font-normal tracking-wide">
            Contact Us
          </h1>
        </div>

        {/* Contact Information Cards */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-[1280px] px-4 pb-8">
          <div className="flex flex-wrap justify-center gap-3.5">
            {/* Email Card */}
            <div
              className="bg-white rounded-lg w-[260px] h-[160px] flex flex-col items-center justify-between mt-md-7 mt-3 overflow-hidden"
              style={{
                boxShadow:
                  "0px 4px 9px 0px rgba(0,0,0,0.1), 1px 17px 17px 0px rgba(0,0,0,0.09), 3px 38px 23px 0px rgba(0,0,0,0.05), 5px 67px 27px 0px rgba(0,0,0,0.01), 8px 104px 29px 0px rgba(0,0,0,0)",
              }}
            >
              {/* Semi-circle area */}
              <div className="w-[130px] h-[65px] bg-transparent rounded-full overflow-hidden flex items-center justify-center">
                {/* Icon Circle */}
                <div className="w-20 h-20 bg-[#ccb08b] rounded-full flex items-center justify-center mt-[-30px]">
                  <img src={mailRounded} alt="Email" className="w-7 h-7 mt-5" />
                </div>
              </div>

              <div className="text-center pb-6">
                <h3 className="font-semibold text-lg text-black mb-1 capitalize">
                  Email
                </h3>
                <p className="font-normal text-sm text-black">
                  cozycandlecorner13@gmail.com
                </p>
              </div>
            </div>

            {/* Phone Card */}
            <div
              className="bg-white rounded-lg w-[260px] h-[160px] flex flex-col items-center justify-between mt-md-7 mt-3 overflow-hidden"
              style={{
                boxShadow:
                  "0px 4px 9px 0px rgba(0,0,0,0.1), 1px 17px 17px 0px rgba(0,0,0,0.09), 3px 38px 23px 0px rgba(0,0,0,0.05), 5px 67px 27px 0px rgba(0,0,0,0.01), 8px 104px 29px 0px rgba(0,0,0,0)",
              }}
            >
              <div className="w-[130px] h-[65px] flex items-start justify-center">
                <div className="w-20 h-20 bg-[#ccb08b] rounded-full flex items-center justify-center mt-[-30px]">
                  <img src={call} alt="Phone" className="w-7 h-7 mt-5" />
                </div>
              </div>
              <div className="text-center pb-6">
                <h3 className="font-semibold text-lg text-black mb-1 capitalize">
                  Phone
                </h3>
                <p className="font-normal text-sm text-black">+91 8019401322</p>
              </div>
            </div>

            {/* Address Card */}
            <div
              className="bg-white rounded-lg w-[260px] h-[160px] flex flex-col items-center justify-between mt-md-7 mt-3 overflow-hidden"
              style={{
                boxShadow:
                  "0px 4px 9px 0px rgba(0,0,0,0.1), 1px 17px 17px 0px rgba(0,0,0,0.09), 3px 38px 23px 0px rgba(0,0,0,0.05), 5px 67px 27px 0px rgba(0,0,0,0.01), 8px 104px 29px 0px rgba(0,0,0,0)",
              }}
            >
              <div className="w-[130px] h-[65px] flex items-start justify-center">
                <div className="w-20 h-20 bg-[#ccb08b] rounded-full flex items-center justify-center mt-[-30px]">
                  <svg
                    className="w-7 h-7 text-white mt-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="text-center pb-6">
                <h3 className="font-semibold text-lg text-black mb-1 capitalize">
                  Address
                </h3>
                <p className="font-normal text-sm text-black">
                  Hyderabad, Gajularamaram
                </p>
              </div>
            </div>

            {/* Instagram Card */}
            <div
              className="bg-white rounded-lg w-[260px] h-[160px] flex flex-col items-center justify-between mt-md-7 mt-3 overflow-hidden"
              style={{
                boxShadow:
                  "0px 4px 9px 0px rgba(0,0,0,0.1), 1px 17px 17px 0px rgba(0,0,0,0.09), 3px 38px 23px 0px rgba(0,0,0,0.05), 5px 67px 27px 0px rgba(0,0,0,0.01), 8px 104px 29px 0px rgba(0,0,0,0)",
              }}
            >
              <div className="w-[130px] h-[65px] flex items-start justify-center">
                <div className="w-20 h-20 bg-[#ccb08b] rounded-full flex items-center justify-center mt-[-30px]">
                  <svg
                    className="w-6 h-6 text-white mt-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
              </div>
              <div className="text-center pb-6">
                <h3 className="font-semibold text-lg text-black mb-1 capitalize">
                  Instagram
                </h3>
                <p className="font-normal text-sm text-black">
                  @cozycreationscandle
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Order Request Form Section */}
      <div className="w-full flex justify-center py-14 px-4">
        <div className="bg-white border-2 border-[#3d3021] rounded-[32px] w-full max-w-[1080px] p-8 md:p-12">
          {/* Form Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-normal text-black uppercase mb-2">
              Bulk order request
            </h2>
            <p className="text-lg font-normal text-black uppercase">
              lets connect and creat something beautiful
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-xl font-medium text-black capitalize mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="enter your name"
                className="w-full h-[62px] px-4 border border-black rounded-xl text-lg text-black placeholder:text-black/80 capitalize focus:outline-none focus:ring-2 focus:ring-yellow-accent"
                required
              />
            </div>

            {/* Email and Phone Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xl font-medium text-black capitalize mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="enter your Email"
                  className="w-full h-[62px] px-4 border border-black rounded-xl text-lg text-black placeholder:text-black/80 capitalize focus:outline-none focus:ring-2 focus:ring-yellow-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-xl font-medium text-black capitalize mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="enter your phone"
                  className="w-full h-[62px] px-4 border border-black rounded-xl text-lg text-black placeholder:text-black/80 capitalize focus:outline-none focus:ring-2 focus:ring-yellow-accent"
                  required
                />
              </div>
            </div>

            {/* Collections, Product, and Quantity Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xl font-medium text-black capitalize mb-2">
                  Collections
                </label>
                <div className="relative">
                  <select
                    name="collection"
                    value={formData.collection}
                    onChange={handleChange}
                    className="w-full h-[62px] px-4 pr-10 border border-black rounded-xl text-lg text-black appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-accent bg-white"
                  >
                    <option value="">select collections</option>
                    <option value="christmas">Christmas Collection</option>
                    <option value="seasonal">Seasonal Collection</option>
                    <option value="custom">Custom Collection</option>
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
                <label className="block text-xl font-medium text-black capitalize mb-2">
                  Product
                </label>
                <div className="relative">
                  <select
                    name="product"
                    value={formData.product}
                    onChange={handleChange}
                    className="w-full h-[62px] px-4 pr-10 border border-black rounded-xl text-lg text-black appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-accent bg-white"
                  >
                    <option value="">select product</option>
                    <option value="candle-1">Candle 1</option>
                    <option value="candle-2">Candle 2</option>
                    <option value="candle-3">Candle 3</option>
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
                <label className="block text-xl font-medium text-black capitalize mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="enter quantity"
                  min="1"
                  className="w-full h-[62px] px-4 border border-black rounded-xl text-lg text-black placeholder:text-black/80 capitalize focus:outline-none focus:ring-2 focus:ring-yellow-accent"
                  required
                />
              </div>
            </div>

            {/* Customization Field */}
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
                className="w-full min-h-[140px] px-4 py-4 border border-black rounded-xl text-lg text-black placeholder:text-black/80 capitalize focus:outline-none focus:ring-2 focus:ring-yellow-accent resize-none"
              />
            </div>

            {/* Location Field */}
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
                className="w-full min-h-[140px] px-4 py-4 border border-black rounded-xl text-lg text-black placeholder:text-black/80 capitalize focus:outline-none focus:ring-2 focus:ring-yellow-accent resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full h-[62px] rounded-xl text-2xl font-bold text-black capitalize bg-yellow-500 transition-colors"
              >
                Place Order
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
