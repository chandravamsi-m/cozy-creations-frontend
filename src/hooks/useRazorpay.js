import { useEffect, useState } from 'react';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export default function useRazorpay() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if script is already present
    if (window.Razorpay) {
      setIsReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    
    script.onload = () => {
      setIsReady(true);
    };

    script.onerror = () => {
      setError(new Error('Razorpay script failed to load'));
    };

    document.body.appendChild(script);

    return () => {
      // Optional: We might not want to remove it to avoid reloading if multiple components use it,
      // but if we want strictly dynamic, we can remove it.
      // For now, let's keep it once loaded to avoid flashes.
    };
  }, []);

  return { isReady, error };
}
