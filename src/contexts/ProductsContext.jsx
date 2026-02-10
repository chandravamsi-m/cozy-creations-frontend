import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchFirestoreProducts } from "../hooks/useProductsFirestore";

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cache (in-memory)
  const [cache, setCache] = useState({
    all: null,
    categories: {}
  });

  const loadProducts = useCallback(
    async (category = "", silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError(null);

        // 1️⃣ If category exists in cache → return instantly
        // Skip cache if silent refresh is requested (usually by admin)
        if (!silent) {
          if (category && cache.categories[category]) {
            setProducts(cache.categories[category]);
            setLoading(false);
            return cache.categories[category];
          }

          if (!category && cache.all) {
            setProducts(cache.all);
            setLoading(false);
            return cache.all;
          }
        }

        // 2️⃣ Fetch from Firestore
        const result = await fetchFirestoreProducts(category);

        setProducts(result);

        // Update cache
        setCache((prev) => ({
          all: category === "" ? result : prev.all,
          categories: {
            ...prev.categories,
            ...(category && { [category]: result }),
          },
        }));

        return result;
      } catch (err) {
        console.error("Product Load Error:", err);
        setError("Failed to load products");
        setProducts([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [cache]
  );

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
        refreshProducts: () => loadProducts("") // For admin panel usage
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
