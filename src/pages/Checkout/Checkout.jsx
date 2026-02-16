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
  const { cart, clearCart } = useCart();
  const { user, idToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("online"); // 'online' or 'cod'

  // Address State
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [errors, setErrors] = useState({});

  // Redirect if cart empty or not logged in (double check)
  React.useEffect(() => {
    if (!user) {
      navigate("/cart");
    } else if (cart.length === 0 && !isOrderComplete) {
      navigate("/products");
    }
  }, [user, cart, navigate, isOrderComplete]);

  // Fetch saved addresses on mount
  React.useEffect(() => {
    const fetchSavedAddresses = async () => {
      if (user?.uid) {
        try {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);

          if (snap.exists()) {
            const data = snap.data();
            const primaryAddress = data.shippingAddress;
            const multiAddresses = data.addresses || [];

            setSavedAddresses(multiAddresses);

            // Logic to pick initial selection
            if (multiAddresses.length > 0) {
              const defaultAddr = multiAddresses.find(a => a.isDefault) || multiAddresses[0];
              setSelectedAddressId(defaultAddr.id);
              setShowManualForm(false);
            } else if (primaryAddress) {
              // Fallback for legacy data
              setAddress(primaryAddress);
              setShowManualForm(true);
            } else {
              if (user.displayName && !address.fullName) {
                setAddress((prev) => ({ ...prev, fullName: user.displayName }));
              }
              setShowManualForm(true);
            }
          }
        } catch (err) {
          console.error("Failed to fetch addresses:", err);
        }
      }
    };
    fetchSavedAddresses();
  }, [user]);

  const updateField = (field, value) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!address.fullName.trim()) newErrors.fullName = "Name is required";
    if (!address.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^\d{10}$/.test(address.phone.replace(/\D/g, "")))
      newErrors.phone = "Enter a valid 10-digit phone";
    if (!address.street.trim()) newErrors.street = "Address is required";
    if (!address.city.trim()) newErrors.city = "City is required";
    if (!address.state.trim()) newErrors.state = "State is required";
    if (!address.pincode.trim()) newErrors.pincode = "Pincode is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

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
        total: totalAmount,
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
            // Add NEW address to the array
            const newAddress = {
              ...address,
              id: Date.now().toString(),
              type: "Home", // Default for manual entry
              isDefault: savedAddresses.length === 0
            };

            await setDoc(userRef, {
              addresses: [...savedAddresses, newAddress],
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
                  // Add NEW address to the array
                  const newAddress = {
                    ...address,
                    id: Date.now().toString(),
                    type: "Home",
                    isDefault: savedAddresses.length === 0
                  };

                  await setDoc(userRef, {
                    addresses: [...savedAddresses, newAddress],
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
    <main className="w-full bg-[#FBFAF9] min-h-screen px-4 py-10 pt-24 font-montserrat">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: ADDRESS FORM */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Shipping Address</h2>
                {savedAddresses.length > 0 && (
                  <button
                    onClick={() => {
                      setShowManualForm(!showManualForm);
                      if (!showManualForm) setSelectedAddressId(null);
                      else if (savedAddresses.length > 0) setSelectedAddressId(savedAddresses[0].id);
                    }}
                    className="text-xs font-bold text-yellow-600 hover:text-yellow-700 underline"
                  >
                    {showManualForm ? "Use Saved Address" : "+ Add New Address"}
                  </button>
                )}
              </div>

              {!showManualForm && savedAddresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedAddressId === addr.id
                        ? "border-yellow-accent bg-yellow-accent/5"
                        : "border-gray-50 bg-white hover:border-gray-200"
                        }`}
                    >
                      {selectedAddressId === addr.id && (
                        <div className="absolute top-3 right-3 w-5 h-5 bg-yellow-accent rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-black text-[10px] font-black">✓</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{addr.type === "Home" ? "🏠" : "💼"}</span>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">{addr.type}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{addr.fullName}</p>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{addr.street}</p>
                      <p className="text-gray-500 text-xs">{addr.city}, {addr.state} - {addr.pincode}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      value={address.fullName}
                      onChange={(e) => updateField("fullName", e.target.value)}
                      className="w-full border p-2 rounded-lg"
                      placeholder="John Doe"
                    />
                    {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      value={address.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) updateField("phone", val);
                      }}
                      type="tel"
                      className="w-full border p-2 rounded-lg"
                      placeholder="9876543210"
                    />
                    {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address (House No, Building, Street)</label>
                    <textarea
                      value={address.street}
                      onChange={(e) => updateField("street", e.target.value)}
                      className="w-full border p-2 rounded-lg h-20 resize-none"
                      placeholder="Flat 101, Galaxy Apts..."
                    />
                    {errors.street && <p className="text-red-500 text-xs">{errors.street}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">City</label>
                    <input
                      value={address.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      className="w-full border p-2 rounded-lg"
                      placeholder="Mumbai"
                    />
                    {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">State</label>
                    <input
                      value={address.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      className="w-full border p-2 rounded-lg"
                      placeholder="Maharashtra"
                    />
                    {errors.state && <p className="text-red-500 text-xs">{errors.state}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Pin Code</label>
                    <input
                      value={address.pincode}
                      onChange={(e) => updateField("pincode", e.target.value)}
                      className="w-full border p-2 rounded-lg"
                      placeholder="400001"
                    />
                    {errors.pincode && <p className="text-red-500 text-xs">{errors.pincode}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm sticky top-28">
              <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
              <div className="max-h-60 overflow-y-auto space-y-3 mb-4 pr-1">
                {cart.map((item) => (
                  <div key={item.productId} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 bg-gray-100 rounded shrink-0 overflow-hidden">
                      <img
                        src={optimizeCloudinaryImage(item.thumbnailUrl || item.imageUrl, IMAGE_PRESETS.checkout)}
                        className="w-full h-full object-cover"
                        alt=""
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 line-clamp-1">{item.name}</p>
                      <p className="text-gray-500">
                        {item.quantity} x ₹{item.price}
                      </p>
                    </div>
                    <div className="font-medium">
                      ₹{item.quantity * item.price}
                    </div>
                  </div>
                ))}
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="mt-4 pt-4 border-t space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Payment Method</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setPaymentMethod("online")}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${paymentMethod === "online"
                      ? "border-black bg-gray-50 font-bold"
                      : "border-gray-100 opacity-60 hover:opacity-100"
                      }`}
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-lg">💳</span> Online Payment
                    </div>
                    {paymentMethod === "online" && <span className="bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                  </button>

                  <button
                    onClick={() => setPaymentMethod("cod")}
                    className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${paymentMethod === "cod"
                      ? "border-black bg-gray-50 font-bold"
                      : "border-gray-100 opacity-60 hover:opacity-100"
                      }`}
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-lg">🚚</span> Cash on Delivery
                    </div>
                    {paymentMethod === "cod" && <span className="bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">✓</span>}
                  </button>
                </div>
              </div>

              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{totalAmount}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span>₹{totalAmount}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="mt-6 w-full bg-yellow-accent hover:bg-yellow-accent/90 py-3 rounded-xl text-black font-semibold disabled:opacity-50 transition-all"
              >
                {loading ? "Processing..." : `Pay ₹${totalAmount}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {completedOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-green-100 grid place-items-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your purchase. Your order has been placed successfully.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Order ID</p>
              <p className="font-mono text-sm font-bold text-gray-900">{completedOrderId}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/products")}
                className="w-full bg-yellow-accent hover:bg-yellow-accent/90 py-3 rounded-xl text-black font-bold transition-all shadow-lg active:scale-95"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full py-3 text-gray-500 hover:text-gray-800 font-semibold transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
