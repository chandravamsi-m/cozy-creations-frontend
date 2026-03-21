import React from 'react';
import usePageSEO from '../../hooks/usePageSEO';

export default function ShippingPolicy() {
  usePageSEO({
    title: "Shipping & Delivery Policy",
    description: "Shipping and Delivery information for Cozy Creations.",
    path: "/shipping-policy",
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-24 text-gray-800 leading-relaxed font-montserrat">
      <h1 className="text-4xl font-bold mb-10 text-black border-b border-gray-200 pb-4">Shipping & Delivery Policy</h1>
      <p className="mb-8 text-sm text-gray-500 italic">Effective Date: March 20, 2026</p>

      <div className="space-y-10 text-base">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">1. Processing Time</h2>
          <p>Every Cozy Creations candle is handcrafted with care. Please allow <strong>2 to 4 business days</strong> for us to prepare and package your order. During peak holiday seasons or for large bulk orders, processing may take up to 7 business days.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">2. Shipping Timelines</h2>
          <p>We ship our products across India. Once your order has been processed and picked up by our courier partner, you can expect delivery within the following timeframes:</p>
          <ul className="list-disc pl-6 pt-4 space-y-2">
            <li><strong>Hyderabad & Telangana:</strong> 1 - 3 business days.</li>
            <li><strong>Major Indian Metros (Bangalore, Mumbai, Delhi, etc.):</strong> 3 - 5 business days.</li>
            <li><strong>Rest of India:</strong> 5 - 9 business days.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">3. Shipping Charges</h2>
          <p>Shipping charges are calculated based on the weight of the items and the destination. You will see the final shipping cost at checkout before you complete the payment.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">4. Order Tracking</h2>
          <p>Once your order has been dispatched, we will send you an email and/or SMS with your Tracking ID and the name of the courier partner. You can track your package directly on the courier's website.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">5. Non-Delivery</h2>
          <p>If our courier partner is unable to deliver the package after multiple attempts due to an incorrect address or the recipient being unavailable, the package will be returned to us. In such cases, a reshipping fee will be charged to the customer for the second delivery attempt.</p>
        </section>
      </div>
    </div>
  );
}
