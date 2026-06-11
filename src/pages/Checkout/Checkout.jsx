import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { getAuth } from "firebase/auth";
import { optimizeCloudinaryImage, IMAGE_PRESETS } from "../../utils/imageOptimization";
import { getEffectiveShipmentDimensions } from "../../utils/parseDimensions";
import {
  CheckCircle,
  Home,
  Briefcase,
  MapPin,
  PencilLine,
  Trash2,
  CreditCard,
  Truck,
  AlertTriangle,
  Loader2,
  Check,
  ArrowRight,
  ShieldCheck,
  Package,
  Leaf
} from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import AddressModal from "../../components/common/AddressModal";
import useRazorpay from "../../hooks/useRazorpay";
import { apiFetch, apiUrl } from "../../lib/api";
const MAX_ADDRESSES = 10;

export default function Checkout() {
  const navigate = useNavigate();
  const { cart, clearCart, deliveryFee, platformFee, isPlatformFeeEnabled, finalTotal, totalPrice, totalDiscountAmount, discountedTotal, setShippingOverride, itemDiscounts } = useCart();
  const { user, idToken } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("online"); // 'online' or 'cod'
  const [savingAddress, setSavingAddress] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isCodEnabled, setIsCodEnabled] = useState(true);

  // Shiprocket serviceability
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [serviceabilityInfo, setServiceabilityInfo] = useState(null);
  const [serviceabilityError, setServiceabilityError] = useState(null);
  // Admin-configured shipping markup % to cover Shiprocket surcharges not in API
  const [shippingMarkupPct, setShippingMarkupPct] = useState(0);
  const packagingBuffer = 3; // Hardcoded 3cm buffer

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const { isReady: razorpayReady } = useRazorpay();

  // Redirect if cart empty or not logged in (double check)
  React.useEffect(() => {
    if (!user) {
      navigate("/cart");
    } else if (cart.length === 0 && !isOrderComplete) {
      navigate("/products");
    }
  }, [user, cart, navigate, isOrderComplete]);

  // Reset shipping override when leaving checkout
  useEffect(() => {
    return () => setShippingOverride(null);
  }, []);

  // No longer fetching delivery settings for markup/buffer as they are hardcoded
  useEffect(() => {
    // Keeping this hook for future settings if needed, but currently empty
  }, []);


  // Check Shiprocket serviceability & get real shipping rate
  const checkServiceability = useCallback(async (pincode) => {
    if (!pincode || !user) return;
    setCheckingServiceability(true);
    setServiceabilityInfo(null);
    setServiceabilityError(null);

    // Compute total shipment dimensions and weight dynamically from each product's data
    const totals = cart.reduce((acc, item) => {
      const { weightKg, l, w, h } = getEffectiveShipmentDimensions(item);
      acc.actualWeight += weightKg;
      acc.l += l;
      acc.w = Math.max(acc.w, w);
      acc.h = Math.max(acc.h, h);
      return acc;
    }, { actualWeight: 0, l: 0, w: 0, h: 0 });

    // Use only ACTUAL cart weight for the shipping rate
    const totalWeight = Math.max(0.5, Number(totals.actualWeight.toFixed(2)));

    const isCod = paymentMethod === "cod" ? 1 : 0;

    try {
      const auth = getAuth();
      const freshToken = await auth.currentUser?.getIdToken();
      if (!freshToken) {
        throw new Error("Authentication token unavailable");
      }

      const finalL = totals.l + packagingBuffer;
      const finalW = totals.w + packagingBuffer;
      const finalH = totals.h + packagingBuffer;

      const res = await fetch(
        `${apiUrl("/shipping/check-serviceability")}?pincode=${pincode}&weight=${totalWeight}&cod=${isCod}&l=${Math.ceil(finalL)}&w=${Math.ceil(finalW)}&h=${Math.ceil(finalH)}&amount=${discountedTotal}`,
        { headers: { Authorization: `Bearer ${freshToken}` } }
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Serviceability check failed");

      // Shiprocket returns a list of available couriers
      const allCouriers = json.data?.data?.available_courier_companies || [];

      // Filter to include only Surface couriers
      const couriers = allCouriers.filter(c =>
        c.is_surface === true ||
        (c.courier_name || c.name || "").toLowerCase().includes("surface")
      );

      // Priority: XpressBees Surface → fallback to cheapest available surface courier
      const xpressbeesPartner = couriers.find(c =>
        (c.courier_name || c.name || "").toLowerCase().includes("xpressbees")
      );

      const selectedPartner = xpressbeesPartner ||
        couriers.reduce((best, c) => (Number(c.rate) < Number(best.rate) ? c : best), couriers[0]);

      if (!selectedPartner) {
        setServiceabilityInfo({ available: false, rate: null, courierName: null });
        setShippingOverride(0);
        return;
      }

      const freight = Number(selectedPartner.freight_charge || selectedPartner.rate || 0);
      const codCharges = isCod ? Number(selectedPartner.cod_charges || 0) : 0;
      const withGst = (freight + codCharges) * 1.18;
      const finalRate = Math.max(0, Math.ceil(withGst * (1 + shippingMarkupPct / 100)));

      setServiceabilityInfo({
        available: true,
        rate: finalRate,
        courierName: selectedPartner.courier_name || selectedPartner.name || null,
        courierId: selectedPartner.courier_company_id || selectedPartner.id || null,
        deliveryDays: selectedPartner.estimated_delivery_days || selectedPartner.etd || null,
      });
      setShippingOverride(finalRate);
    } catch (err) {
      console.error("Serviceability error:", err.message);
      setServiceabilityError("Could not fetch real-time rates.");
      setShippingOverride(0); // Prevent adding fallback fee
    } finally {
      setCheckingServiceability(false);
    }
  }, [cart, user, paymentMethod, setShippingOverride, discountedTotal, shippingMarkupPct]);

  // Re-check whenever selected address, payment method, OR cart contents change
  useEffect(() => {
    const addr = savedAddresses.find(a => a.id === selectedAddressId);
    if (!addr?.pincode) {
      setShippingOverride(null);
      return;
    }
    checkServiceability(addr.pincode);
  }, [selectedAddressId, paymentMethod, savedAddresses, cart]);


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
          } else if (!isOrderComplete) {
            // Proactive Onboarding: Open modal if no addresses exist
            setIsModalOpen(true);
          }
        }
      } catch (err) {
        console.error("Error fetching addresses:", err);
      }
    };
    fetchAddresses();
  }, [user, isOrderComplete]);

  // Fetch Payment Settings
  React.useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const res = await apiFetch("/settings/payment");
        if (res.ok) {
          const data = await res.json();
          if (data.payment) {
            setIsCodEnabled(data.payment.isCodEnabled);
            // If COD is disabled but somehow selected (e.g. default state), force online
            if (!data.payment.isCodEnabled && paymentMethod === "cod") {
              setPaymentMethod("online");
            }
          }
        }
      } catch (err) {
        console.error("Error fetching payment settings:", err);
      }
    };
    fetchPaymentSettings();
  }, []);

  const handleToggleForm = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEditAddress = (addr) => {
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleSaveModalAddress = async (formData) => {
    setSavingAddress(true);
    try {
      const userRef = doc(db, "users", user.uid);
      let updatedAddresses;
      const newId = editingAddress?.id || Date.now().toString();

      if (editingAddress) {
        updatedAddresses = savedAddresses.map(a =>
          a.id === editingAddress.id ? { ...a, ...formData, id: a.id } : a
        );
      } else {
        const newAddress = {
          ...formData,
          id: newId,
          isDefault: savedAddresses.length === 0
        };
        updatedAddresses = [...savedAddresses, newAddress];
      }

      await setDoc(userRef, {
        addresses: updatedAddresses,
        shippingAddress: { ...formData }
      }, { merge: true });

      setSavedAddresses(updatedAddresses);
      setSelectedAddressId(newId);
      setIsModalOpen(false);
      setEditingAddress(null);
    } catch (err) {
      console.error("Save address error:", err);
      showToast("Failed to save address.", "error");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleRemoveAddress = (id) => {
    setAddressToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmRemoveAddress = async () => {
    if (!addressToDelete) return;

    try {
      const updatedAddresses = savedAddresses.filter(a => a.id !== addressToDelete);
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { addresses: updatedAddresses }, { merge: true });
      setSavedAddresses(updatedAddresses);

      if (selectedAddressId === addressToDelete) {
        if (updatedAddresses.length > 0) {
          setSelectedAddressId(updatedAddresses[0].id);
        }
      }
    } catch (err) {
      console.error("Error removing address:", err);
      showToast("Failed to remove address.", "error");
    } finally {
      setAddressToDelete(null);
    }
  };

  const handlePlaceOrder = async () => {

    // Determine which address to use
    let finalAddress = savedAddresses.find(a => a.id === selectedAddressId);
    if (!finalAddress) {
      showToast("Please select or add a shipping address first.", "error");
      return;
    }

    const isUnserviceable = serviceabilityInfo?.available === false || !!serviceabilityError;
    if (isUnserviceable) {
      showToast("Delivery is not available to this location. Please select a different address.", "error");
      return;
    }

    if (!idToken) {
      showToast("Your session has expired. Please login again.", "error");
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
          quantity: item.quantity,
          productType: item.productType || "candle",
          customization: customizations[item.productId] || null,
          variantLabel: item.variantLabel || null,
        })),
        shippingAddress: finalAddress,
        customerName: finalAddress.fullName,
        userEmail: user.email,
      };


      // FORK: ONLINE VS COD
      if (paymentMethod === "cod") {
        const response = await apiFetch("/orders/place-cod", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(orderData),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || errData.message || "Failed to place COD order");
        }

        const { orderId } = await response.json();

        // Save address to user profile for future use
        try {
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, { shippingAddress: finalAddress }, { merge: true });
        } catch (err) {
          console.error("Failed to save address:", err);
        }

        setIsOrderComplete(true);
        clearCart();
        localStorage.removeItem("cc_cart_customizations_v1");
        setCompletedOrderId(orderId);

        return;
      }

      // ONLINE PAYMENT (RAZORPAY)
      const response = await apiFetch("/orders/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Failed to initiate payment");
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
            const verifyRes = await apiFetch("/orders/verify-payment", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                razorpay_order_id: pxResponse.razorpay_order_id,
                razorpay_payment_id: pxResponse.razorpay_payment_id,
                razorpay_signature: pxResponse.razorpay_signature,
              }),
            });

            if (verifyRes.ok) {
              const result = await verifyRes.json();
              try {
                const userRef = doc(db, "users", user.uid);
                // Just update the primary shipping address field for checkout compatibility
                await setDoc(userRef, { shippingAddress: orderData.shippingAddress }, { merge: true });
              } catch (err) {
                console.error("Failed to save address:", err);
              }

              setIsOrderComplete(true);
              clearCart();
              localStorage.removeItem("cc_cart_customizations_v1");
              setCompletedOrderId(result.orderId);

            } else {
              const errData = await verifyRes.json().catch(() => ({}));
              throw new Error(errData.error || "Payment verification failed on server");
            }
          } catch (err) {
            console.error(err);
            showToast("Payment verification failed. Please contact support if the amount was deducted.", "error");
          }
        },
        prefill: {
          name: finalAddress.fullName,
          email: user.email,
          contact: finalAddress.phone,
        },
        theme: {
          color: "#FACC15",
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        timeout: 60
      };

      if (!window.Razorpay || !razorpayReady) {
        throw new Error("Payment gateway is still loading. Please wait a moment.");
      }

      const razorpay = new window.Razorpay({
        ...options,
        modal: {
          ondismiss: () => {
            setLoading(false);
          }
        }
      });
      razorpay.open();
    } catch (err) {
      console.error("Order error:", err);
      showToast(err.message || "An error occurred while placing your order.", "error");
      setLoading(false);
    }


  };

  return (
    <main className="w-full bg-[#FBFAF9] min-h-screen font-montserrat pb-10 sm:pb-20 pt-16 md:pt-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Page Title & Back link */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-gray-900 uppercase">Checkout</h1>
          <button
            onClick={() => navigate("/cart")}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-yellow-600 hover:text-yellow-700 transition-colors group"
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
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Select Shipping Address</h2>
                {savedAddresses.length > 0 && (
                  <button
                    onClick={handleToggleForm}
                    disabled={savedAddresses.length >= MAX_ADDRESSES}
                    className={`text-[11px] font-bold transition-all hover:underline text-left xs:text-right ${savedAddresses.length >= MAX_ADDRESSES ? "text-gray-400 cursor-not-allowed" : "text-yellow-600 hover:text-yellow-700"}`}
                  >
                    + Add New Address
                  </button>
                )}
              </div>

              {savedAddresses.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`relative px-2 sm:px-3 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer group hover:shadow-md ${selectedAddressId === addr.id
                        ? "border-yellow-accent bg-[#FFFDF5]"
                        : "border-gray-50 bg-white hover:border-gray-200"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                          <div className={`shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all shadow-sm border border-gray-50 group-hover:scale-110 ${selectedAddressId === addr.id ? "bg-white text-black" : "bg-white text-gray-400"
                            }`}>
                            {addr.type === "Home" ? <Home className="w-4 h-4 sm:w-5 sm:h-5" /> : addr.type === "Office" ? <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" /> : <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] sm:text-[13px] font-bold text-gray-900 leading-tight">{addr.addressType || addr.type || "Address"}</p>
                            {addr.isDefault && <span className="text-[8px] sm:text-[9px] font-black text-yellow-600 uppercase tracking-wider block sm:inline">DEFAULT</span>}
                          </div>
                        </div>
                        <div className={`shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${selectedAddressId === addr.id ? "border-yellow-accent bg-yellow-accent" : "border-gray-200"
                          }`}>
                          {selectedAddressId === addr.id && <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-black"></div>}
                        </div>
                      </div>

                      <div className="space-y-0.5 sm:space-y-1 mb-2 sm:mb-2 ml-1">
                        <p className="text-[11px] sm:text-[12px] font-bold text-gray-900 leading-tight break-words">{addr.fullName}</p>
                        {addr.houseNo ? (
                          <>
                            <p className="text-[10px] sm:text-[12px] text-gray-500 leading-[1.2] font-medium break-words line-clamp-1">
                              {addr.houseNo}, {addr.area}
                            </p>
                            {addr.landmark && (
                              <p className="text-[9px] sm:text-[11px] text-gray-400 italic">
                                Near {addr.landmark}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] sm:text-[12px] text-gray-500 leading-[1.2] font-medium break-words line-clamp-2">
                            {addr.street}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-[12px] text-gray-500 leading-[1.2] font-medium break-words">
                          {addr.city}, {addr.state} {addr.pincode}
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 sm:gap-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditAddress(addr);
                          }}
                          className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-gray-900 hover:text-yellow-600 transition-colors"
                        >
                          <PencilLine className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAddress(addr.id);
                          }}
                          className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Del
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={handleToggleForm}
                  className="border-2 border-dashed border-gray-100 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:border-yellow-accent/50 hover:bg-gray-50/50 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 text-xl group-hover:bg-yellow-accent group-hover:text-black transition-all duration-300">
                    +
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900 mb-0.5">No addresses found</p>
                    <p className="text-xs text-gray-400 font-medium">Click here to add your first shipping address.</p>
                  </div>
                </div>
              )}
            </section>

            <hr className="border-gray-100" />

            {/* 2. PAYMENT METHOD */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Payment Method</h2>
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
                        <CreditCard className="w-5 h-5" />
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

                {isCodEnabled && (
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
                          <Truck className="w-5 h-5" />
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
                )}
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
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <p className="font-bold text-gray-900 text-sm line-clamp-1 uppercase tracking-tight">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {item.variantLabel && (
                          <span className="text-[9px] font-medium text-gray-600 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded shadow-sm">
                            Size: <span className="font-bold text-gray-900">{item.variantLabel}</span>
                          </span>
                        )}
                        {item.quantityPack && (!item.productType || item.productType === "candle") && (
                          <span className="text-[9px] font-medium text-gray-500">
                            Pack of {item.quantityPack}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-black text-gray-900 mt-1.5 flex items-center gap-2">
                        {(() => {
                          const key = item.variantLabel ? `${item.productId}_${item.variantLabel}` : item.productId;
                          const hasDiscount = itemDiscounts[key]?.hasDiscount;
                          return hasDiscount ? (
                            <>
                              <span className="text-[11px] text-gray-400 line-through font-medium">₹{(item.price || 0).toLocaleString()}</span>
                              <span>₹{(itemDiscounts[key].discountedPrice || 0).toLocaleString()}</span>
                            </>
                          ) : (
                            <span>₹{(item.price || 0).toLocaleString()}</span>
                          );
                        })()}
                        <span className="text-base font-black text-yellow-600/70">
                          × {item.quantity}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none pt-0.5">Subtotal</span>
                  <span className="text-sm font-semibold text-gray-900">₹{(totalPrice || 0).toLocaleString()}</span>
                </div>
                {totalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-green-600 uppercase tracking-widest leading-none">Discount</span>
                    <span className="text-sm font-semibold text-green-600">-₹{(totalDiscountAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-start px-1 gap-2">
                  <div className="flex-1">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none">Shipping Fee</span>

                    {!selectedAddressId && (
                      <p className="text-[10px] text-yellow-600 font-bold mt-0.5">Enter address to calculate</p>
                    )}
                    {selectedAddressId && serviceabilityInfo?.available === false && (
                      <p className="text-[10px] text-red-500 font-bold mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Delivery not available to this location
                      </p>
                    )}
                    {selectedAddressId && serviceabilityError && !checkingServiceability && (
                      <p className="text-[10px] text-red-500 font-bold mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Delivery not available to this location
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">
                    {checkingServiceability ? (
                      <span className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Calculating...
                      </span>
                    ) : !selectedAddressId ? (
                      <span className="text-gray-400">—</span>
                    ) : (serviceabilityInfo?.available === false || !!serviceabilityError) ? (
                      <span className="text-red-500 font-bold">Unavailable</span>
                    ) : deliveryFee === 0 ? (
                      <span className="text-green-600 flex items-center gap-1.5">
                        <Check className="w-3 h-3" /> FREE
                      </span>
                    ) : (
                      `₹${(deliveryFee || 0).toLocaleString()}`
                    )}
                  </span>
                </div>
                {isPlatformFeeEnabled && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-none pt-0.5">Platform Fee</span>
                    <span className="text-sm font-semibold text-gray-900">₹{(platformFee || 0).toLocaleString()}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-100 flex justify-between items-end px-1">
                  <span className="text-md font-bold text-gray-900 uppercase tracking-tight">Total</span>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 tracking-tighter leading-none">
                      ₹{((selectedAddressId ? finalTotal : (discountedTotal + platformFee)) || 0).toLocaleString()}
                    </p>
                    {checkingServiceability && (
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">Updating...</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || checkingServiceability || (selectedAddressId && (serviceabilityInfo?.available === false || !!serviceabilityError))}
                className={`group relative w-full h-12 transition-all duration-300 rounded-[1rem] overflow-hidden shadow-xl active:scale-[0.98] disabled:pointer-events-none ${
                  (selectedAddressId && (serviceabilityInfo?.available === false || !!serviceabilityError))
                    ? "bg-gray-200 text-gray-500 shadow-none cursor-not-allowed"
                    : "bg-yellow-accent hover:brightness-105 shadow-yellow-400/20 disabled:opacity-50"
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center gap-2 transition-transform">
                  <span className={`text-md font-bold uppercase tracking-wider ${(selectedAddressId && (serviceabilityInfo?.available === false || !!serviceabilityError)) ? "text-gray-500" : "text-black"}`}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : checkingServiceability ? (
                      "Calculating Shipping..."
                    ) : (selectedAddressId && (serviceabilityInfo?.available === false || !!serviceabilityError)) ? (
                      "Unserviceable Location"
                    ) : (
                      "Complete Purchase"
                    )}
                  </span>
                  {!loading && !checkingServiceability && !(selectedAddressId && (serviceabilityInfo?.available === false || !!serviceabilityError)) && (
                    <ArrowRight className="w-5 h-5 text-black transition-transform group-hover:translate-x-1" />
                  )}
                </div>
              </button>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 px-1">
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Secure</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Hand-Packed</span>
                </div>
                <div className="flex flex-col items-center text-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-gray-400" />
                  </div>
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
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 text-center animate-in fade-in zoom-in duration-500 border border-white/20">
            <div className="w-20 h-20 rounded-full bg-green-50 grid place-items-center mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full animate-ping bg-green-200 opacity-20"></div>
              <CheckCircle className="w-12 h-12 text-green-600 relative z-10" />
            </div>

            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Order Confirmed!</h2>
            <p className="text-gray-500 font-medium mb-4 leading-relaxed">
              Your artisanal treasures are being prepared. Thank you for supporting Cozy Creations.
            </p>

            <div className="bg-gray-50 rounded-2xl p-4 mb-4 ring-1 ring-black/5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Authentic Order ID</p>
              <p className="font-mono text-base font-black text-gray-900 tracking-tighter">{completedOrderId}</p>
            </div>

            <div className="space-y-3 mt-4">
              <button
                onClick={() => navigate("/my-orders")}
                className="w-full h-14 bg-yellow-accent hover:brightness-105 py-3 rounded-2xl text-black font-black transition-all shadow-lg active:scale-95 uppercase tracking-wider text-sm flex items-center justify-center gap-2"
              >
                <Package className="w-5 h-5" /> View My Orders
              </button>
              <button
                onClick={() => navigate("/products")}
                className="w-full h-12 border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 py-3 rounded-2xl text-gray-700 font-bold transition-all text-sm"
              >
                Continue Shopping →
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-[0.2em]"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal for deletion */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmRemoveAddress}
        title="Remove Address"
        message="Are you sure you want to remove this address? This action cannot be undone."
        confirmText="Remove Address"
        type="danger"
      />
      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModalAddress}
        address={editingAddress}
        loading={savingAddress}
        showTypeSelect={true}
      />
    </main>
  );
}
