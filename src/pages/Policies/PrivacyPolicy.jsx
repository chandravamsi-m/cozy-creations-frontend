import React from 'react';
import usePageSEO from '../../hooks/usePageSEO';

export default function PrivacyPolicy() {
  usePageSEO({
    title: "Privacy Policy",
    description: "Privacy Policy for Cozy Creations. Learn how we handle your data and protect your privacy.",
    path: "/privacy-policy",
  });

  return (
    <div className="max-w-5xl mx-auto px-6 py-24 text-gray-800 leading-relaxed font-montserrat">
      <h1 className="text-4xl font-bold mb-10 text-black border-b border-gray-200 pb-4">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-500 italic">Effective Date: March 20, 2026</p>
      
      <div className="space-y-10 text-base">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">1. Introduction</h2>
          <p>Welcome to <strong>Cozy Creations</strong>. This Privacy Policy describes how we collect, use, and disclose your personal information when you visit or make a purchase from <a href="https://cozycreations.in" className="text-yellow-600 underline">cozycreations.in</a>. By using our website, you agree to the collection and use of information in accordance with this policy.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">2. Information We Collect</h2>
          <p className="mb-4">When you visit the site, we collect certain information about your device, your interaction with the site, and information necessary to process your purchases. We may also collect additional information if you contact us for customer support.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Personal Info:</strong> Name, billing address, shipping address, payment information, email address, and phone number.</li>
            <li><strong>Order Info:</strong> Items purchased, order date, and transaction history.</li>
            <li><strong>Technical Info:</strong> IP address, browser type, and device information via cookies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">3. How We Use Your Information</h2>
          <p className="mb-4">We use your personal information to provide our services to you, which includes: offering products for sale, processing payments, shipping and fulfillment of your order, and keeping you up to date on new products, services, and offers.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">4. Sharing Your Information</h2>
          <p>We share your Personal Information with service providers to help us provide our services and fulfill our contracts with you. For example, we use <strong>Razorpay</strong> to process your payments safely. We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">5. Data Retention</h2>
          <p>When you place an order through the Site, we will retain your Personal Information for our records unless and until you ask us to erase this information.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-black">6. Contact Us</h2>
          <p>For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by e-mail at <span className="font-semibold underline">cozycandlecorner13@gmail.com</span> or by mail using the details provided below:</p>
          <p className="mt-4 p-4 bg-gray-50 rounded-lg">
            <strong>Cozy Creations</strong><br />
            VSR Celestial Towers, HAL Colony, Gajularamaram Main Road<br />
            Jeedimetla, Hyderabad, Telangana 500055
          </p>
        </section>
      </div>
    </div>
  );
}
