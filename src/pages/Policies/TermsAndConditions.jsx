import React from 'react';
import usePageSEO from '../../hooks/usePageSEO';

export default function TermsAndConditions() {
  usePageSEO({
    title: "Terms & Conditions",
    description: "Terms and Conditions for shopping at Cozy Creations.",
    path: "/terms-and-conditions",
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-24 text-gray-800 leading-relaxed font-montserrat">
      <h1 className="text-4xl font-bold mb-10 text-black border-b border-gray-200 pb-4">Terms & Conditions</h1>
      <p className="mb-8 text-sm text-gray-500 italic">Effective Date: March 20, 2026</p>

      <div className="space-y-10 text-base">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">1. Overview</h2>
          <p>This website is operated by <strong>Cozy Creations</strong>. Throughout the site, the terms “we”, “us” and “our” refer to Cozy Creations. By visiting our site and/or purchasing something from us, you engage in our “Service” and agree to be bound by the following terms and conditions.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">2. Online Store Terms</h2>
          <p>By agreeing to these Terms of Service, you represent that you are at least the age of majority in your state or province of residence. You may not use our products for any illegal or unauthorized purpose.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">3. Accuracy of Products</h2>
          <p>Our candles are handcrafted with natural materials like soy or gel wax and real dried flowers. Because of the artisanal nature of our products, minor variations in appearance, color, and texture are to be expected and are not considered defects.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">4. Modifications to the Service and Prices</h2>
          <p>Prices for our products are subject to change without notice. We reserve the right at any time to modify or discontinue the Service (or any part or content thereof) without notice at any time.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">5. Billing and Account Information</h2>
          <p>We reserve the right to refuse any order you place with us. You agree to provide current, complete, and accurate purchase and account information for all purchases made at our store. Payments are securely handled through the <strong>Razorpay</strong> gateway.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">6. Governing Law</h2>
          <p>These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India, with jurisdiction in <strong>Hyderabad, India</strong>.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">7. Contact Information</h2>
          <p>Questions about the Terms of Service should be sent to us at <span className="font-semibold underline">cozycandlecorner13@gmail.com</span>.</p>
        </section>
      </div>
    </div>
  );
}
