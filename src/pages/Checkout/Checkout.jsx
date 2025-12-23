import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../contexts/AuthContext";
import { BACKEND_URL } from "../../config/backend";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user, idToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);

  // Address State
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
  // Redirect if cart empty or not logged in (double check)
  React.useEffect(() => {
    if (!user) {
      navigate("/cart"); // Go back if no user (should rely on Cart's check, but safety net)
    } else if (cart.length === 0 && !isOrderComplete) {
      navigate("/products");
    }
  }, [user, cart, navigate, isOrderComplete]);

  // Pre-fill name if available
  // Fetch saved address on mount
  React.useEffect(() => {
    const fetchSavedAddress = async () => {
      if (user?.email) {
        try {
          const emailDocId = user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
          const userRef = doc(db, "users", emailDocId);
          const snap = await getDoc(userRef);
          
          if (snap.exists() && snap.data().shippingAddress) {
            setAddress(snap.data().shippingAddress);
          } else if (user.displayName && !address.fullName) {
            setAddress((prev) => ({ ...prev, fullName: user.displayName }));
          }
        } catch (err) {
          console.error("Failed to fetch address:", err);
        }
      }
    };
    fetchSavedAddress();
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
    if (!validate()) return;
    if (!idToken) {
      alert("Session expired. Please login again.");
      return;
    }

    setLoading(true);

    try {
      // 1. Prepare Order Payload
      // We retrieve customizations from localStorage just like Cart does
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
          quantity: item.quantity,
          customization: customizations[item.productId] || null,
        })),
        total: totalAmount,
        shippingAddress: address, // NEW FIELD
      };

      // 2. Create Razorpay Order
      const baseUrl = (BACKEND_URL || "").replace(/\/api$/, "");
      const paymentUrl = `${baseUrl}/api/orders/create-payment`;

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

      // 3. Open Razorpay
      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "Cozy Creations",
        description: `Payment for Order #${orderId}`,
        order_id: orderId,
        handler: async function (pxResponse) {
          // 4. Verify Payment
          try {
            const verifyUrl = `${baseUrl}/api/orders/verify-payment`;
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
              
              // Save address for future (User Profile)
              try {
                const emailDocId = user.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
                const userRef = doc(db, "users", emailDocId);
                await setDoc(userRef, { shippingAddress: address }, { merge: true });
              } catch (err) {
                console.error("Failed to save address:", err);
              }



              setIsOrderComplete(true);
              clearCart();
              localStorage.removeItem("cc_cart_customizations_v1");
              navigate("/order-success", { state: { orderId: result.orderId } });
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
              <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        src={item.thumbnailUrl || item.imageUrl}
                        className="w-full h-full object-cover"
                        alt=""
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

              <div className="border-t pt-4 space-y-2">
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
    </main>
  );
}
