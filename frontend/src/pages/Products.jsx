import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addToCart, fetchProducts, fetchCategories } from "../api.js";

/** Toast simple */
function Toast({ open, kind = "success", message = "", onClose }) {
  if (!open) return null;
  return (
    <div
      role="alert"
      className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg text-white
        ${kind === "success" ? "bg-emerald-600" : "bg-rose-600"}`}
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold">
          {kind === "success" ? "✅" : "⚠️"}
        </span>
        <span className="text-sm">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-white/90 hover:text-white font-bold"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}

const CatChip = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm border transition
      ${active ? "bg-primary text-white border-primary" : "bg-white text-gray-700 border-gray-300 hover:border-primary"}`}
    title={typeof count === "number" ? `${count} productos` : undefined}
  >
    {label}{typeof count === "number" ? ` (${count})` : ""}
  </button>
);

export default function Products() {
  const navigate = useNavigate();

  // 🔎 buscador (debounce 2s)
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  // categorías
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);

  // paginación y data
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize });
  const [loading, setLoading] = useState(false);

  // cantidades UI
  const [quantities, setQuantities] = useState({}); // id -> qty

  // 🕒 Debounce 2s
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setQ(searchInput.trim());
    }, 2000);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Categorías
  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchCategories();
        setCategories(rows);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Carga productos
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetchProducts({ page, pageSize, q, category });
        setData(res);
        const nextQ = { ...quantities };
        for (const p of res.items) {
          if (!nextQ[p.id]) nextQ[p.id] = 1;
        }
        setQuantities(nextQ);
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, category, pageSize]);

  const totalPages = useMemo(
    () => Math.max(Math.ceil((data.total || 0) / (data.pageSize || 1)), 1),
    [data.total, data.pageSize]
  );

  // Mapa rápido de productos de la página
  const productById = useMemo(
    () => Object.fromEntries((data.items || []).map(p => [p.id, p])),
    [data.items]
  );

  // 🔔 toasts
  const [toast, setToast] = useState({ open: false, kind: "success", message: "" });
  const showToast = (kind, message) => {
    setToast({ open: true, kind, message });
    setTimeout(() => setToast(t => ({ ...t, open: false })), 2500);
  };

  const handleAdd = (id) => {
    const qtyNum = parseInt(quantities[id], 10);
    const prod = productById[id];
    if (!Number.isFinite(qtyNum) || qtyNum < 1) {
      showToast("error", `No se pudo agregar ${prod?.name || "el producto"} al carro todavía.`);
      return;
    }
    addToCart(id, qtyNum);
    setQuantities(s => ({ ...s, [id]: 1 }));
    showToast("success", `${prod?.name || "Producto"} agregado al carro de compras.`);
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Productos</h2>

      {/* Buscador + Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <input
          placeholder="Buscar por nombre, marca o categoría… (espera 2s)"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="w-full sm:w-1/2 border border-gray-300 rounded-lg px-3 py-2"
        />
        <div className="text-sm text-gray-500 sm:text-right">
          Página {data.page} de {totalPages} · {data.total} resultados
        </div>
      </div>

      {/* Categorías (chips) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <CatChip
          label="Todas"
          active={!category}
          onClick={() => { setCategory(""); setPage(1); setSearchInput(""); setQ(""); }}
        />
        {categories.map(c => (
          <CatChip
            key={c.category}
            label={c.category}
            count={c.count}
            active={category === c.category}
            onClick={() => { setCategory(c.category); setPage(1); setSearchInput(""); setQ(""); }}
          />
        ))}
      </div>

      {/* Grid */}
      {loading && <div className="text-center py-8 text-gray-600">Cargando productos…</div>}
      {!loading && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map(p => (
            <div key={p.id} className="card flex flex-col justify-between hover:shadow-md transition-shadow">
              <div onClick={() => navigate(`/producto/${p.id}`)} className="cursor-pointer">
                <div className="font-semibold text-gray-900 mb-1 hover:underline">{p.name}</div>
                <div className="text-sm text-gray-500 mb-1">{p.brand} · {p.category}</div>
                <div className="text-xs text-gray-400 mb-2">
                  CO₂: {p.co2_kg ?? "-"} kg · Salud: {p.health_score ?? "-"} · Social: {p.social_score ?? "-"}
                </div>
                <div className="text-lg font-bold text-primary mb-2">${p.price}</div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number" min="1" step="1"
                  value={quantities[p.id] ?? 1}
                  onChange={e => {
                    const val = Math.max(0, parseInt(e.target.value || "0", 10));
                    setQuantities(s => ({ ...s, [p.id]: val }));
                  }}
                  className="w-16 border border-gray-300 rounded-md px-2 py-1 text-center"
                />
                <button
                  onClick={() => handleAdd(p.id)}
                  className="flex-1 bg-primary hover:bg-cyan-500 text-white font-semibold rounded-md py-2 transition"
                >
                  Agregar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      <div className="flex justify-center items-center gap-3 mt-6">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          ‹ Anterior
        </button>
        <span className="text-sm text-gray-700">Página {page} de {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Siguiente ›
        </button>
      </div>

      <Toast open={toast.open} kind={toast.kind} message={toast.message} onClose={() => setToast(t => ({ ...t, open: false }))} />
    </div>
  );
}

