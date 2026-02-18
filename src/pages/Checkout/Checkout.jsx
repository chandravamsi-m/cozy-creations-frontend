import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOrderConfirmation } from "../../api/email";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../contexts/AuthContext";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { optimizeCloudinaryImage, IMAGE_PRESETS } from "../../utils/imageOptimization";

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart, deliveryFee, finalTotal, totalPrice, totalDiscountAmount, discountedTotal } = useCart();
  const { user, idToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("online"); // 'online' or 'cod'

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [errors, setErrors] = useState({});
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);

  // Redirect if cart empty or not logged in (double check)
  React.useEffect(() => {
    if (!user) {
      navigate("/cart");
    } else if (cart.length === 0 && !isOrderComplete) {
      navigate("/products");
    }
  }, [user, cart, navigate, isOrderComplete]);

  // Fetch saved addresses
  React.useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const addresses = data.addresses || [];
          setSavedAddresses(addresses);

          // Default selection logic
          if (addresses.length > 0) {
            const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
            setSelectedAddressId(defaultAddr.id);
            setShowManualForm(false);
          } else {
            setShowManualForm(true);
          }
        } else {
          setShowManualForm(true);
        }
      } catch (err) {
        console.error("Error fetching addresses:", err);
        setShowManualForm(true);
      }
    };
    fetchAddresses();
  }, [user]);

  const updateField = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleToggleForm = () => {
    if (showManualForm) {
      // Cancel
      setShowManualForm(false);
      setEditingAddressId(null);
      setAddress({
        fullName: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
      });
      setErrors({});
      if (savedAddresses.length > 0) {
        const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
        setSelectedAddressId(defaultAddr.id);
      }
    } else {
      // Add New
      setShowManualForm(true);
      setSelectedAddressId(null);
      setEditingAddressId(null);
      setAddress({
        fullName: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
      });
      setErrors({});
    }
  };

  const handleEditAddress = (addr) => {
    setAddress({
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    });
    setErrors({});
    setEditingAddressId(addr.id);
    setShowManualForm(true);
    setSelectedAddressId(null);
  };

  const handleRemoveAddress = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this address?")) return;

    try {
      const updatedAddresses = savedAddresses.filter(a => a.id !== id);
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { addresses: updatedAddresses }, { merge: true });
      setSavedAddresses(updatedAddresses);
      if (selectedAddressId === id) {
        if (updatedAddresses.length > 0) {
          setSelectedAddressId(updatedAddresses[0].id);
        } else {
          setShowManualForm(true);
        }
      }
    } catch (err) {
      console.error("Error removing address:", err);
      alert("Failed to remove address.");
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!address.fullName.trim()) newErrors.fullName = "Required";
    if (!address.phone.trim()) newErrors.phone = "Required";
    else if (address.phone.length < 10) newErrors.phone = "Invalid phone number";
    if (!address.street.trim()) newErrors.street = "Required";
    if (!address.city.trim()) newErrors.city = "Required";
    if (!address.state.trim()) newErrors.state = "Required";
    if (!address.pincode.trim()) newErrors.pincode = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {

    // Determine which address to use
    let finalAddress = null;
    if (showManualForm) {
      if (!validate()) return;
      finalAddress = address;
    } else {
      finalAddress = savedAddresses.find(a => a.id === selectedAddressId);
      if (!finalAddress) {
        alert("Please select a shipping address.");
        return;
      }
    }

    if (!idToken) {
      alert("Session expired. Please login again.");
      return;
    }

    setLoading(true);

    try {
      // 1. Prepare Order Payload
      let customizations = {};
      try {
        const raw = localStorage.getItem("cc_cart_customizations_v1");
        if (raw) customizations = JSON.parse(raw);
      } catch (e) {
        console.error("Failed to read customizations", e);
      }

      const orderData = {
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.thumbnailUrl || item.imageUrl,
          customization: customizations[item.productId] || null,
        })),
        deliveryFee: deliveryFee,
        total: finalTotal,
        shippingAddress: finalAddress,
        customerName: finalAddress.fullName,
        userEmail: user.email,
      };


      // FORK: ONLINE VS COD
      if (paymentMethod === "cod") {
        const codUrl = `${BACKEND_URL}/orders/place-cod`;
        const response = await fetch(codUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to place COD order");
        }

        const { orderId } = await response.json();

        // Save address to user profile for future use
        try {
          const userRef = doc(db, "users", user.uid);

          if (showManualForm) {
            let updatedAddresses;
            if (editingAddressId) {
              // Update EXISTING address
              updatedAddresses = savedAddresses.map(a =>
                a.id === editingAddressId ? { ...address, id: a.id, type: a.type, isDefault: a.isDefault } : a
              );
            } else {
              // Add NEW address
              const newAddress = {
                ...address,
                id: Date.now().toString(),
                type: "Home",
                isDefault: savedAddresses.length === 0
              };
              updatedAddresses = [...savedAddresses, newAddress];
            }

            await setDoc(userRef, {
              addresses: updatedAddresses,
              shippingAddress: address
            }, { merge: true });
          } else {
            // Just update the primary shipping address field for checkout compatibility
            await setDoc(userRef, { shippingAddress: finalAddress }, { merge: true });
          }
        } catch (err) {
          console.error("Failed to save address:", err);
        }

        setIsOrderComplete(true);
        clearCart();
        localStorage.removeItem("cc_cart_customizations_v1");
        setCompletedOrderId(orderId);

        // Send Order Confirmation Email (Non-blocking)
        sendOrderConfirmation(user.email, {
          orderId,
          items: orderData.items,
          total: orderData.total,
          customerName: orderData.customerName, // Fix: Include name for personalization
          paymentMethod: "cod",
          shippingAddress: orderData.shippingAddress
        });
        return;
      }

      // ONLINE PAYMENT (RAZORPAY)
      const paymentUrl = `${BACKEND_URL}/orders/create-payment`;
      const response = await fetch(paymentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to initiate payment");
      }

      const { orderId, amount, currency, key } = await response.json();

      if (!orderId) throw new Error("Invalid server response");

      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "Cozy Creations",
        description: `Payment for Order #${orderId}`,
        order_id: orderId,
        handler: async function (pxResponse) {
          try {
            const verifyUrl = `${BACKEND_URL}/orders/verify-payment`;
            const verifyRes = await fetch(verifyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: pxResponse.razorpay_order_id,
                razorpay_payment_id: pxResponse.razorpay_payment_id,
                razorpay_signature: pxResponse.razorpay_signature,
                orderData: orderData,
              }),
            });

            if (verifyRes.ok) {
              const result = await verifyRes.json();
              try {
                const userRef = doc(db, "users", user.uid);

                if (showManualForm) {
                  let updatedAddresses;
                  if (editingAddressId) {
                    updatedAddresses = savedAddresses.map(a =>
                      a.id === editingAddressId ? { ...address, id: a.id, type: a.type, isDefault: a.isDefault } : a
                    );
                  } else {
                    const newAddress = {
                      ...address,
                      id: Date.now().toString(),
                      type: "Home",
                      isDefault: savedAddresses.length === 0
                    };
                    updatedAddresses = [...savedAddresses, newAddress];
                  }

                  await setDoc(userRef, {
                    addresses: updatedAddresses,
                    shippingAddress: address
                  }, { merge: true });
                } else {
                  // Just update the primary shipping address field for checkout compatibility
                  await setDoc(userRef, { shippingAddress: orderData.shippingAddress }, { merge: true });
                }
              } catch (err) {
                console.error("Failed to save address:", err);
              }

              setIsOrderComplete(true);
              clearCart();
              localStorage.removeItem("cc_cart_customizations_v1");
              setCompletedOrderId(result.orderId);

              // Send Order Confirmation Email (Non-blocking)
              sendOrderConfirmation(user.email, {
                orderId: result.orderId,
                items: orderData.items,
                total: orderData.total,
                customerName: orderData.customerName, // Fix: Include name for personalization
                paymentMethod: "online",
                shippingAddress: orderData.shippingAddress
              });
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (err) {
            console.error(err);
            alert("Payment verification failed. Contact support.");
          }
        },
        prefill: {
          name: address.fullName,
          email: user.email,
          contact: address.phone,
        },
        theme: {
          color: "#FACC15",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error("Order error:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full bg-[#FBFAF9] min-h-screen font-montserrat pb-20 pt-16 md:pt-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Title & Back link */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-900 uppercase">Checkout</h1>
          <button
            onClick={() => navigate("/cart")}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform font-black">←</span>
            BACK TO CART
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-12">
          {/* LEFT COLUMN: DETAILS (8/12) */}
          <div className="lg:col-span-8 space-y-4 animate-fadeIn">

            {/* 1. SHIPPING ADDRESS */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Select Shipping Address</h2>
                </div>
                {savedAddresses.length > 0 && (
                  <button
                    onClick={handleToggleForm}
                    className={`text-xs font-bold transition-all hover:underline ${showManualForm ? "text-red-600" : "text-yellow-600"
                      }`}
                  >
                    {showManualForm ? "Cancel" : "+ Add New Address"}
                  </button>
                )}
              </div>

              {!showManualForm && savedAddresses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-md ${selectedAddressId === addr.id
                        ? "border-yellow-accent bg-yellow-accent/[0.03]"
                        : "border-gray-100 bg-white hover:border-gray-300"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${selectedAddressId === addr.id ? "bg-yellow-accent text-black" : "bg-gray-50 text-gray-400 group-hover:bg-gray-100"
                            }`}>
                            {addr.type === "Home" ? "🏠" : "💼"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{addr.type || "Address"}</p>
                            {addr.isDefault && <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-tighter">Default</span>}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedAddressId === addr.id ? "border-yellow-accent bg-yellow-accent" : "border-gray-200"
                          }`}>
                          {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-black"></div>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-900">{addr.fullName}</p>
                        <p className="text-xs text-gray-500 leading-relaxed font-medium">
                          {addr.street}<br />
                          {addr.city}, {addr.state} {addr.pincode}<br />
                          India
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAddress(addr);
                          }}
                          className="text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleRemoveAddress(e, addr.id)}
                          className="text-[11px] font-bold text-gray-400 hover:text-red-600 transition-colors uppercase tracking-widest"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm ring-1 ring-black/5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{editingAddressId ? "Edit Address" : "New Shipping Address"}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                      <input
                        value={address.fullName}
                        onChange={(e) => updateField("fullName", e.target.value)}
                        className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-accent/40 transition-all ${errors.fullName ? "border-red-300" : "border-gray-200 focus:border-yellow-accent"}`}
                        placeholder="John Doe"
                      />
                      {errors.fullName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.fullName}</p>}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        value={address.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val.length <= 10) updateField("phone", val);
                        }}
                        type="tel"
                        className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-accent/40 transition-all ${errors.phone ? "border-red-300" : "border-gray-200 focus:border-yellow-accent"}`}
                        placeholder="9876543210"
                      />
                      {errors.phone && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.phone}</p>}
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Street Address</label>
                      <textarea
                        value={address.street}
                        onChange={(e) => updateField("street", e.target.value)}
                        className={`w-full h-24 bg-gray-50 border rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-accent/40 transition-all resize-none ${errors.street ? "border-red-300" : "border-gray-200 focus:border-yellow-accent"}`}
                        placeholder="Flat No, Building, Area"
                      />
                      {errors.street && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.street}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">City</label>
                      <input
                        value={address.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-accent/40 transition-all ${errors.city ? "border-red-300" : "border-gray-200 focus:border-yellow-accent"}`}
                        placeholder="Mumbai"
                      />
                      {errors.city && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.city}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Pin Code</label>
                      <input
                        value={address.pincode}
                        onChange={(e) => updateField("pincode", e.target.value)}
                        className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-accent/40 transition-all ${errors.pincode ? "border-red-300" : "border-gray-200 focus:border-yellow-accent"}`}
                        placeholder="400001"
                      />
                      {errors.pincode && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.pincode}</p>}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <hr className="border-gray-100" />

            {/* 2. PAYMENT METHOD */}
            <section className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setPaymentMethod("online")}
                  className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-md ${paymentMethod === "online"
                    ? "border-yellow-accent bg-yellow-accent/[0.03]"
                    : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${paymentMethod === "online" ? "bg-yellow-accent text-black" : "bg-gray-50 text-gray-400"
                        }`}>
                        💳
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          Online Payment
                          {/* <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Razorpay</span> */}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Instant Confirmation</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === "online" ? "border-yellow-accent bg-yellow-accent" : "border-gray-200"
                      }`}>
                      {paymentMethod === "online" && <div className="w-2 h-2 rounded-full bg-black"></div>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Secure payment via Cards, UPI, Netbanking or Wallets. Easy and fast.
                  </p>
                </div>

                <div
                  onClick={() => setPaymentMethod("cod")}
                  className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-md ${paymentMethod === "cod"
                    ? "border-yellow-accent bg-yellow-accent/[0.03]"
                    : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${paymentMethod === "cod" ? "bg-yellow-accent text-black" : "bg-gray-50 text-gray-400"
                        }`}>
                        🚚
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Cash on Delivery (COD)</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Pay at Doorstep</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === "cod" ? "border-yellow-accent bg-yellow-accent" : "border-gray-200"
                      }`}>
                      {paymentMethod === "cod" && <div className="w-2 h-2 rounded-full bg-black"></div>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">
                    Pay with cash when your order arrives at your doorstep.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: ORDER SUMMARY (4/12) */}
          <aside className="lg:col-span-4">
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-4 shadow-2xl shadow-black/5 sticky top-28 space-y-4 animate-fadeInRight">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Order Summary</h2>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.productId} className="flex gap-4 group">
                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl shrink-0 overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow">
                      <img
                        src={optimizeCloudinaryImage(item.thumbnailUrl || item.imageUrl, IMAGE_PRESETS.checkout)}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt={item.name}
                        loading="lazy"
                      />
                      <div className="absolute top-1 right-1 bg-black text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <p className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-yellow-600 transition-colors uppercase tracking-tight">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        Cozy Minimalist
                      </p>
                      <p className="text-sm font-black text-gray-900 mt-2">
                        ₹{item.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none pt-0.5">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">₹{totalPrice.toLocaleString()}</span>
                </div>
                {totalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-green-600 uppercase tracking-widest leading-none">Discount</span>
                    <span className="text-sm font-semibold text-green-600">-₹{totalDiscountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Shipping</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {deliveryFee === 0 ? (
                      <span className="text-green-600 flex items-center gap-1.5">
                        <span className="text-[10px]">✓</span> FREE
                      </span>
                    ) : (
                      `₹${deliveryFee.toLocaleString()}`
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-between items-end px-1">
                  <span className="text-md font-bold text-gray-900 uppercase tracking-tight">Total</span>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 tracking-tighter leading-none">
                      ₹{finalTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="group relative w-full h-14 bg-yellow-accent hover:bg-black transition-all duration-300 rounded-[1rem] overflow-hidden shadow-xl shadow-yellow-400/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <div className="absolute inset-0 flex items-center justify-center gap-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                  <span className="text-md font-bold text-black group-hover:text-white uppercase tracking-wider">
                    {loading ? "Processing..." : "Complete Purchase"}
                  </span>
                  {!loading && <span className="text-black group-hover:text-white transition-colors">→</span>}
                </div>
              </button>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 px-1">
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-lg">🛡️</div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Secure</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-lg">📦</div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Hand-Packed</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-lg">🍃</div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Eco-Friendly</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {completedOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 text-center animate-in fade-in zoom-in duration-500 border border-white/20">
            <div className="w-24 h-24 rounded-full bg-green-50 grid place-items-center mx-auto mb-8 relative">
              <div className="absolute inset-0 rounded-full animate-ping bg-green-200 opacity-20"></div>
              <svg className="w-12 h-12 text-green-600 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Order Confirmed!</h2>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">
              Your artisanal treasures are being prepared. Thank you for supporting Cozy Creations.
            </p>

            <div className="bg-gray-50 rounded-2xl p-5 mb-10 ring-1 ring-black/5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Authentic Order ID</p>
              <p className="font-mono text-base font-black text-gray-900 tracking-tighter">{completedOrderId}</p>
            </div>

            <div className="space-y-4 mt-4">
              <button
                onClick={() => navigate("/products")}
                className="w-full h-14 bg-yellow-accent hover:bg-black py-3 rounded-2xl text-black hover:text-white font-black transition-all shadow-lg active:scale-95 uppercase tracking-wider text-sm"
              >
                Explore More Items
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-[0.2em]"
              >
                Back to Sanctuary
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
