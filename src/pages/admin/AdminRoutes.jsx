import React from "react";
import { Routes, Route } from "react-router-dom";

// Standard Admin Layout
import AdminLayout from "./AdminLayout";

// Sync Page Imports (Bundled together in this Admin Shield)
import AdminDashboard from "./AdminDashboard";
import AdminProducts from "./AdminProducts";
import AdminBulkProducts from "./AdminBulkProducts";
import AdminEditProduct from "./AdminEditProduct";
import AdminOrders from "./AdminOrders";
import AdminUsers from "./AdminUsers";
import AdminOffers from "./AdminOffers";
import AdminDelivery from "./AdminDelivery";

export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="bulk-products" element={<AdminBulkProducts />} />
        <Route path="products/:id/edit" element={<AdminEditProduct />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="delivery" element={<AdminDelivery />} />
      </Route>
    </Routes>
  );
}
