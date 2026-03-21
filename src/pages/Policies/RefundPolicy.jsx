import React from 'react';
import usePageSEO from '../../hooks/usePageSEO';

export default function RefundPolicy() {
  usePageSEO({
    title: "Cancellation & Refund Policy",
    description: "Refund and Cancellation policy for Cozy Creations handcrafted candles.",
    path: "/refund-policy",
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-24 text-gray-800 leading-relaxed font-montserrat">
      <h1 className="text-4xl font-bold mb-10 text-black border-b border-gray-200 pb-4">Refund & Cancellation Policy</h1>
      <p className="mb-8 text-sm text-gray-500 italic">Effective Date: March 20, 2026</p>

      <div className="space-y-10 text-base">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">1. Cancellation Policy</h2>
          <p>Orders can only be cancelled within <strong>24 hours</strong> of placement. Since our candles are handcrafted upon order, we cannot cancel or refund an order once it has entered the production stage or has been shipped. To request a cancellation, please email us at <span className="font-semibold underline">cozycandlecorner13@gmail.com</span> or call us at <span className="font-semibold underline">8019401322</span>.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">2. Refunds for Damaged Items</h2>
          <p>We take great care in packaging our delicate candles, but if you receive a product that was damaged during transit, we are here to help. To be eligible for a replacement or refund:</p>
          <ul className="list-disc pl-6 mt-4 space-y-2">
            <li>You must report the damage within <strong>48 hours</strong> of receiving the delivery.</li>
            <li>You must provide high-quality photos and/or an unboxing video showing the damage and the original packaging.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">3. Return Process</h2>
          <p>Due to the fragile nature of wax products and floral arrangements, we generally do not accept physical returns. Once damage is verified via photos, we will approve a refund or send a replacement.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">4. Refund Timeline</h2>
          <p>Once your refund is approved, the amount will be automatically credited to your original payment method (Credit Card/Debit Card/UPI) via <strong>Razorpay</strong>. Please allow <strong>5 to 7 business days</strong> for the refund to reflect in your bank account, depending on your bank's processing time.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">5. Contact Information</h2>
          <p>For any queries related to refunds or cancellations, please reach out to us at <span className="font-semibold underline">cozycandlecorner13@gmail.com</span>.</p>
        </section>
      </div>
    </div>
  );
}
