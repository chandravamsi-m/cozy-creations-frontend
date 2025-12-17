import React, { useState, useRef } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
// Hero images - will be downloaded from Figma
// Uncomment these when images are available:
import customHeroBg from '../../assets/images/custom-hero-bg.png';
// import customHeroOverlay from '../../assets/images/custom-hero-overlay.png';

export default function Custom() {
  const [menuOpen, setMenuOpen] = useState(false);
  const stickyNavRef = useRef(null);

  // Customization state
  const [step, setStep] = useState(1);
  const [selectedShape, setSelectedShape] = useState('classic-jar');
  const [selectedColor, setSelectedColor] = useState('cream');
  const [selectedFragrance, setSelectedFragrance] = useState('madagascan-vanilla');
  const [selectedPackaging, setSelectedPackaging] = useState('kraft');
  const [orderType, setOrderType] = useState('personal');
  const [quantity, setQuantity] = useState(1);

  // Shape options
  const shapes = [
    { id: 'classic-jar', name: 'Classic Jar', image: '📦' },
    { id: 'pillar', name: 'Pillar', image: '🕯️' },
    { id: 'bubble-cube', name: 'Bubble Cube', image: '🧊' },
    { id: 'twist-taper', name: 'Twist Taper', image: '🕯️' },
    { id: 'heart-shape', name: 'Heart Shape', image: '❤️' },
    { id: 'votive-glass', name: 'Votive Glass', image: '🕯️' },
  ];

  // Color options
  const colors = [
    { id: 'cream', name: 'Cream', value: '#F5E6D3' },
    { id: 'white', name: 'White', value: '#FFFFFF' },
    { id: 'pink', name: 'Pink', value: '#FFB6C1' },
    { id: 'green', name: 'Green', value: '#90EE90' },
    { id: 'blue', name: 'Blue', value: '#87CEEB' },
    { id: 'black', name: 'Black', value: '#2C2C2C' },
    { id: 'yellow', name: 'Yellow', value: '#FFD700' },
  ];

  // Fragrance options
  const fragrances = [
    {
      id: 'madagascan-vanilla',
      name: 'Madagascan Vanilla Bean',
      strength: 4,
      notes: 'Sweet, Creamy, Warm',
    },
    {
      id: 'lavender',
      name: 'Lavender Fields',
      strength: 3,
      notes: 'Calming, Floral, Fresh',
    },
    {
      id: 'ocean-breeze',
      name: 'Ocean Breeze',
      strength: 5,
      notes: 'Fresh, Clean, Aquatic',
    },
  ];

  // Packaging options
  const packagingOptions = [
    { id: 'kraft', name: 'Eco Kraft', price: 0, label: 'Included' },
    { id: 'floral-wrap', name: 'Floral Wrap', price: 2.5, label: '+$2.50' },
    { id: 'satin-ribbon', name: 'Satin Ribbon', price: 4.0, label: '+$4.00' },
    { id: 'premium', name: 'Premium I', price: 6.0, label: '+$6.00' },
  ];

  // Special occasion options
  const occasions = [
    { id: 'wedding', name: 'Wedding Favors', icon: '💍' },
    { id: 'corporate', name: 'Corporate Gifting', icon: '💼' },
    { id: 'festival', name: 'Festival Boxes', icon: '🎉' },
    { id: 'personalized', name: 'Personalized Labels', icon: '🏷️' },
  ];

  // Price calculation
  const basePrice = orderType === 'bulk' ? 24 : 32;
  const packagingPrice = packagingOptions.find((p) => p.id === selectedPackaging)?.price || 0;
  const totalPrice = (basePrice + packagingPrice) * quantity;
  const originalPrice = orderType === 'bulk' ? 32 : 32;

  const selectedFragranceData = fragrances.find((f) => f.id === selectedFragrance) || fragrances[0];
  const selectedShapeData = shapes.find((s) => s.id === selectedShape) || shapes[0];

  return (
    <div className="w-full bg-white font-montserrat min-h-screen">
      {/* Navbar */}
      <Navbar stickyNavRef={stickyNavRef} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      {/* Add padding top to account for fixed navbar */}
      <div className="pt-0">
        {/* Hero Section - Custom Candle Design */}
        <section className="relative w-full h-screen overflow-hidden">
          {/* Background Images */}
          <div className="absolute inset-0">
            <img 
              src={customHeroBg} 
              alt="Custom Background" 
              className="w-full h-full object-cover object-right sm:object-center"
            />
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay image - uncomment when available */}
            {/* <img 
              src={customHeroOverlay}   
              alt="Custom Overlay" 
              className="w-full h-full object-cover opacity-90"
            /> */}
            <div className="absolute inset-0 bg-black/40"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-screen flex flex-col justify-center items-center text-center px-2 pt-20 sm:pt-12 sm:px-4 md:px-[150px]">
            <h1 className="text-white text-2xl sm:text-4xl md:text-5xl font-normal uppercase mb-4 sm:mb-6 leading-tight sm:leading-snug md:leading-[1.15]">
              craft your <br />
              warmth
            </h1>
            <p className="text-white text-xs sm:text-sm md:text-base leading-5 max-w-full sm:max-w-[543px] capitalize">
            Design a candle that speaks to your soul. Choose your shape, scent, and style.
            </p>
          </div>
        </section>

        {/* Customization Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12">
            {/* Left Panel - Customization Options */}
            <div className="w-full lg:w-1/2 space-y-8">
              {/* Header */}
              <div>
                <p className="text-xs uppercase text-gray-500 mb-2">CUSTOMIZER TOOL</p>
                <h1 className="text-3xl md:text-4xl font-semibold text-black mb-2">
                  Design Your Signature Candle
                </h1>
                <p className="text-sm text-gray-600">
                  Step {step} of 4: Create your perfect ambiance.
                </p>
              </div>

              {/* Step 1: Select Shape */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-semibold text-black">
                    1
                  </div>
                  <h2 className="text-lg font-semibold text-black">Select Shape</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {shapes.map((shape) => (
                    <button
                      key={shape.id}
                      onClick={() => {
                        setSelectedShape(shape.id);
                        setStep(1);
                      }}
                      className={`p-3 sm:p-4 border-2 rounded-lg transition-all ${
                        selectedShape === shape.id
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-3xl sm:text-4xl mb-2">{shape.image}</div>
                      <p className="text-xs text-center text-black">{shape.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Choose Wax Color */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-semibold text-black">
                    2
                  </div>
                  <h2 className="text-lg font-semibold text-black">Choose Wax Color</h2>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => {
                        setSelectedColor(color.id);
                        setStep(2);
                      }}
                      className={`w-12 h-12 rounded-full border-2 transition-all ${
                        selectedColor === color.id
                          ? 'border-yellow-400 scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Step 3: Fragrance Profile */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-semibold text-black">
                    3
                  </div>
                  <h2 className="text-lg font-semibold text-black">Fragrance Profile</h2>
                </div>
                <select
                  value={selectedFragrance}
                  onChange={(e) => {
                    setSelectedFragrance(e.target.value);
                    setStep(3);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-yellow-400"
                >
                  {fragrances.map((fragrance) => (
                    <option key={fragrance.id} value={fragrance.id}>
                      {fragrance.name}
                    </option>
                  ))}
                </select>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-medium text-black mb-1">Scent Strength</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-2 flex-1 rounded ${
                            level <= selectedFragranceData.strength
                              ? 'bg-yellow-400'
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black mb-1">Notes</p>
                    <p className="text-sm text-gray-600">{selectedFragranceData.notes}</p>
                  </div>
                </div>
              </div>

              {/* Step 4: Packaging Style */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-semibold text-black">
                    4
                  </div>
                  <h2 className="text-lg font-semibold text-black">Packaging Style</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {packagingOptions.map((packaging) => (
                    <button
                      key={packaging.id}
                      onClick={() => {
                        setSelectedPackaging(packaging.id);
                        setStep(4);
                      }}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedPackaging === packaging.id
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-20 bg-gray-200 rounded mb-2 flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                      <p className="text-sm font-medium text-black">{packaging.name}</p>
                      <p className="text-xs text-gray-600">{packaging.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Type */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-black mb-1">Order Type</h2>
                  <p className="text-sm text-gray-600">Bulk orders receive special pricing.</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setOrderType('personal')}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      orderType === 'personal'
                        ? 'border-yellow-400 bg-yellow-400 text-black font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    onClick={() => setOrderType('bulk')}
                    className={`flex-1 px-6 py-3 rounded-lg border-2 transition-all ${
                      orderType === 'bulk'
                        ? 'border-yellow-400 bg-yellow-400 text-black font-semibold'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Bulk (10+)
                  </button>
                </div>
              </div>

              {/* Special Occasion */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-black">Special Occasion?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {occasions.map((occasion) => (
                    <button
                      key={occasion.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all text-left"
                    >
                      <div className="text-2xl mb-2">{occasion.icon}</div>
                      <p className="text-sm text-black">{occasion.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Preview & Summary */}
            <div className="w-full lg:w-1/2">
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Product Preview */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="w-full h-64 md:h-80 bg-white rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    <div className="text-6xl">{selectedShapeData.image}</div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="px-3 py-1 bg-gray-200 rounded">
                      <span className="font-semibold">SHAPE</span> {selectedShapeData.name}
                    </div>
                    <div className="px-3 py-1 bg-gray-200 rounded">
                      <span className="font-semibold">SCENT</span>{' '}
                      {selectedFragranceData.name.split(' ')[selectedFragranceData.name.split(' ').length - 1]}
                    </div>
                  </div>
                </div>

                {/* Your Creation Section */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-6 space-y-4">
                  <h2 className="text-xl font-semibold text-black">Your Creation</h2>
                  <p className="text-sm text-gray-600">Arrives by Wed, Oct 25</p>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-black">${totalPrice.toFixed(2)}</span>
                      {orderType === 'bulk' && (
                        <span className="text-lg text-gray-400 line-through">${(originalPrice * quantity).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base Price</span>
                      <span className="text-black font-medium">${basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Color ({colors.find((c) => c.id === selectedColor)?.name})</span>
                      <span className="text-gray-600">Included</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Packaging ({packagingOptions.find((p) => p.id === selectedPackaging)?.name})
                      </span>
                      <span className="text-gray-600">
                        {selectedPackaging === 'kraft' ? 'Included' : `$${packagingPrice.toFixed(2)}`}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between pt-4 border-t-2 border-gray-300">
                    <span className="text-lg font-semibold text-black">Total</span>
                    <span className="text-lg font-bold text-black">${totalPrice.toFixed(2)}</span>
                  </div>

                  {/* Quantity Selector */}
                  <div className="flex items-center gap-4 pt-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border-2 border-gray-200 rounded-lg flex items-center justify-center hover:border-gray-300 transition-colors"
                    >
                      −
                    </button>
                    <span className="text-lg font-semibold text-black min-w-[2rem] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border-2 border-gray-200 rounded-lg flex items-center justify-center hover:border-gray-300 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                    Add to Cart →
                  </button>

                  {/* Product Badges */}
                  <div className="flex gap-2 pt-4">
                    <span className="px-3 py-1 bg-gray-100 text-xs text-gray-700 rounded">Eco-Friendly Wax</span>
                    <span className="px-3 py-1 bg-gray-100 text-xs text-gray-700 rounded">Hand Poured</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      
    </div>
  );
}
