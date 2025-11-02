const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

/* =========================
 *  Productos / Categorías
 * ========================= */

export async function fetchCategories() {
  const r = await fetch(`${API}/categories`);
  if (!r.ok) throw new Error("Error al obtener categorías");
  return r.json(); // [{category, count}]
}

// acepta paginado, texto, categoría
export async function fetchProducts({ page = 1, pageSize = 12, q = "", category = "" } = {}) {
  const u = new URL(`${API}/products`);
  u.searchParams.set("page", page);
  u.searchParams.set("pageSize", pageSize);
  if (q) u.searchParams.set("q", q);
  if (category) u.searchParams.set("category", category);
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error("Error al obtener productos");
  return r.json(); // { items, total, page, pageSize }
}

export async function getProduct(id) {
  const r = await fetch(`${API}/products/${id}`);
  if (!r.ok) throw new Error("No se pudo obtener el producto");
  return r.json();
}

export async function getRecommendations(id, weights) {
  const w = weights || { price: 0.4, co2: 0.3, health: 0.2, social: 0.1 };
  const params = new URLSearchParams({
    w_price: w.price, w_co2: w.co2, w_health: w.health, w_social: w.social
  }).toString();
  const r = await fetch(`${API}/products/${id}/recommendations?${params}`);
  if (!r.ok) throw new Error("No se pudieron obtener recomendaciones");
  return r.json(); // { targetId, suggestions: [...] }
}

export async function fetchByIds(ids = []) {
  if (!ids.length) return [];
  const u = new URL(`${API}/products/by-ids`);
  u.searchParams.set("ids", ids.join(","));
  const r = await fetch(u.toString());
  if (!r.ok) throw new Error("Error al obtener detalles del carrito");
  return r.json();
}

/* =========================
 *  Carrito (localStorage)
 *  → SIEMPRE array: [{id, qty}]
 * ========================= */

const KEY = "cart"; // siempre array: [{ id, qty }]

export function readCart() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    // ✅ Caso correcto
    if (Array.isArray(parsed)) return parsed;

    // ✅ Migración automática: si es objeto tipo { "p1": 2, "p2": 1 }
    if (parsed && typeof parsed === "object") {
      const arr = Object.entries(parsed)
        .filter(([, qty]) => Number.isFinite(qty) && qty > 0)
        .map(([id, qty]) => ({ id, qty: Number(qty) }));
      localStorage.setItem(KEY, JSON.stringify(arr));
      return arr;
    }

    return [];
  } catch {
    return [];
  }
}

export function writeCart(arr) {
  try {
    // Normaliza por si llega algo incorrecto
    const safe = Array.isArray(arr)
      ? arr
          .map(x => ({ id: String(x.id), qty: Math.max(0, Number(x.qty) || 0) }))
          .filter(x => x.id && x.qty > 0)
      : [];
    localStorage.setItem(KEY, JSON.stringify(safe));
  } catch { /* ignore */ }
}

export function getCart() {
  return readCart();
}

export function setCart(arr) {
  writeCart(arr);
}

export function addToCart(id, qty = 1) {
  const c = readCart();
  const i = c.findIndex(x => x.id === id);
  const add = Math.max(1, Number(qty) || 1);
  if (i >= 0) c[i].qty += add;
  else c.push({ id, qty: add });
  writeCart(c);
  return c;
}

export function setQty(id, qty) {
  const c = readCart().filter(x => x.id !== id);
  const q = Math.max(0, Number(qty) || 0);
  if (q > 0) c.push({ id, qty: q });
  writeCart(c);
  return c;
}


export function clearCart() { writeCart([]); }

/* =========================
 *  Cart APIs (backend)
 * ========================= */

export async function lookupCart(items /* [{id, qty}] */) {
  const r = await fetch(`${API}/cart/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!r.ok) throw new Error("No se pudo obtener el detalle del carro.");
  return r.json(); // { items:[...], total:{...} }
}

export async function suggestCart(items, mode = "ambiente") {
  const r = await fetch(`${API}/cart/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, mode }),
  });
  if (!r.ok) throw new Error("No se pudieron obtener sugerencias del carro.");
  return r.json(); // { suggestions, currentTotals, suggestedTotals, weights, mode }
}


export async function optimizeCart(items = [], budget = 0, mode = "balanceado") {
  const r = await fetch(`${API}/cart/optimize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, budget: Number(budget)||0, mode })
  });
  if (!r.ok) throw new Error("No se pudo optimizar el carrito");
  return r.json(); // { optimizedItems, totals, mode, budget }
}
