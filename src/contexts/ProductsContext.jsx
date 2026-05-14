import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchFirestoreProducts } from "../hooks/useProductsFirestore";
import { generateCatalogue, generateBulkCatalogue, getCatalogueStatus } from "../api/adminProducts";

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache (in-memory) using a Ref to avoid unstable function dependencies
  const cacheRef = React.useRef({
    all: null,
    categories: {},
    adminAll: null // New: Cache for admin view (includeInactive=true)
  });

  // Global Catalogue State
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueProgress, setCatalogueProgress] = useState(0);
  const [catalogueStatusText, setCatalogueStatusText] = useState("");
  const [catalogueType, setCatalogueType] = useState(null); // 'normal' | 'bulk'

  const loadProducts = useCallback(
    async (category = "", silent = false, includeInactive = false, force = false) => {
      try {
        const cache = cacheRef.current;
        
        // 1. Cache handling
        if (!force && !silent) {
          // If admin mode and we have admin cache
          if (includeInactive && !category && cache.adminAll) {
            setProducts(cache.adminAll);
            return cache.adminAll;
          }
          
          // If user mode and we have user cache
          if (!includeInactive) {
            if (category && cache.categories[category]) {
              setProducts(cache.categories[category]);
              return cache.categories[category];
            }
            if (!category && cache.all) {
              setProducts(cache.all);
              return cache.all;
            }
          }
        }

        // Only show loading if we don't have data yet
        const hasData = includeInactive ? !!cache.adminAll : (category ? !!cache.categories[category] : !!cache.all);
        if (!silent && !hasData) setLoading(true);
        setError(null);

        // 2. Fetch from Firestore
        const result = await fetchFirestoreProducts(category, includeInactive);

        // 3. Update State and Cache
        if (includeInactive && !category) {
          setProducts(result);
          cacheRef.current.adminAll = result;
        } else if (!includeInactive) {
          setProducts(result);
          cacheRef.current = {
            ...cacheRef.current,
            all: category === "" ? result : cacheRef.current.all,
            categories: {
              ...cacheRef.current.categories,
              ...(category && { [category]: result }),
            },
          };
        }

        return result;
      } catch (err) {
        console.error("Product Load Error:", err);
        setError("Failed to load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const startCatalogueGeneration = useCallback(async (type, idToken, showToast) => {
    if (catalogueLoading) return;
    
    setCatalogueLoading(true);
    setCatalogueType(type);
    setCatalogueProgress(0);
    setCatalogueStatusText("Starting...");
    
    let statusInterval;
    try {
      // 1. Polling Phase
      statusInterval = setInterval(async () => {
        try {
          const status = await getCatalogueStatus(idToken);
          if (status) {
            setCatalogueProgress(Math.round(status.progress * 0.9));
            setCatalogueStatusText(status.currentAction);
          }
        } catch (pollErr) {
          console.warn("Status poll error:", pollErr);
        }
      }, 800);

      // 2. Generation & Download Phase
      const generator = type === 'bulk' ? generateBulkCatalogue : generateCatalogue;
      const blob = await generator(idToken, (p) => {
        if (statusInterval) {
          clearInterval(statusInterval);
          statusInterval = null;
        }
        setCatalogueProgress(90 + Math.round(p * 0.1));
        setCatalogueStatusText("Downloading...");
      });

      if (statusInterval) clearInterval(statusInterval);
      setCatalogueProgress(100);
      setCatalogueStatusText("Complete!");

      // 3. Trigger Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'bulk' ? `cozy-bulk-catalogue.pdf` : `cozy-catalogue.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast(`${type === 'bulk' ? 'Bulk catalogue' : 'Catalogue'} generated and downloaded!`);
    } catch (error) {
      if (statusInterval) clearInterval(statusInterval);
      console.error("Catalogue Generation Error:", error);
      showToast(`Failed to generate ${type} catalogue`, "error");
    } finally {
      setCatalogueLoading(false);
      setCatalogueProgress(0);
      setCatalogueStatusText("");
      setCatalogueType(null);
    }
  }, [catalogueLoading]);

  // Load all products at first mount
  useEffect(() => {
    loadProducts("");
  }, []);

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        error,
        loadProducts,
        refreshProducts: () => loadProducts(""), // For admin panel usage
        catalogueLoading,
        catalogueProgress,
        catalogueStatusText,
        catalogueType,
        startCatalogueGeneration
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside ProductsProvider");
  return ctx;
}
