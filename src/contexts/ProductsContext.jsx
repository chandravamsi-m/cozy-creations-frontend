// src/contexts/ProductsContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchData, endpoints } from '../services/api';

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  const loadProducts = async (forceRefresh = false) => {
    // If we have recent data and not forcing refresh, return cached data
    if (!forceRefresh && products.length > 0 && lastFetchTime) {
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      if (timeSinceLastFetch < CACHE_DURATION) {
        return products;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const json = await fetchData(endpoints.products);
      // Handle both { success: true, data: [...] } and raw array
      const data = json?.data || (Array.isArray(json) ? json : []);
      
      if (Array.isArray(data)) {
        setProducts(data);
        setLastFetchTime(Date.now());
        return data;
      } else {
        setProducts([]);
        return [];
      }
    } catch (err) {
      console.error('Failed to load products', err);
      setError(err?.message || 'Unable to load products. Please try again later.');
      setProducts([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Preload products on mount
  useEffect(() => {
    loadProducts();
  }, []);

  const value = {
    products,
    loading,
    error,
    loadProducts,
    refreshProducts: () => loadProducts(true),
  };

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
}

