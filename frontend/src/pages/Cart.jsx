// frontend/src/pages/Cart.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  readCart,
  writeCart,
  lookupCart,
  suggestCart,
  optimizeCart,
  setQty, // helper que usa readCart/writeCart internamente
} from "../api.js";

/** Toast simple */
function Toast({ open, message, kind = "success", onClose }) {
  if (!open) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg text-white ${
        kind === "success" ? "bg-emerald-600" : "bg-rose-600"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="font-semibold">{kind === "success" ? "✅" : "⚠️"}</span>
        <span className="text-sm">{message}</span>
        <button onClick={onClose} className="ml-2 font-bold">
          ×
        </button>
      </div>
    </div>
  );
}

export default function Cart() {
  // 🔐 Carrito SIEMPRE como ARREGLO [{id, qty}]
  const safeRead = () => {
    const v = readCart();
    return Array.isArray(v) ? v : [];
  };

  const [cartArr, setCartArr] = useState(safeRead()); // [{id,qty}]
  const itemsPayload = useMemo(
    () => (Array.isArray(cartArr) ? cartArr.map(({ id, qty }) => ({ id, qty })) : []),
    [cartArr]
  );

  const [cartDetail, setCartDetail] = useState({
    items: [],
    total: { price: 0, co2: 0, health: 0, social: 0 },
  });

  // Sugerencias por modo
  const [mode, setMode] = useState("ambiente"); // "ambiente" | "ahorro" | "balanceado"
  const [suggest, setSuggest] = useState({
    suggestions: {},
    currentTotals: null,
    suggestedTotals: null,
    weights: null,
  });

  const [loading, setLoading] = useState(false);
  const [loadingSug, setLoadingSug] = useState(false);

  // Optimización por presupuesto
  const [optBudget, setOptBudget] = useState(""); // input usuario
  const [optResult, setOptResult] = useState(null); // { optimizedItems, totals, mode, budget }

  const [toast, setToast] = useState({ open: false, message: "", kind: "success" });
  const show = (m, k = "success") => {
    setToast({ open: true, message: m, kind: k });
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 2200);
  };

  // Cargar detalle del carro
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await lookupCart(itemsPayload);
        setCartDetail(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [itemsPayload]);

  // Cargar sugerencias (ambiente/ahorro/balanceado)
  useEffect(() => {
    (async () => {
      setLoadingSug(true);
      try {
        const res = await suggestCart(itemsPayload, mode);
        setSuggest(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingSug(false);
      }
    })();
  }, [itemsPayload, mode]);

  // Acciones de carrito (trabajando SIEMPRE con arreglo)
  const removeItem = (id) => {
    const next = (Array.isArray(cartArr) ? cartArr : []).filter((x) => x.id !== id);
    writeCart(next);
    setCartArr(next);
  };

  const changeQty = (id, qty) => {
    const q = Math.max(0, parseInt(qty || "0", 10));
    let next = Array.isArray(cartArr) ? [...cartArr] : [];
    next = next.filter((x) => x.id !== id);
    if (q > 0) next.push({ id, qty: q });
    writeCart(next);
    setCartArr(next);
  };

  // Reemplazo: oldId -> newId (conservando qty)
  const replaceItem = (oldId, newId) => {
    const list = Array.isArray(cartArr) ? [...cartArr] : [];
    const found = list.find((x) => x.id === oldId);
    if (!found) return;

    // quita old
    let next = list.filter((x) => x.id !== oldId);
    // si ya existe el nuevo, suma cantidades
    const pos = next.findIndex((x) => x.id === newId);
    if (pos >= 0) next[pos] = { id: newId, qty: next[pos].qty + found.qty };
    else next.push({ id: newId, qty: found.qty });

    writeCart(next);
    setCartArr(next);
    show("Producto reemplazado en el carro.");
  };

  // Aplicar lista optimizada (reemplaza completamente el carro)
  const applyOptimizedList = () => {
    if (!optResult?.optimizedItems?.length) return;

    // Vacía carrito actual
    (cartDetail.items || []).forEach((p) => setQty(p.id, 0));
    // Aplica nuevos
    optResult.optimizedItems.forEach((p) => setQty(p.id, p.qty));

    // Releer del storage y actualizar estado
    const v = safeRead();
    setCartArr(v);
    show("Se aplicó la lista optimizada.");
  };

  const fmt = {
    money: (v) => `$${Number(v || 0).toLocaleString("es-CL")}`,
    co2: (v) => `${Number(v || 0).toFixed(2)} kg`,
  };

  const hasItems = (cartDetail.items || []).length > 0;

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna izquierda: Carro actual */}
      <div className="lg:col-span-2 card">
        <h2 className="text-xl font-bold mb-3">Tu carro de compras</h2>

        {loading && <div className="text-gray-600">Cargando carro…</div>}
        {!loading && !hasItems && <div className="text-gray-600">Tu carro está vacío.</div>}

        {!loading && hasItems && (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-2">Producto</th>
                  <th className="py-2 px-2">CO₂ (kg)</th>
                  <th className="py-2 px-2">Precio</th>
                  <th className="py-2 px-2">Cantidad</th>
                  <th className="py-2 pl-2 text-right">Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cartDetail.items.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 pr-2">
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.brand} · {p.category}
                      </div>
                    </td>
                    <td className="py-2 px-2">{p.co2_kg ?? "-"}</td>
                    <td className="py-2 px-2">{fmt.money(p.price)}</td>
                    <td className="py-2 px-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          (Array.isArray(cartArr)
                            ? cartArr.find((x) => x.id === p.id)?.qty
                            : 1) ?? 1
                        }
                        onChange={(e) => changeQty(p.id, e.target.value)}
                        className="w-20 border border-gray-300 rounded-md px-2 py-1 text-center"
                      />
                    </td>
                    <td className="py-2 pl-2 text-right">{fmt.money(p.subtotal)}</td>
                    <td className="py-2 pl-2 text-right">
                      <button
                        onClick={() => removeItem(p.id)}
                        className="text-rose-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}></td>
                  <td className="py-3 text-right font-semibold">Total</td>
                  <td className="py-3 pl-2 text-right font-bold">
                    {fmt.money(cartDetail.total.price)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3}></td>
                  <td className="py-1 text-right text-gray-600">CO₂ total</td>
                  <td className="py-1 pl-2 text-right text-gray-700">
                    {fmt.co2(cartDetail.total.co2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ===== Optimizar por presupuesto ===== */}
        <div className="mt-6 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="font-semibold">
              Optimizar lista en base a un presupuesto
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="100"
                placeholder="Presupuesto CLP"
                value={optBudget}
                onChange={(e) => setOptBudget(e.target.value)}
                className="w-44 border border-gray-300 rounded-md px-3 py-2 text-right"
              />
              <button
                onClick={async () => {
                  try {
                    if (!itemsPayload.length) {
                      show("Agrega productos al carro primero.", "error");
                      return;
                    }
                    const b = Number(optBudget) || 0;
                    if (b <= 0) {
                      show("Ingresa un presupuesto válido.", "error");
                      return;
                    }
                    const res = await optimizeCart(itemsPayload, b, mode); // usa el modo actual
                    setOptResult(res);
                  } catch (e) {
                    console.error(e);
                    show("No se pudo optimizar el carrito.", "error");
                  }
                }}
                className="px-4 py-2 rounded-md bg-primary text-white font-semibold hover:bg-cyan-500"
              >
                Optimizar
              </button>
            </div>
          </div>

          {/* Resultado optimizado */}
          {optResult && (
            <div className="mt-4">
              {optResult.optimizedItems.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No se pudo armar una lista dentro del presupuesto indicado.
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-700 mb-2">
                    Resultado ({optResult.mode}) — Presupuesto:{" "}
                    <span className="font-semibold">
                      $
                      {Number(optResult.budget || 0).toLocaleString(
                        "es-CL"
                      )}
                    </span>
                  </div>
                  <div className="w-full overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600 border-b">
                          <th className="py-2 pr-2">Producto</th>
                          <th className="py-2 px-2">CO₂ (kg)</th>
                          <th className="py-2 px-2">Precio</th>
                          <th className="py-2 px-2">Cantidad</th>
                          <th className="py-2 pl-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optResult.optimizedItems.map((p) => (
                          <tr key={p.id} className="border-b">
                            <td className="py-2 pr-2">
                              <div className="font-semibold">{p.name}</div>
                              <div className="text-xs text-gray-500">
                                {p.brand} · {p.category}
                              </div>
                            </td>
                            <td className="py-2 px-2">{p.co2_kg ?? "-"}</td>
                            <td className="py-2 px-2">
                              {fmt.money(p.price)}
                            </td>
                            <td className="py-2 px-2">{p.qty}</td>
                            <td className="py-2 pl-2 text-right">
                              {fmt.money((p.price || 0) * p.qty)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}></td>
                          <td className="py-3 text-right font-semibold">
                            Total
                          </td>
                          <td className="py-3 pl-2 text-right font-bold">
                            {fmt.money(optResult.totals?.price)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={3}></td>
                          <td className="py-1 text-right text-gray-600">
                            CO₂ total
                          </td>
                          <td className="py-1 pl-2 text-right text-gray-700">
                            {fmt.co2(optResult.totals?.co2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={applyOptimizedList}
                      className="px-4 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-500"
                    >
                      Usar lista optimizada
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha: Sugerencias (por producto) */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Sugerencias</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("ambiente")}
              className={`px-3 py-1 rounded-md text-sm border ${
                mode === "ambiente"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
              title="Prioriza menor CO₂"
            >
              Ambiente
            </button>
            <button
              onClick={() => setMode("ahorro")}
              className={`px-3 py-1 rounded-md text-sm border ${
                mode === "ahorro"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
              title="Prioriza menor precio"
            >
              Ahorro
            </button>
            <button
              onClick={() => setMode("balanceado")}
              className={`px-3 py-1 rounded-md text-sm border ${
                mode === "balanceado"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
              title="Balance entre criterios"
            >
              Balanceado
            </button>
          </div>
        </div>

        {loadingSug && <div className="text-gray-600">Calculando sugerencias…</div>}
        {!loadingSug && !hasItems && (
          <div className="text-gray-600">Agrega productos al carro para ver sugerencias.</div>
        )}

        {!loadingSug && hasItems && (
          <>
            {/* Totales comparados */}
            <div className="border border-gray-200 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm">
                <div className="text-gray-600">Total actual</div>
                <div className="font-semibold">
                  {fmt.money(suggest.currentTotals?.price || 0)}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <div className="text-gray-600">CO₂ actual</div>
                <div className="font-semibold">
                  {fmt.co2(suggest.currentTotals?.co2 || 0)}
                </div>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between text-sm">
                <div className="text-gray-600">Total sugerido ({mode})</div>
                <div className="font-semibold">
                  {fmt.money(suggest.suggestedTotals?.price || 0)}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <div className="text-gray-600">CO₂ sugerido</div>
                <div className="font-semibold">
                  {fmt.co2(suggest.suggestedTotals?.co2 || 0)}
                </div>
              </div>
            </div>

            {/* Lista de sugerencias por producto */}
            <div className="flex flex-col gap-3">
              {cartDetail.items.map((p) => {
                const alts = suggest.suggestions?.[p.id] || [];
                return (
                  <div key={p.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-2">
                      Para{" "}
                      <span className="font-semibold text-gray-900">
                        {p.name}
                      </span>
                      :
                    </div>
                    {alts.length === 0 && (
                      <div className="text-xs text-gray-500">
                        No hay alternativas mejores bajo el modo seleccionado.
                      </div>
                    )}
                    {alts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start justify-between gap-3 py-2"
                      >
                        <div>
                          <div className="font-semibold text-sm">{a.name}</div>
                          <div className="text-xs text-gray-500">
                            {a.brand} · {a.category}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            CO₂: {a.co2_kg ?? "-"} kg · Salud:{" "}
                            {a.health_score ?? "-"} · Social:{" "}
                            {a.social_score ?? "-"} · Score:{" "}
                            {a.sustainability_score}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {fmt.money(a.price)}
                          </div>
                          <button
                            onClick={() => replaceItem(p.id, a.id)}
                            className="mt-2 px-3 py-1 rounded-md bg-primary text-white text-xs hover:bg-cyan-500"
                          >
                            Reemplazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        kind={toast.kind}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
