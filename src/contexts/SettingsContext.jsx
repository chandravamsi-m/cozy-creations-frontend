import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

const CACHE_KEY = 'cozy_public_settings';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          return data;
        }
      } catch (e) {
        console.warn("Failed to parse cached settings", e);
      }
    }
    return {
      delivery: { isActive: false, amount: 0, freeDeliveryThreshold: 0 },
      payment: { isCodEnabled: true, isPlatformFeeEnabled: false, platformFee: 0 },
      offer: { isActive: false }
    };
  });

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/settings/public`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.warn("Public settings fetch failed:", err.message);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
