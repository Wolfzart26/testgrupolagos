import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Products from "./pages/Products.jsx";
import Cart from "./pages/Cart.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";


export default function App() {
  return (
    <>
      <header>
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white font-bold w-9 h-9 flex items-center justify-center rounded-lg text-lg">LV</div>
          <div className="text-xl font-extrabold">LiquiVerde</div>
        </div>

        <nav className="ml-auto">
          <NavLink to="/productos" className={({isActive})=> isActive? "active": ""}>Productos</NavLink>
          <NavLink to="/carro" className={({isActive})=> isActive? "active": ""}>Carro de compras</NavLink>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/productos" element={<Products />} />
            <Route path="/producto/:id" element={<ProductDetail />} /> {/* 👈 nueva */}
            <Route path="/carro" element={<Cart />} />
        </Routes>

      </div>
    </>
  );
}
